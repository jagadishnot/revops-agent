import sys
import json
import joblib
import pandas as pd


MODEL_PATH = "ml/model/recovery_probability_model.joblib"


# ============================================================
# LOAD MODEL
# ============================================================

model = joblib.load(MODEL_PATH)


# ============================================================
# PREDICT
# ============================================================

def predict(transaction):

    df = pd.DataFrame([transaction])

    # -----------------------------
    # Feature engineering
    # -----------------------------

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

    # -----------------------------
    # Prediction
    # -----------------------------

    probability = model.predict_proba(df)[0][1]

    return {
        "recoveryProbability": round(
            float(probability),
            4
        ),
        "recoveryPercentage": round(
            float(probability) * 100,
            2
        ),
    }


# ============================================================
# CLI
# ============================================================

if __name__ == "__main__":

    try:

        input_data = sys.stdin.read()

        transaction = json.loads(
            input_data
        )

        result = predict(
            transaction
        )

        print(
            json.dumps(result)
        )

    except Exception as error:

        print(
            json.dumps(
                {
                    "error": str(error)
                }
            )
        )

        sys.exit(1)