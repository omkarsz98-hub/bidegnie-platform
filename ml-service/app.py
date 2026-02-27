from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
import os
import joblib
import random

from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split

app = Flask("BidGenie ML Service")

DATA_PATH = "src/data/auction_dataset.csv"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRAUD_MODEL_PATH = os.path.join(BASE_DIR, "fraud_model.pkl")
AUTOBID_MODEL_PATH = os.path.join(BASE_DIR, "autobid_model.pkl")

category_map = {
    "Electronics": 0,
    "Home Appliances": 1,
    "Furniture": 2,
    "Musical Instruments": 3,
    "Entertainment Systems": 4,
    "Accessories & Tools": 5
}

product_map = {
    "Laptop": 0,
    "Tablet": 1,
    "Used Smartphone": 2,
    "Digital Camera": 3,
    "LED TV": 4,
    "Refrigerator": 5,
    "Washing Machine": 6,
    "Microwave Oven": 7,
    "Air Conditioner": 8,
    "Office Chair": 9,
    "Electric Guitar": 10,
    "Home Theater System": 11,
    "Scooter Helmet": 12,
    "Power Tools": 13
}


def _resolve_dataset_path():
    candidates = [
        os.path.join(BASE_DIR, DATA_PATH),
        os.path.join(BASE_DIR, "..", "backend", "src", "data", "auction_dataset.csv"),
        os.path.join(os.getcwd(), DATA_PATH),
    ]

    for path in candidates:
        normalized = os.path.abspath(path)
        if os.path.exists(normalized):
            return normalized

    raise FileNotFoundError("auction_dataset.csv not found in expected paths")


def _prepare_dataset(df):
    if "current_price" not in df.columns:
        if "Bid_Amount" in df.columns:
            df["current_price"] = pd.to_numeric(df["Bid_Amount"], errors="coerce")
        elif "Start_Price" in df.columns:
            df["current_price"] = pd.to_numeric(df["Start_Price"], errors="coerce")
        else:
            df["current_price"] = 0

    if "bid_increment" not in df.columns:
        start_price = pd.to_numeric(df.get("Start_Price", 0), errors="coerce").fillna(0)
        current_price = pd.to_numeric(df.get("current_price", 0), errors="coerce").fillna(0)
        df["bid_increment"] = (current_price - start_price).clip(lower=0)

    if "bid_velocity" not in df.columns:
        if "Lot" in df.columns:
            df["bid_velocity"] = pd.to_numeric(df["Lot"], errors="coerce").fillna(0)
        else:
            df["bid_velocity"] = 0

    if "time_remaining" not in df.columns:
        if "Auction_End" in df.columns and "Bid_Time" in df.columns:
            end_time = pd.to_datetime(df["Auction_End"], errors="coerce")
            bid_time = pd.to_datetime(df["Bid_Time"], errors="coerce")
            seconds = (end_time - bid_time).dt.total_seconds()
            df["time_remaining"] = seconds.fillna(0).clip(lower=0)
        else:
            df["time_remaining"] = 0

    if "category" in df.columns:
        df["category_encoded"] = df["category"].map(category_map).fillna(-1)
    else:
        df["category_encoded"] = 0

    if "productName" in df.columns:
        df["product_encoded"] = df["productName"].map(product_map).fillna(-1)
    else:
        df["product_encoded"] = 0

    numeric_cols = [
        "current_price",
        "bid_increment",
        "bid_velocity",
        "time_remaining",
        "category_encoded",
        "product_encoded"
    ]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    return df


