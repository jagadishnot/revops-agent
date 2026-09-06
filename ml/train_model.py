import os
import json
import joblib
import numpy as np
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report,
)


# ============================================================
# CONFIG
# ============================================================

DATABASE_URL = os.getenv("DIRECT_URL")

if not DATABASE_URL:
    raise ValueError(
        "DIRECT_URL environment variable is not set."
    )


MODEL_DIR = "ml/model"

os.makedirs(MODEL_DIR, exist_ok=True)


# ============================================================
# LOAD DATA
# ============================================================

print("\n========================================")
print(" REVIVEAI ML TRAINING")
print("========================================\n")

print("Loading transaction data from Supabase...")


import psycopg2


connection = psycopg2.connect(DATABASE_URL)

query = """
SELECT
    t.id,
    t.amount,
    t.currency,
    t.status,
    t."failureReason" AS failure_reason,
    t."paymentMethod" AS payment_method,
    t."retryCount" AS retry_count,
    t."checkoutDuration" AS checkout_duration,
    t.abandoned,
    t."riskLevel" AS risk_level,

    c."lifetimeValue" AS lifetime_value,
    c."totalTransactions" AS total_transactions,
    c."successfulPayments" AS successful_payments,
    c."failedPayments" AS failed_payments,
    c."abandonedCheckouts" AS abandoned_checkouts,
    c."preferredMethod" AS preferred_method,
    c."customerSegment" AS customer_segment

FROM "Transaction" t

JOIN "Customer" c
    ON t."customerId" = c.id

WHERE t.status IN ('FAILED', 'ABANDONED', 'SUCCESS')
"""


df = pd.read_sql(query, connection)

connection.close()


print(f"Loaded {len(df):,} transactions.")


# ============================================================
# BASIC VALIDATION
# ============================================================

if len(df) < 100:
    raise ValueError(
        "Not enough transaction data for ML training."
    )


print("\nTransaction distribution:")

print(df["status"].value_counts())


# ============================================================
# CREATE TARGET
# ============================================================
#
# Target:
#
# 1 = payment eventually succeeded
# 0 = payment failed / abandoned
#
# This gives the model a real learning target from
# the synthetic transaction history.
#
# ============================================================

df["target"] = (
    df["status"] == "SUCCESS"
).astype(int)


print("\nTarget distribution:")

print(df["target"].value_counts())


# ============================================================
# FEATURE ENGINEERING
# ============================================================

df["failure_history_ratio"] = (
    df["failed_payments"]
    /
    (df["total_transactions"] + 1)
)

df["success_history_ratio"] = (
    df["successful_payments"]
    /
    (df["total_transactions"] + 1)
)

df["abandonment_history_ratio"] = (
    df["abandoned_checkouts"]
    /
    (df["total_transactions"] + 1)
)

df["high_value_customer"] = (
    df["lifetime_value"] >= 50000
).astype(int)

df["high_amount"] = (
    df["amount"] >= 5000
).astype(int)

df["retry_pressure"] = (
    df["retry_count"] >= 2
).astype(int)


# ============================================================
# SELECT FEATURES
# ============================================================

numeric_features = [
    "amount",
    "retry_count",
    "checkout_duration",
    "lifetime_value",
    "total_transactions",
    "successful_payments",
    "failed_payments",
    "abandoned_checkouts",
    "failure_history_ratio",
    "success_history_ratio",
    "abandonment_history_ratio",
    "high_value_customer",
    "high_amount",
    "retry_pressure",
]


categorical_features = [
    "currency",
    "failure_reason",
    "payment_method",
    "risk_level",
    "preferred_method",
    "customer_segment",
]


features = numeric_features + categorical_features


X = df[features]

y = df["target"]


# ============================================================
# TRAIN / TEST SPLIT
# ============================================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y,
)


print("\nTraining samples:", len(X_train))
print("Testing samples :", len(X_test))


# ============================================================
# PREPROCESSING
# ============================================================

numeric_pipeline = Pipeline(
    steps=[
        (
            "imputer",
            SimpleImputer(strategy="median")
        ),
        (
            "scaler",
            StandardScaler()
        ),
    ]
)


