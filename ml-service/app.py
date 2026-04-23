from flask import Flask, jsonify, request
import os

import joblib
import numpy as np
import pandas as pd

app = Flask("BidGenie ML Service")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PRICE_MODEL_PATH = os.path.join(BASE_DIR, "price_model.pkl")
FRAUD_MODEL_PATH = os.path.join(BASE_DIR, "fraud_model.pkl")
CATEGORY_ENCODER_PATH = os.path.join(BASE_DIR, "category_encoder.pkl")

NUMERIC_FEATURE_ORDER = [
    "starting_price",
    "total_bids",
    "unique_bidders",
    "duration",
    "bid_velocity",
    "price_growth_rate",
    "current_price_ratio",
    "velocity_pressure",
]


PRICE_MODEL = None
FRAUD_MODEL = None
CATEGORY_ENCODER = None
LOAD_ERROR = None


def derive_category(product_name: str) -> str:
    text = str(product_name or "").strip().lower()

    if any(keyword in text for keyword in ["iphone", "samsung", "laptop", "console"]):
        return "electronics"
    if any(keyword in text for keyword in ["gold", "silver"]):
        return "precious"
    if any(keyword in text for keyword in ["art", "painting"]):
        return "collectibles"
    return "other"


def load_artifacts() -> None:
    global PRICE_MODEL, FRAUD_MODEL, CATEGORY_ENCODER, LOAD_ERROR

    missing = [
        path
        for path in [PRICE_MODEL_PATH, FRAUD_MODEL_PATH, CATEGORY_ENCODER_PATH]
        if not os.path.exists(path)
    ]
    if missing:
        LOAD_ERROR = "Missing model artifacts: " + ", ".join(os.path.basename(p) for p in missing)
        return

    try:
        PRICE_MODEL = joblib.load(PRICE_MODEL_PATH)
        FRAUD_MODEL = joblib.load(FRAUD_MODEL_PATH)
        CATEGORY_ENCODER = joblib.load(CATEGORY_ENCODER_PATH)
    except Exception as exc:
        LOAD_ERROR = f"Failed to load model artifacts: {exc}"


def _pick(payload: dict, keys):
    for key in keys:
        value = payload.get(key)
        if value is not None and value != "":
            return value
    return None


def _to_float(value, field_name: str):
    try:
        return float(value)
    except (TypeError, ValueError):
        raise ValueError(f"Invalid numeric value for '{field_name}'") from None


def _extract_feature_values(payload: dict, strict: bool = False):
    current_raw = _pick(payload, ["current_price", "currentPrice"])
    starting_raw = _pick(payload, ["starting_price", "startingPrice"])

    if current_raw is None and strict:
        raise ValueError("Missing required field: current_price")

    current_price = _to_float(current_raw, "current_price") if current_raw is not None else 0.0

    if starting_raw is None:
        bid_increment_raw = _pick(payload, ["bid_increment", "bidIncrement"])
        if bid_increment_raw is not None:
            bid_increment = _to_float(bid_increment_raw, "bid_increment")
            starting_price = max(0.0, current_price - bid_increment)
        elif strict:
            raise ValueError("Missing required field: starting_price")
        else:
            starting_price = current_price
    else:
        starting_price = _to_float(starting_raw, "starting_price")

    duration_raw = _pick(payload, ["duration"])
    if duration_raw is None:
        time_remaining_ms_raw = _pick(payload, ["timeRemainingMs", "time_remaining_ms"])
        time_remaining_raw = _pick(payload, ["time_remaining", "timeRemaining"])
        if time_remaining_ms_raw is not None:
            duration = _to_float(time_remaining_ms_raw, "timeRemainingMs") / 1000.0
        elif time_remaining_raw is not None:
            duration = _to_float(time_remaining_raw, "time_remaining")
        else:
            duration = 1.0
    else:
        duration = _to_float(duration_raw, "duration")

    duration = max(duration, 1.0)

    total_bids_raw = _pick(payload, ["total_bids", "totalBids", "bidCount", "bid_count"])
    unique_bidders_raw = _pick(payload, ["unique_bidders", "uniqueBidders"])
    bid_velocity_raw = _pick(payload, ["bid_velocity", "bidVelocity"])

    if total_bids_raw is None and bid_velocity_raw is not None:
        total_bids = _to_float(bid_velocity_raw, "bid_velocity") * duration
    elif total_bids_raw is None:
        total_bids = 1.0
    else:
        total_bids = _to_float(total_bids_raw, "total_bids")

    if unique_bidders_raw is None:
        unique_bidders = max(1.0, min(total_bids, 5.0))
    else:
        unique_bidders = _to_float(unique_bidders_raw, "unique_bidders")

    if bid_velocity_raw is None:
        bid_velocity = total_bids / max(duration, 1.0)
    else:
        bid_velocity = _to_float(bid_velocity_raw, "bid_velocity")

    growth_raw = _pick(payload, ["price_growth_rate", "priceGrowthRate"])
    if growth_raw is None:
        price_growth_rate = (current_price - starting_price) / max(starting_price, 1.0)
    else:
        price_growth_rate = _to_float(growth_raw, "price_growth_rate")

    current_price_ratio = current_price / max(starting_price, 1.0)
    velocity_pressure = bid_velocity * price_growth_rate

    product_name = _pick(payload, ["product_name", "productName", "Product_Name"])

    return {
        "starting_price": starting_price,
        "current_price": current_price,
        "total_bids": total_bids,
        "unique_bidders": unique_bidders,
        "duration": duration,
        "bid_velocity": bid_velocity,
        "price_growth_rate": price_growth_rate,
        "current_price_ratio": current_price_ratio,
        "velocity_pressure": velocity_pressure,
        "product_name": str(product_name or ""),
    }