def train_and_save_models():
    dataset_path = _resolve_dataset_path()
    df = pd.read_csv(dataset_path)
    df = _prepare_dataset(df)

    # Fraud label generation (temporary heuristic)
    df["fraud_label"] = np.where(
        (df["bid_increment"] > df["bid_increment"].mean() * 2)
        & (df["bid_velocity"] > df["bid_velocity"].mean()),
        1,
        0,
    )

    fraud_features = [
        "current_price",
        "bid_increment",
        "bid_velocity",
        "time_remaining",
        "category_encoded",
        "product_encoded"
    ]
    X_fraud = df[fraud_features]
    y_fraud = df["fraud_label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X_fraud, y_fraud, test_size=0.2, random_state=42
    )

    fraud_model = RandomForestClassifier(n_estimators=100, random_state=42)
    fraud_model.fit(X_train, y_train)
    joblib.dump(fraud_model, FRAUD_MODEL_PATH)

    # Autobid regression target
    df["next_bid"] = df["current_price"] + df["bid_increment"]

    autobid_features = [
        "current_price",
        "time_remaining",
        "bid_velocity",
        "category_encoded",
        "product_encoded"
    ]
    X_auto = df[autobid_features]
    y_auto = df["next_bid"]

    X_train_a, X_test_a, y_train_a, y_test_a = train_test_split(
        X_auto, y_auto, test_size=0.2, random_state=42
    )

    autobid_model = RandomForestRegressor(n_estimators=100, random_state=42)
    autobid_model.fit(X_train_a, y_train_a)
    joblib.dump(autobid_model, AUTOBID_MODEL_PATH)


def load_or_train_models():
    if not os.path.exists(FRAUD_MODEL_PATH) or not os.path.exists(AUTOBID_MODEL_PATH):
        train_and_save_models()

    fraud_model = joblib.load(FRAUD_MODEL_PATH)
    autobid_model = joblib.load(AUTOBID_MODEL_PATH)

    # Re-train when persisted models are from an older feature layout.
    if getattr(fraud_model, "n_features_in_", None) != 6 or getattr(autobid_model, "n_features_in_", None) != 5:
        train_and_save_models()
        fraud_model = joblib.load(FRAUD_MODEL_PATH)
        autobid_model = joblib.load(AUTOBID_MODEL_PATH)

    return fraud_model, autobid_model


fraud_model, autobid_model = load_or_train_models()


@app.route("/")
def home():
    return jsonify({"message": "BidGenie ML Service Running"})


@app.route("/predict", methods=["POST"])
def predict():
    data = request.json or {}

    # Simple simulated ML logic
    current_price = float(data.get("current_price", 0))
    predicted_price = current_price * random.uniform(1.05, 1.20)
    winning_probability = random.uniform(0.5, 0.9)

    return jsonify({
        "predicted_price": round(predicted_price, 2),
        "winning_probability": round(winning_probability, 2)
    })


@app.route("/predict-fraud", methods=["POST"])
def predict_fraud():
    data = request.json or {}
    category = data.get("category")
    category_encoded = category_map.get(category, -1)
    product = data.get("productName")
    product_encoded = product_map.get(product, -1)

    features = pd.DataFrame([{
        "current_price": float(data.get("current_price", 0)),
        "bid_increment": float(data.get("bid_increment", 0)),
        "bid_velocity": float(data.get("bid_velocity", 0)),
        "time_remaining": float(data.get("time_remaining", 0)),
        "category_encoded": float(category_encoded),
        "product_encoded": float(product_encoded)
    }])

    probability = fraud_model.predict_proba(features)[0][1]

    return jsonify({
        "fraud_probability": float(probability)
    })


@app.route("/predict-autobid", methods=["POST"])
def predict_autobid():
    data = request.json or {}
    category = data.get("category")
    category_encoded = category_map.get(category, -1)
    product = data.get("productName")
    product_encoded = product_map.get(product, -1)

    features = pd.DataFrame([{
        "current_price": float(data.get("current_price", 0)),
        "time_remaining": float(data.get("time_remaining", 0)),
        "bid_velocity": float(data.get("bid_velocity", 0)),
        "category_encoded": float(category_encoded),
        "product_encoded": float(product_encoded)
    }])

    predicted_bid = autobid_model.predict(features)[0]

    recommended = min(predicted_bid, data.get("budget", predicted_bid))

    return jsonify({
        "recommended_bid": float(recommended),
        "confidence": 0.9
    })


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
