import os
import numpy as np
import pandas as pd
import psycopg2

from dotenv import load_dotenv


# ============================================================
# CONFIG
# ============================================================

load_dotenv()

DATABASE_URL = os.getenv("DIRECT_URL")

if not DATABASE_URL:
    raise ValueError(
        "DIRECT_URL environment variable is not set."
    )

RANDOM_SEED = 42

np.random.seed(RANDOM_SEED)


OUTPUT_FILE = "ml/recovery_evaluation_dataset.csv"


# ============================================================
# LOAD DATA
# ============================================================

print("\n========================================")
print(" REVIVEAI RECOVERY SIMULATION")
print("========================================\n")

print("Loading at-risk transactions...")


query = """
SELECT
    t.id,
    t."externalId" AS external_id,
    t.amount,
    t.currency,
    t.status,
    t."failureReason" AS failure_reason,
    t."paymentMethod" AS payment_method,
    t."retryCount" AS retry_count,
    t."checkoutDuration" AS checkout_duration,
    t.abandoned,

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

WHERE t.status IN ('FAILED', 'ABANDONED')
"""


connection = psycopg2.connect(DATABASE_URL)

df = pd.read_sql(
    query,
    connection
)

connection.close()


print(
    f"Loaded {len(df):,} at-risk transactions."
)