def _build_feature_frame(payload: dict, model, strict: bool = False):
    values = _extract_feature_values(payload, strict=strict)

    category = derive_category(values["product_name"])
    category_input = pd.DataFrame({"category": [category]})
    encoded = CATEGORY_ENCODER.transform(category_input)
    category_columns = [f"category_{label}" for label in CATEGORY_ENCODER.categories_[0]]

    feature_map = {
        key: float(values[key]) for key in NUMERIC_FEATURE_ORDER
    }

    for idx, column in enumerate(category_columns):
        feature_map[column] = float(encoded[0][idx])

    model_columns = list(getattr(model, "feature_names_in_", feature_map.keys()))
    ordered = {column: float(feature_map.get(column, 0.0)) for column in model_columns}

    frame = pd.DataFrame([ordered], columns=model_columns)
    return frame, values


def _fraud_probability(features: pd.DataFrame) -> float:
    probabilities = FRAUD_MODEL.predict_proba(features)
    if probabilities.shape[1] == 1:
        # Classifier can be trained on a single class in edge-case datasets.
        single_class = int(FRAUD_MODEL.classes_[0])
        return float(1.0 if single_class == 1 else 0.0)
    return float(probabilities[0][1])


def _model_error_response():
    return jsonify({"success": False, "error": LOAD_ERROR or "Model artifacts not loaded"}), 500


load_artifacts()


@app.route("/")
def home():
    return jsonify({"message": "BidGenie ML Service Running"})


@app.route("/predict", methods=["POST"])
def predict():
    if LOAD_ERROR or PRICE_MODEL is None or FRAUD_MODEL is None or CATEGORY_ENCODER is None:
        return _model_error_response()

    payload = request.json or {}

    try:
        features, values = _build_feature_frame(payload, PRICE_MODEL, strict=True)
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400

    raw_predicted = float(PRICE_MODEL.predict(features)[0])

    try:
        fraud_features, _ = _build_feature_frame(payload, FRAUD_MODEL, strict=False)
        fraud_probability = _fraud_probability(fraud_features)
    except ValueError:
        fraud_probability = 0.0

    current_price = float(values["current_price"])
    
    # Logically, the final settled price mathematically cannot be lower than the current price.
    # If raw prediction is lower, the item is overvalued, but we must bound the projection.
    predicted_price = max(raw_predicted, current_price * 1.02)
    
    confidence_score = 1.0 - abs(predicted_price - current_price) / max(predicted_price, 1.0)
    confidence_score = float(np.clip(confidence_score, 0.4, 0.95))

    winning_probability_ratio = float(
        np.clip(current_price / max(predicted_price, 1.0), 0.0, 1.0)
    )

    return jsonify(
        {
            "predicted_final_price": predicted_price,
            "confidence_score": confidence_score,
            "fraud_probability": float(fraud_probability),
            "winning_probability_ratio": winning_probability_ratio,
            # Backward-compatible aliases
            "predicted_price": predicted_price,
            "winning_probability": winning_probability_ratio,
            "confidence": confidence_score,
            "suggestedBid": predicted_price,
        }
    )


@app.route("/predict-fraud", methods=["POST"])
def predict_fraud():
    if LOAD_ERROR or FRAUD_MODEL is None or CATEGORY_ENCODER is None:
        return _model_error_response()

    payload = request.json or {}

    try:
        features, _ = _build_feature_frame(payload, FRAUD_MODEL, strict=False)
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400

    probability = _fraud_probability(features)
    return jsonify({"fraud_probability": float(probability)})


@app.route("/predict-autobid", methods=["POST"])
def predict_autobid():
    if LOAD_ERROR or PRICE_MODEL is None or CATEGORY_ENCODER is None:
        return _model_error_response()

    payload = request.json or {}

    try:
        features, values = _build_feature_frame(payload, PRICE_MODEL, strict=False)
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400

    raw_predicted = float(PRICE_MODEL.predict(features)[0])
    current_price = float(values["current_price"])
    
    # Ensure logical price advancement bounds for autobidding
    predicted_price = max(raw_predicted, current_price * 1.02)
    safe_bid = float(predicted_price * 0.97)
    safe_bid = max(safe_bid, current_price + 50) # Maintain minimum viable increment

    budget_raw = _pick(payload, ["budget", "maxBudget"])
    if budget_raw is not None:
        try:
            budget = _to_float(budget_raw, "budget")
            safe_bid = min(safe_bid, budget)
        except ValueError:
            pass

    confidence_score = 1.0 - abs(predicted_price - current_price) / max(predicted_price, 1.0)
    confidence_score = float(np.clip(confidence_score, 0.4, 0.95))

    return jsonify(
        {
            "safe_bid": safe_bid,
            "recommended_bid": safe_bid,
            "confidence": confidence_score,
        }
    )


if __name__ == "__main__":
    import socket

    probe = socket.socket()
    try:
        probe.bind(("0.0.0.0", 5001))
    except OSError:
        print("ML Service already running on port 5001")
        raise SystemExit(0)
    finally:
        probe.close()

    app.run(host="0.0.0.0", port=5001)
