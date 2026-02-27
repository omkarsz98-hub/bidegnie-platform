from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import accuracy_score, r2_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder

BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "auction_dataset.csv"
PRICE_MODEL_PATH = BASE_DIR / "price_model.pkl"
FRAUD_MODEL_PATH = BASE_DIR / "fraud_model.pkl"
ENCODER_PATH = BASE_DIR / "category_encoder.pkl"

REQUIRED_COLUMNS = [
    "Auction_ID",
    "Product_Name",
    "Bidder_ID",
    "Start_Price",
    "Bid_Amount",
    "Final_Price",
    "Auction_Start",
    "Auction_End",
    "Fraudulent",
]

NUMERIC_FEATURES = [
    "starting_price",
    "total_bids",
    "unique_bidders",
    "duration",
    "bid_velocity",
    "price_growth_rate",
    "current_price_ratio",
    "velocity_pressure",
]


def derive_category(product_name: str) -> str:
    text = str(product_name or "").strip().lower()

    if any(keyword in text for keyword in ["iphone", "samsung", "laptop", "console"]):
        return "electronics"
    if any(keyword in text for keyword in ["gold", "silver"]):
        return "precious"
    if any(keyword in text for keyword in ["art", "painting"]):
        return "collectibles"
    return "other"


def _build_encoder() -> OneHotEncoder:
    try:
        return OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    except TypeError:
        return OneHotEncoder(handle_unknown="ignore", sparse=False)


def validate_dataset(df: pd.DataFrame) -> None:
    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing:
        raise ValueError(
            "Dataset is missing required columns: " + ", ".join(missing)
        )


def normalize_fraud_label(series: pd.Series) -> pd.Series:
    lowered = series.astype(str).str.strip().str.lower()
    mapped = lowered.map(
        {
            "1": 1,
            "true": 1,
            "yes": 1,
            "y": 1,
            "0": 0,
            "false": 0,
            "no": 0,
            "n": 0,
        }
    )
    numeric = pd.to_numeric(series, errors="coerce")
    return mapped.fillna(numeric).fillna(0).clip(lower=0, upper=1).astype(int)


def build_auction_level_frame(df: pd.DataFrame) -> pd.DataFrame:
    working = df.copy()

    working["Auction_Start"] = pd.to_datetime(working["Auction_Start"], errors="coerce")
    working["Auction_End"] = pd.to_datetime(working["Auction_End"], errors="coerce")

    if working["Auction_Start"].isna().any() or working["Auction_End"].isna().any():
        raise ValueError("Invalid Auction_Start or Auction_End datetime values found in dataset")

    working["Start_Price"] = pd.to_numeric(working["Start_Price"], errors="coerce")
    working["Final_Price"] = pd.to_numeric(working["Final_Price"], errors="coerce")
    working["Fraudulent"] = normalize_fraud_label(working["Fraudulent"])

    if working[["Start_Price", "Final_Price"]].isna().any().any():
        raise ValueError("Start_Price or Final_Price contains non-numeric values")

    aggregated = (
        working.sort_values("Auction_Start")
        .groupby("Auction_ID", as_index=False)
        .agg(
            starting_price=("Start_Price", "first"),
            final_price=("Final_Price", "max"),
            total_bids=("Auction_ID", "count"),
            unique_bidders=("Bidder_ID", "nunique"),
            auction_start=("Auction_Start", "first"),
            auction_end=("Auction_End", "first"),
            product_name=("Product_Name", "first"),
            fraud=("Fraudulent", "max"),
        )
    )

    aggregated["duration"] = (
        aggregated["auction_end"] - aggregated["auction_start"]
    ).dt.total_seconds()
    aggregated["duration"] = pd.to_numeric(aggregated["duration"], errors="coerce").fillna(1.0)
    aggregated["duration"] = aggregated["duration"].clip(lower=1.0)

    aggregated["bid_velocity"] = aggregated["total_bids"] / aggregated["duration"].clip(lower=1.0)
    aggregated["price_growth_rate"] = (
        aggregated["final_price"] - aggregated["starting_price"]
    ) / aggregated["starting_price"].clip(lower=1.0)
    aggregated["current_price_ratio"] = (
        aggregated["final_price"] / aggregated["starting_price"].clip(lower=1.0)
    )
    aggregated["velocity_pressure"] = (
        aggregated["bid_velocity"] * aggregated["price_growth_rate"]
    )
    aggregated["category"] = aggregated["product_name"].apply(derive_category)
    aggregated["fraud"] = pd.to_numeric(aggregated["fraud"], errors="coerce").fillna(0).clip(0, 1).astype(int)

    return aggregated


def build_features_and_targets(auction_df: pd.DataFrame):
    encoder = _build_encoder()
    category_encoded = encoder.fit_transform(auction_df[["category"]])
    category_columns = [f"category_{category}" for category in encoder.categories_[0]]

    category_df = pd.DataFrame(
        category_encoded,
        columns=category_columns,
        index=auction_df.index,
    )

    numeric_df = auction_df[NUMERIC_FEATURES].astype(float)
    features = pd.concat([numeric_df, category_df], axis=1)

    target_price = auction_df["final_price"].astype(float)
    target_fraud = auction_df["fraud"].astype(int)

    return features, target_price, target_fraud, encoder


def train_and_save() -> None:
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at: {DATASET_PATH}")

    df = pd.read_csv(DATASET_PATH)
    validate_dataset(df)

    auction_df = build_auction_level_frame(df)
    features, target_price, target_fraud, encoder = build_features_and_targets(auction_df)

    X_train_p, X_test_p, y_train_p, y_test_p = train_test_split(
        features,
        target_price,
        test_size=0.2,
        random_state=42,
    )

    price_model = RandomForestRegressor(
        n_estimators=200,
        max_depth=12,
        min_samples_split=4,
        random_state=42,
    )
    price_model.fit(X_train_p, y_train_p)
    price_predictions = price_model.predict(X_test_p)
    r2 = r2_score(y_test_p, price_predictions)

    stratify_target = target_fraud if target_fraud.nunique() > 1 else None
    X_train_f, X_test_f, y_train_f, y_test_f = train_test_split(
        features,
        target_fraud,
        test_size=0.2,
        random_state=42,
        stratify=stratify_target,
    )

    fraud_model = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_split=4,
        random_state=42,
    )
    fraud_model.fit(X_train_f, y_train_f)
    fraud_predictions = fraud_model.predict(X_test_f)
    accuracy = accuracy_score(y_test_f, fraud_predictions)

    joblib.dump(price_model, PRICE_MODEL_PATH)
    joblib.dump(fraud_model, FRAUD_MODEL_PATH)
    joblib.dump(encoder, ENCODER_PATH)

    print(f"Price model R2 score: {r2:.4f}")
    print(f"Fraud model accuracy: {accuracy:.4f}")
    print(f"Saved: {PRICE_MODEL_PATH.name}, {FRAUD_MODEL_PATH.name}, {ENCODER_PATH.name}")


if __name__ == "__main__":
    train_and_save()