categorical_pipeline = Pipeline(
    steps=[
        (
            "imputer",
            SimpleImputer(strategy="most_frequent")
        ),
        (
            "encoder",
            OneHotEncoder(
                handle_unknown="ignore"
            )
        ),
    ]
)


preprocessor = ColumnTransformer(
    transformers=[
        (
            "numeric",
            numeric_pipeline,
            numeric_features,
        ),
        (
            "categorical",
            categorical_pipeline,
            categorical_features,
        ),
    ]
)


# ============================================================
# MODEL
# ============================================================

model = RandomForestClassifier(
    n_estimators=300,
    max_depth=12,
    min_samples_split=10,
    min_samples_leaf=4,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1,
)


pipeline = Pipeline(
    steps=[
        (
            "preprocessor",
            preprocessor
        ),
        (
            "model",
            model
        ),
    ]
)


# ============================================================
# TRAIN
# ============================================================

print("\nTraining Random Forest...")

pipeline.fit(
    X_train,
    y_train
)


print("Training completed.")


# ============================================================
# EVALUATION
# ============================================================

y_pred = pipeline.predict(X_test)

y_probability = pipeline.predict_proba(
    X_test
)[:, 1]


accuracy = accuracy_score(
    y_test,
    y_pred
)

precision = precision_score(
    y_test,
    y_pred,
    zero_division=0
)

recall = recall_score(
    y_test,
    y_pred,
    zero_division=0
)

f1 = f1_score(
    y_test,
    y_pred,
    zero_division=0
)

roc_auc = roc_auc_score(
    y_test,
    y_probability
)


print("\n========================================")
print(" MODEL EVALUATION")
print("========================================")

print(f"\nAccuracy : {accuracy:.4f}")
print(f"Precision: {precision:.4f}")
print(f"Recall   : {recall:.4f}")
print(f"F1 Score : {f1:.4f}")
print(f"ROC-AUC  : {roc_auc:.4f}")


print("\nConfusion Matrix:")

print(
    confusion_matrix(
        y_test,
        y_pred
    )
)


print("\nClassification Report:")

print(
    classification_report(
        y_test,
        y_pred,
        zero_division=0
    )
)


# ============================================================
# FEATURE IMPORTANCE
# ============================================================

trained_model = pipeline.named_steps["model"]

trained_preprocessor = (
    pipeline.named_steps["preprocessor"]
)


feature_names = (
    trained_preprocessor
    .get_feature_names_out()
)


importance = pd.DataFrame(
    {
        "feature": feature_names,
        "importance": trained_model.feature_importances_,
    }
)


importance = importance.sort_values(
    "importance",
    ascending=False
)


print("\nTop 15 Important Features:")

print(
    importance.head(15).to_string(
        index=False
    )
)


# ============================================================
# SAVE MODEL
# ============================================================

model_path = os.path.join(
    MODEL_DIR,
    "recovery_probability_model.joblib"
)


joblib.dump(
    pipeline,
    model_path
)


# ============================================================
# SAVE METRICS
# ============================================================

metrics = {
    "samples": int(len(df)),
    "training_samples": int(len(X_train)),
    "testing_samples": int(len(X_test)),
    "accuracy": float(accuracy),
    "precision": float(precision),
    "recall": float(recall),
    "f1": float(f1),
    "roc_auc": float(roc_auc),
}


metrics_path = os.path.join(
    MODEL_DIR,
    "metrics.json"
)


with open(
    metrics_path,
    "w"
) as file:
    json.dump(
        metrics,
        file,
        indent=2
    )


# ============================================================
# SAVE FEATURE IMPORTANCE
# ============================================================

importance_path = os.path.join(
    MODEL_DIR,
    "feature_importance.csv"
)


importance.to_csv(
    importance_path,
    index=False
)


# ============================================================
# FINAL
# ============================================================

print("\n========================================")
print(" MODEL SAVED")
print("========================================")

print(
    f"\nModel: {model_path}"
)

print(
    f"Metrics: {metrics_path}"
)

print(
    f"Feature importance: {importance_path}"
)

print("\nReviveAI ML engine is ready.")