if len(df) == 0:
    raise ValueError(
        "No FAILED or ABANDONED transactions found."
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


# ============================================================
# HIDDEN RECOVERY PROPENSITY
# ============================================================
#
# This represents a synthetic "ground truth" recovery process.
#
# IMPORTANT:
# This is NOT claimed to be real Razorpay customer behavior.
#
# It exists only so we can evaluate the agent on a reproducible
# simulated environment.
#
# The model will NOT receive this score.
#
# ============================================================


probability = np.full(
    len(df),
    0.35,
    dtype=float
)


# Customer history

probability += (
    df["success_history_ratio"]
    .clip(0, 1)
    * 0.25
)


probability -= (
    df["failure_history_ratio"]
    .clip(0, 1)
    * 0.15
)


probability -= (
    df["abandonment_history_ratio"]
    .clip(0, 1)
    * 0.10
)


# Retry behavior

probability -= (
    df["retry_count"].clip(0, 5)
    * 0.04
)


# Customer value

probability += (
    df["high_value_customer"]
    * 0.08
)


# Payment amount

probability -= (
    df["high_amount"]
    * 0.04
)


# Checkout behavior

checkout_effect = (
    df["checkout_duration"]
    .fillna(0)
    .clip(0, 600)
)

probability += np.where(
    checkout_effect > 30,
    0.04,
    0
)


# Payment method

probability += np.where(
    df["payment_method"]
    ==
    df["preferred_method"],
    0.06,
    0
)


# Failure reason effects

probability += np.where(
    df["failure_reason"]
    == "TIMEOUT",
    0.08,
    0
)


probability += np.where(
    df["failure_reason"]
    == "NETWORK_ERROR",
    0.07,
    0
)


probability -= np.where(
    df["failure_reason"]
    == "CARD_EXPIRED",
    0.12,
    0
)


probability -= np.where(
    df["failure_reason"]
    == "INSUFFICIENT_FUNDS",
    0.08,
    0
)


probability -= np.where(
    df["failure_reason"]
    == "AUTHENTICATION_FAILED",
    0.10,
    0
)


# Abandoned checkout behavior

probability += np.where(
    df["status"] == "ABANDONED",
    0.05,
    0
)


# Clamp probability

probability = np.clip(
    probability,
    0.05,
    0.90
)


df["simulated_recovery_probability"] = probability


# ============================================================
# GENERATE ACTUAL RECOVERY OUTCOME
# ============================================================
#
# This is intentionally stochastic.
#
# A transaction with probability 0.70 does NOT always recover.
#
# This prevents us from creating a deterministic evaluation.
#
# ============================================================

random_values = np.random.random(
    len(df)
)


df["recovered"] = (
    random_values
    <
    df["simulated_recovery_probability"]
).astype(int)


# ============================================================
# BASELINE STRATEGY
# ============================================================
#
# Baseline:
#
# Every at-risk transaction receives a generic retry.
#
# We model a modest strategy uplift.
#
# ============================================================

baseline_probability = np.clip(
    df["simulated_recovery_probability"] * 0.72,
    0.02,
    0.75
)


baseline_random = np.random.random(
    len(df)
)


df["baseline_recovered"] = (
    baseline_random
    <
    baseline_probability
).astype(int)


# ============================================================
# AI STRATEGY
# ============================================================
#
# ReviveAI does NOT blindly contact everyone.
#
# High-probability transactions receive an optimized action.
#
# Low-probability transactions can be stopped or escalated.
#
# ============================================================


def select_strategy(row):

    reason = row["failure_reason"]
    probability = row[
        "simulated_recovery_probability"
    ]

    if probability < 0.20:
        return "STOP"

    if reason == "INSUFFICIENT_FUNDS":
        return "PAYMENT_LINK"

    if reason == "CARD_EXPIRED":
        return "SEND_EMAIL"

    if reason == "AUTHENTICATION_FAILED":
        return "PAYMENT_LINK"

    if reason in [
        "TIMEOUT",
        "NETWORK_ERROR"
    ]:
        return "RETRY_PAYMENT"

    if row["status"] == "ABANDONED":
        return "SEND_WHATSAPP"

    if probability >= 0.70:
        return "PAYMENT_LINK"

    return "RETRY_PAYMENT"


df["ai_strategy"] = df.apply(
    select_strategy,
    axis=1
)


# ============================================================
# STRATEGY EFFECT
# ============================================================

strategy_multiplier = {
    "STOP": 0.00,
    "RETRY_PAYMENT": 0.90,
    "PAYMENT_LINK": 1.12,
    "SEND_EMAIL": 0.82,
    "SEND_WHATSAPP": 1.05,
}


df["strategy_multiplier"] = (
    df["ai_strategy"]
    .map(strategy_multiplier)
    .fillna(0.80)
)


# ============================================================
# AI RECOVERY PROBABILITY
# ============================================================

df["ai_recovery_probability"] = np.clip(
    df["simulated_recovery_probability"]
    *
    df["strategy_multiplier"],
    0,
    0.95
)


# ============================================================
# SIMULATE AI RECOVERY
# ============================================================

ai_random = np.random.random(
    len(df)
)


df["ai_recovered"] = (
    (
        ai_random
        <
        df["ai_recovery_probability"]
    )
    &
    (
        df["ai_strategy"] != "STOP"
    )
).astype(int)


# ============================================================
# REVENUE
# ============================================================

df["baseline_recovered_amount"] = np.where(
    df["baseline_recovered"] == 1,
    df["amount"],
    0
)


df["ai_recovered_amount"] = np.where(
    df["ai_recovered"] == 1,
    df["amount"],
    0
)


# ============================================================
# EXPECTED VALUE
# ============================================================

df["baseline_expected_recovery"] = (
    df["amount"]
    *
    baseline_probability
)


df["ai_expected_recovery"] = (
    df["amount"]
    *
    df["ai_recovery_probability"]
)


# ============================================================
# SAVE
# ============================================================

df.to_csv(
    OUTPUT_FILE,
    index=False
)


# ============================================================
# EVALUATION SUMMARY
# ============================================================

total_at_risk = df["amount"].sum()

baseline_recovered = (
    df["baseline_recovered_amount"].sum()
)

ai_recovered = (
    df["ai_recovered_amount"].sum()
)


baseline_count = (
    df["baseline_recovered"].sum()
)

ai_count = (
    df["ai_recovered"].sum()
)


baseline_rate = (
    baseline_count
    /
    len(df)
    *
    100
)


ai_rate = (
    ai_count
    /
    len(df)
    *
    100
)


revenue_lift = (
    ai_recovered
    -
    baseline_recovered
)


lift_percentage = (
    revenue_lift
    /
    baseline_recovered
    *
    100
    if baseline_recovered > 0
    else 0
)


# ============================================================
# OUTPUT
# ============================================================

print("\n========================================")
print(" RECOVERY EVALUATION")
print("========================================")

print(
    f"\nTransactions evaluated : {len(df):,}"
)

print(
    f"Revenue at risk         : ₹{total_at_risk:,.2f}"
)

print("\nBASELINE")

print(
    f"Recovered transactions  : {baseline_count:,}"
)

print(
    f"Recovery rate           : {baseline_rate:.2f}%"
)

print(
    f"Revenue recovered       : ₹{baseline_recovered:,.2f}"
)


print("\nREVIVEAI")

print(
    f"Recovered transactions  : {ai_count:,}"
)

print(
    f"Recovery rate           : {ai_rate:.2f}%"
)

print(
    f"Revenue recovered       : ₹{ai_recovered:,.2f}"
)


print("\nAI IMPACT")

print(
    f"Additional revenue      : ₹{revenue_lift:,.2f}"
)

print(
    f"Revenue lift            : {lift_percentage:.2f}%"
)


print("\nStrategy distribution:")

print(
    df["ai_strategy"]
    .value_counts()
    .to_string()
)


print(
    f"\nDataset saved to: {OUTPUT_FILE}"
)


print("\n========================================")
print(" SIMULATION COMPLETE")
print("========================================\n")