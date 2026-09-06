import os
import json
import joblib
import pandas as pd

from dotenv import load_dotenv

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
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

load_dotenv()

DATASET_PATH = "ml/recovery_evaluation_dataset.csv"
MODEL_DIR = "ml/model"

os.makedirs(MODEL_DIR, exist_ok=True)


# ============================================================
# HEADER
# ============================================================

print("\n========================================")
print(" REVIVEAI RECOVERY MODEL TRAINING")
print("========================================\n")


# ============================================================
# LOAD DATASET
# ============================================================

print("Loading recovery evaluation dataset...")

df = pd.read_csv(DATASET_PATH)

print(
    f"Loaded {len(df):,} transactions."
)


# ============================================================
# VALIDATION
# ============================================================

required_columns = [
    "amount",
    "retry_count",
    "checkout_duration",
    "lifetime_value",
    "total_transactions",
    "successful_payments",
    "failed_payments",
    "abandoned_checkouts",
    "failure_reason",
    "payment_method",
    "preferred_method",
    "customer_segment",
    "status",
    "recovered",
]


missing_columns = [
    column
    for column in required_columns
    if column not in df.columns
]


if missing_columns:
    raise ValueError(
        "Missing columns: "
        + ", ".join(missing_columns)
    )


# ============================================================
# IMPORTANT
# ============================================================
#
# We train ONLY on FAILED / ABANDONED transactions.
#
# Target:
#
# recovered = 1
# recovered = 0
#
# The target represents the simulated recovery outcome.
#
# We intentionally DO NOT use:
#
# - recovered
# - baseline_recovered
# - ai_recovered
# - recovered amounts
# - strategy multiplier
# - simulated recovery probability
#
# as model features.
#
# ============================================================


df = df[
    df["status"].isin(
        ["FAILED", "ABANDONED"]
    )
].copy()


print(
    f"At-risk transactions: {len(df):,}"
)


print("\nRecovery outcome distribution:")

print(
    df["recovered"]
    .value_counts()
    .sort_index()
)


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


df["preferred_payment_match"] = (
    df["payment_method"]
    ==
    df["preferred_method"]
).astype(int)


# ============================================================
# FEATURES
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
    "preferred_payment_match",
]


categorical_features = [
    "failure_reason",
    "payment_method",
    "preferred_method",
    "customer_segment",
    "status",
]


features = (
    numeric_features
    +
    categorical_features
)


X = df[features]

y = df["recovered"]


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


print(
    f"\nTraining samples: {len(X_train):,}"
)

print(
    f"Testing samples : {len(X_test):,}"
)


# ============================================================
# PREPROCESSING
# ============================================================

numeric_pipeline = Pipeline(
    steps=[
        (
            "imputer",
            SimpleImputer(
                strategy="median"
            ),
        ),
        (
            "scaler",
            StandardScaler(),
        ),
    ]
)


categorical_pipeline = Pipeline(
    steps=[
        (
            "imputer",
            SimpleImputer(
                strategy="most_frequent"
            ),
        ),
        (
            "encoder",
            OneHotEncoder(
                handle_unknown="ignore"
            ),
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
    max_depth=10,
    min_samples_split=12,
    min_samples_leaf=5,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1,
)


pipeline = Pipeline(
    steps=[
        (
            "preprocessor",
            preprocessor,
        ),
        (
            "model",
            model,
        ),
    ]
)


# ============================================================
# TRAIN
# ============================================================

print("\nTraining recovery probability model...")

pipeline.fit(
    X_train,
    y_train,
)

print("Training completed.")


# ============================================================
# PREDICTIONS
# ============================================================

y_pred = pipeline.predict(
    X_test
)


y_probability = (
    pipeline.predict_proba(
        X_test
    )[:, 1]
)


# ============================================================
# METRICS
# ============================================================

accuracy = accuracy_score(
    y_test,
    y_pred,
)


precision = precision_score(
    y_test,
    y_pred,
    zero_division=0,
)


recall = recall_score(
    y_test,
    y_pred,
    zero_division=0,
)


f1 = f1_score(
    y_test,
    y_pred,
    zero_division=0,
)


roc_auc = roc_auc_score(
    y_test,
    y_probability,
)


# ============================================================
# DISPLAY METRICS
# ============================================================

print("\n========================================")
print(" RECOVERY MODEL EVALUATION")
print("========================================\n")

print(
    f"Accuracy : {accuracy:.4f}"
)

print(
    f"Precision: {precision:.4f}"
)

print(
    f"Recall   : {recall:.4f}"
)

print(
    f"F1 Score : {f1:.4f}"
)

print(
    f"ROC-AUC  : {roc_auc:.4f}"
)


print("\nConfusion Matrix:")

print(
    confusion_matrix(
        y_test,
        y_pred,
    )
)


print("\nClassification Report:")

print(
    classification_report(
        y_test,
        y_pred,
        zero_division=0,
    )
)


# ============================================================
# FEATURE IMPORTANCE
# ============================================================

trained_model = (
    pipeline
    .named_steps["model"]
)


trained_preprocessor = (
    pipeline
    .named_steps["preprocessor"]
)


feature_names = (
    trained_preprocessor
    .get_feature_names_out()
)


importance = pd.DataFrame(
    {
        "feature": feature_names,
        "importance":
            trained_model
            .feature_importances_,
    }
)


importance = importance.sort_values(
    "importance",
    ascending=False,
)


print("\nTop 20 Important Features:")

print(
    importance
    .head(20)
    .to_string(index=False)
)


# ============================================================
# SAVE MODEL
# ============================================================

model_path = (
    os.path.join(
        MODEL_DIR,
        "recovery_probability_model.joblib",
    )
)


joblib.dump(
    pipeline,
    model_path,
)


# ============================================================
# SAVE METRICS
# ============================================================

metrics = {
    "model": "RandomForestClassifier",
    "dataset": DATASET_PATH,
    "samples": int(len(df)),
    "training_samples": int(
        len(X_train)
    ),
    "testing_samples": int(
        len(X_test)
    ),
    "accuracy": float(
        accuracy
    ),
    "precision": float(
        precision
    ),
    "recall": float(
        recall
    ),
    "f1": float(
        f1
    ),
    "roc_auc": float(
        roc_auc
    ),
}


metrics_path = (
    os.path.join(
        MODEL_DIR,
        "recovery_model_metrics.json",
    )
)


with open(
    metrics_path,
    "w",
) as file:
    json.dump(
        metrics,
        file,
        indent=2,
    )


# ============================================================
# SAVE FEATURE IMPORTANCE
# ============================================================

importance_path = (
    os.path.join(
        MODEL_DIR,
        "recovery_feature_importance.csv",
    )
)


importance.to_csv(
    importance_path,
    index=False,
)


# ============================================================
# FINAL
# ============================================================

print("\n========================================")
print(" RECOVERY MODEL SAVED")
print("========================================\n")

print(
    f"Model    : {model_path}"
)

print(
    f"Metrics  : {metrics_path}"
)

print(
    f"Features : {importance_path}"
)

print(
    "\nReviveAI recovery prediction model is ready."
)

print(
    "This model predicts recovery probability "
    "for FAILED / ABANDONED transactions."
)

print("\n========================================\n")