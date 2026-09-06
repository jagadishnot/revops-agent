import { RiskLevel, TransactionStatus } from "../generated/prisma/client";

export type RiskDetectionInput = {
  amount: number;
  status: TransactionStatus;
  retryCount: number;
  abandoned: boolean;
  failureReason?: string | null;
  customerLifetimeValue?: number;
  previousFailures?: number;
};

export type RiskDetectionResult = {
  score: number;
  level: RiskLevel;
  revenueAtRisk: number;
  reasons: string[];
};

export function detectRevenueRisk(
  input: RiskDetectionInput
): RiskDetectionResult {
  let score = 0;
  const reasons: string[] = [];

  // 1. Failed or abandoned transaction
  if (
    input.status === TransactionStatus.FAILED ||
    input.status === TransactionStatus.ABANDONED
  ) {
    score += 30;
    reasons.push("Payment was not successfully completed");
  }

  // 2. High transaction value
  if (input.amount >= 25000) {
    score += 30;
    reasons.push("High-value transaction");
  } else if (input.amount >= 5000) {
    score += 20;
    reasons.push("Medium/high-value transaction");
  }

  // 3. Multiple retries
  if (input.retryCount >= 3) {
    score += 25;
    reasons.push("Multiple payment retries detected");
  } else if (input.retryCount >= 2) {
    score += 20;
    reasons.push("Repeated payment attempts detected");
  }

  // 4. Checkout abandonment
  if (input.abandoned) {
    score += 15;
    reasons.push("Checkout was abandoned");
  }

  // 5. Previous failures
  if ((input.previousFailures ?? 0) >= 3) {
    score += 15;
    reasons.push("Customer has multiple previous payment failures");
  }

  // 6. High customer lifetime value
  if ((input.customerLifetimeValue ?? 0) >= 50000) {
    score += 15;
    reasons.push("High-value customer");
  }

  // 7. Failure reason
  if (
    input.failureReason === "NETWORK_ERROR" ||
    input.failureReason === "TIMEOUT"
  ) {
    score += 10;
    reasons.push("Failure may be recoverable through another payment attempt");
  }

  score = Math.min(score, 100);

  let level: RiskLevel;

  if (score >= 70) {
    level = RiskLevel.CRITICAL;
  } else if (score >= 50) {
    level = RiskLevel.HIGH;
  } else if (score >= 30) {
    level = RiskLevel.MEDIUM;
  } else {
    level = RiskLevel.LOW;
  }

  const revenueAtRisk =
    input.status === TransactionStatus.FAILED ||
    input.status === TransactionStatus.ABANDONED
      ? input.amount
      : 0;

  return {
    score,
    level,
    revenueAtRisk,
    reasons,
  };
}