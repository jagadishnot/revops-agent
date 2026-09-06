import { RecoveryActionType } from "../generated/prisma/client";

export type StrategyInput = {
  amount: number;

  recoveryProbability: number;

  expectedRecovery: number;

  failureReason?: string | null;

  status: string;

  retryCount: number;

  customerLifetimeValue: number;

  previousFailures: number;

  abandoned: boolean;

  paymentMethod?: string | null;

  preferredMethod?: string | null;

  customerSegment?: string | null;
};

export type StrategyOption = {
  action: RecoveryActionType;

  probability: number;

  expectedRecovery: number;

  score: number;

  reason: string;
};

export type StrategyResult = {
  action: RecoveryActionType;

  reason: string;

  expectedRecovery: number;

  probability: number;

  confidence: number;

  alternatives: StrategyOption[];

};


/* ============================================================
   STRATEGY MULTIPLIERS
   ============================================================ */

const strategyMultipliers: Record<
  RecoveryActionType,
  number
> = {
  RETRY_PAYMENT: 0.90,

  PAYMENT_LINK: 1.12,

  SEND_EMAIL: 0.82,

  SEND_SMS: 0.86,

  SEND_WHATSAPP: 1.05,

  OFFER_INCENTIVE: 1.18,

  HUMAN_ESCALATION: 0.95,

  STOP: 0,
};


/* ============================================================
   ACTION BASELINES
   ============================================================ */

const actionCosts: Record<
  RecoveryActionType,
  number
> = {
  RETRY_PAYMENT: 0,

  PAYMENT_LINK: 0,

  SEND_EMAIL: 0,

  SEND_SMS: 0,

  SEND_WHATSAPP: 0,

  OFFER_INCENTIVE: 0.03,

  HUMAN_ESCALATION: 0,

  STOP: 0,
};


/* ============================================================
   BUILD POSSIBLE ACTIONS
   ============================================================ */

function getCandidateActions(
  input: StrategyInput
): RecoveryActionType[] {

  const candidates: RecoveryActionType[] = [];


  /*
   * Very low probability transactions should normally
   * be stopped instead of repeatedly contacting customers.
   */

  if (input.recoveryProbability < 0.20) {

    candidates.push(
      "STOP"
    );

    return candidates;
  }


  /*
   * Temporary technical failures.
   */

  if (
    input.failureReason ===
      "TIMEOUT" ||
    input.failureReason ===
      "NETWORK_ERROR"
  ) {

    candidates.push(
      "RETRY_PAYMENT"
    );

    candidates.push(
      "PAYMENT_LINK"
    );
  }


  /*
   * Expired cards / payment method problems.
   */

  if (
    input.failureReason ===
      "CARD_EXPIRED"
  ) {

    candidates.push(
      "SEND_EMAIL"
    );

    candidates.push(
      "PAYMENT_LINK"
    );
  }


  /*
   * Bank declines.
   */

  if (
    input.failureReason ===
      "BANK_DECLINE"
  ) {

    candidates.push(
      "PAYMENT_LINK"
    );

    candidates.push(
      "SEND_WHATSAPP"
    );
  }


  /*
   * Insufficient funds.
   */

  if (
    input.failureReason ===
      "INSUFFICIENT_FUNDS"
  ) {

    candidates.push(
      "PAYMENT_LINK"
    );

    candidates.push(
      "SEND_EMAIL"
    );
  }


  /*
   * Authentication failures.
   */

  if (
    input.failureReason ===
      "AUTHENTICATION_FAILED"
  ) {

    candidates.push(
      "PAYMENT_LINK"
    );

    candidates.push(
      "SEND_SMS"
    );
  }


  /*
   * Abandoned checkout.
   */

  if (
    input.abandoned ||
    input.status === "ABANDONED"
  ) {

    candidates.push(
      "SEND_WHATSAPP"
    );

    candidates.push(
      "PAYMENT_LINK"
    );

    candidates.push(
      "SEND_EMAIL"
    );
  }


  /*
   * High probability recovery.
   */

  if (
    input.recoveryProbability >= 0.70
  ) {

    candidates.push(
      "PAYMENT_LINK"
    );

    candidates.push(
      "RETRY_PAYMENT"
    );
  }


  /*
   * Medium probability recovery.
   */

  if (
    input.recoveryProbability >= 0.40 &&
    input.recoveryProbability < 0.70
  ) {

    candidates.push(
      "PAYMENT_LINK"
    );

    candidates.push(
      "SEND_EMAIL"
    );
  }


  /*
   * Incentives are reserved for stronger opportunities.
   *
   * We don't automatically choose them here.
   * Guardrails will make the final authorization.
   */

  if (
    input.recoveryProbability >= 0.65 &&
    input.customerLifetimeValue >= 50000
  ) {

    candidates.push(
      "OFFER_INCENTIVE"
    );
  }


  /*
   * Always have a fallback.
   */

  if (
    candidates.length === 0
  ) {

    candidates.push(
      "PAYMENT_LINK"
    );

    candidates.push(
      "SEND_EMAIL"
    );
  }


  /*
   * Remove duplicates.
   */

  return [
    ...new Set(candidates),
  ];
}


/* ============================================================
   SCORE ACTION
   ============================================================ */

function scoreAction(
  action: RecoveryActionType,
  input: StrategyInput
): StrategyOption {

  let probability =
    input.recoveryProbability;


  /*
   * Each intervention has a different simulated effectiveness.
   */

  const multiplier =
    strategyMultipliers[action];


  probability = Math.min(
    probability * multiplier,
    0.95
  );


  /*
   * Incentive action has an estimated cost.
   */

  const incentiveCost =
    input.amount *
    actionCosts[action];


  const expectedRecovery =
    Math.max(
      0,
      input.amount * probability -
      incentiveCost
    );


  /*
   * Expected-value score.
   *
   * Revenue is the primary objective.
   */

  let score =
    expectedRecovery;


  /*
   * Avoid repeatedly retrying the same transaction.
   */

  if (
    action === "RETRY_PAYMENT" &&
    input.retryCount >= 2
  ) {

    score *= 0.70;
  }


  if (
    action === "RETRY_PAYMENT" &&
    input.retryCount >= 3
  ) {

    score *= 0.40;
  }


  /*
   * Customer contact fatigue.
   */

  if (
    (
      action === "SEND_EMAIL" ||
      action === "SEND_SMS" ||
      action === "SEND_WHATSAPP"
    ) &&
    input.previousFailures >= 3
  ) {

    score *= 0.80;
  }


  /*
   * Higher-value customers receive more conservative
   * communication choices.
   */

  if (
    input.customerLifetimeValue >= 50000 &&
    action === "OFFER_INCENTIVE"
  ) {

    score *= 1.05;
  }


  let reason =
    `${action} has estimated recovery value of ₹${expectedRecovery.toFixed(2)}.`;


  if (
    action === "RETRY_PAYMENT"
  ) {

    reason =
      "Temporary or retryable failure makes another payment attempt appropriate.";
  }


  if (
    action === "PAYMENT_LINK"
  ) {

    reason =
      "Payment Link provides another payment path without repeatedly retrying the failed method.";
  }


  if (
    action === "SEND_EMAIL"
  ) {

    reason =
      "Email provides a lower-friction re-engagement path for the customer.";
  }


  if (
    action === "SEND_SMS"
  ) {

    reason =
      "SMS provides a direct recovery channel for the customer.";
  }


  if (
    action === "SEND_WHATSAPP"
  ) {

    reason =
      "WhatsApp is suitable for direct checkout re-engagement.";
  }


  if (
    action === "OFFER_INCENTIVE"
  ) {

    reason =
      "Customer value and recovery probability make a bounded incentive potentially valuable.";
  }


  if (
    action === "STOP"
  ) {

    reason =
      "Recovery probability is too low to justify further automated intervention.";
  }


  return {
    action,

    probability,

    expectedRecovery,

    score,

    reason,
  };
}


/* ============================================================
   MAIN STRATEGY ENGINE
   ============================================================ */

export function selectRecoveryStrategy(
  input: StrategyInput
): StrategyResult {

  const candidates =
    getCandidateActions(input);


  const scoredOptions =
    candidates.map(
      (action) =>
        scoreAction(
          action,
          input
        )
    );


  /*
   * Highest expected-value action wins.
   */

  scoredOptions.sort(
    (a, b) =>
      b.score - a.score
  );


  const selected =
    scoredOptions[0];


  /*
   * Confidence reflects the strength of the
   * decision relative to the next-best alternative.
   */

  let confidence = 0.65;


  if (
    scoredOptions.length >= 2
  ) {

    const second =
      scoredOptions[1];


    const difference =
      selected.score -
      second.score;


    const denominator =
      Math.max(
        selected.score,
        1
      );


    const separation =
      difference /
      denominator;


    confidence =
      Math.min(
        0.95,
        0.65 +
        separation * 0.30
      );
  }


  if (
    input.recoveryProbability >= 0.75
  ) {

    confidence =
      Math.min(
        0.95,
        confidence + 0.05
      );
  }


  return {

    action:
      selected.action,

    reason:
      selected.reason,

    expectedRecovery:
      selected.expectedRecovery,

    probability:
      selected.probability,

    confidence,

    alternatives:
      scoredOptions,
  };
}