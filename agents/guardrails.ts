import {
  RecoveryActionType,
  RiskLevel,
} from "../generated/prisma/client";

export type GuardrailInput = {
  transactionId: string;

  amount: number;

  action: RecoveryActionType;

  recoveryProbability: number;

  expectedRecovery: number;

  retryCount: number;

  customerContactCount: number;

  createdAt: Date;

  riskLevel: RiskLevel | null;
};

export type GuardrailResult = {
  decision: "ALLOW" | "BLOCK" | "ESCALATE";

  reason: string;

  triggeredRules: string[];

  remainingRetries: number;

  withinRecoveryWindow: boolean;

  requiresHumanApproval: boolean;
};


/* ============================================================
   DEFAULT MERCHANT POLICY
   ============================================================ */

export type GuardrailPolicy = {
  maxRetries: number;

  maxIncentivePercent: number;

  maxAutoRecovery: number;

  maxCustomerContacts: number;

  recoveryWindowHours: number;

  requireHumanAbove: number;

  enabled: boolean;
};


/* ============================================================
   CHECK GUARDRAILS
   ============================================================ */

export function evaluateGuardrails(
  input: GuardrailInput,
  policy: GuardrailPolicy
): GuardrailResult {

  const triggeredRules: string[] = [];

  let decision:
    | "ALLOW"
    | "BLOCK"
    | "ESCALATE" = "ALLOW";


  let reason =
    "Action satisfies merchant guardrail policy.";


  // ==========================================================
  // POLICY ENABLED
  // ==========================================================

  if (!policy.enabled) {

    return {
      decision: "BLOCK",

      reason:
        "Automated recovery is disabled by merchant policy.",

      triggeredRules: [
        "AUTOMATION_DISABLED",
      ],

      remainingRetries:
        Math.max(
          policy.maxRetries -
          input.retryCount,
          0
        ),

      withinRecoveryWindow: false,

      requiresHumanApproval: false,
    };
  }


  // ==========================================================
  // RECOVERY WINDOW
  // ==========================================================

  const now = Date.now();

  const ageMs =
    now -
    input.createdAt.getTime();

  const ageHours =
    ageMs /
    (
      1000 *
      60 *
      60
    );


  const withinRecoveryWindow =
    ageHours <=
    policy.recoveryWindowHours;


  if (!withinRecoveryWindow) {

    triggeredRules.push(
      "RECOVERY_WINDOW_EXCEEDED"
    );

    decision = "BLOCK";

    reason =
      `Transaction is outside the ${policy.recoveryWindowHours}-hour automated recovery window.`;
  }


  // ==========================================================
  // CUSTOMER CONTACT LIMIT
  // ==========================================================

  const communicationActions:
    RecoveryActionType[] = [
      "SEND_EMAIL",
      "SEND_SMS",
      "SEND_WHATSAPP",
    ];


  if (
    communicationActions.includes(
      input.action
    ) &&
    input.customerContactCount >=
      policy.maxCustomerContacts
  ) {

    triggeredRules.push(
      "CUSTOMER_CONTACT_LIMIT"
    );

    decision = "BLOCK";

    reason =
      `Customer contact limit of ${policy.maxCustomerContacts} has been reached.`;
  }


  // ==========================================================
  // RETRY LIMIT
  // ==========================================================

  if (
    input.action ===
      "RETRY_PAYMENT" &&
    input.retryCount >=
      policy.maxRetries
  ) {

    triggeredRules.push(
      "MAX_RETRIES_EXCEEDED"
    );

    decision = "BLOCK";

    reason =
      `Maximum retry limit of ${policy.maxRetries} has been reached.`;
  }


  // ==========================================================
  // HIGH-VALUE AUTOMATION LIMIT
  // ==========================================================

  if (
    input.amount >
    policy.maxAutoRecovery
  ) {

    triggeredRules.push(
      "AUTOMATED_AMOUNT_LIMIT"
    );

    decision = "ESCALATE";

    reason =
      `Transaction amount ₹${input.amount.toFixed(2)} exceeds the automated recovery limit of ₹${policy.maxAutoRecovery.toFixed(2)}.`;
  }


  // ==========================================================
  // EXPECTED RECOVERY LIMIT
  // ==========================================================

  if (
    input.expectedRecovery >
    policy.maxAutoRecovery
  ) {

    triggeredRules.push(
      "EXPECTED_RECOVERY_LIMIT"
    );

    decision = "ESCALATE";

    reason =
      `Expected recovery ₹${input.expectedRecovery.toFixed(2)} exceeds the automated recovery threshold of ₹${policy.maxAutoRecovery.toFixed(2)}.`;
  }


  // ==========================================================
  // HUMAN APPROVAL THRESHOLD
  // ==========================================================

  if (
    input.amount >=
    policy.requireHumanAbove
  ) {

    triggeredRules.push(
      "HUMAN_APPROVAL_THRESHOLD"
    );

    decision = "ESCALATE";

    reason =
      `Transaction requires human approval above ₹${policy.requireHumanAbove.toFixed(2)}.`;
  }


  // ==========================================================
  // LOW RECOVERY PROBABILITY
  // ==========================================================

  if (
    input.recoveryProbability <
    0.20
  ) {

    triggeredRules.push(
      "LOW_RECOVERY_PROBABILITY"
    );

    decision = "BLOCK";

    reason =
      "Recovery probability is below the minimum threshold for automated intervention.";
  }


  // ==========================================================
  // STOP ACTION
  // ==========================================================

  if (
    input.action === "STOP"
  ) {

    triggeredRules.push(
      "STRATEGY_REQUESTED_STOP"
    );

    decision = "BLOCK";

    reason =
      "Strategy agent determined that further recovery action is not worthwhile.";
  }


  // ==========================================================
  // INCENTIVE SAFETY
  // ==========================================================

  if (
    input.action ===
      "OFFER_INCENTIVE"
  ) {

    if (
      policy.maxIncentivePercent <= 0
    ) {

      triggeredRules.push(
        "INCENTIVES_DISABLED"
      );

      decision = "BLOCK";

      reason =
        "Merchant policy does not permit automated incentives.";
    }
  }


  // ==========================================================
  // CRITICAL RISK
  // ==========================================================

  if (
    input.riskLevel ===
    "CRITICAL"
  ) {

    triggeredRules.push(
      "CRITICAL_RISK_REVIEW"
    );

    /*
     * Critical does not automatically mean BLOCK.
     *
     * We escalate only when the transaction is also
     * high-value or otherwise outside automation limits.
     */

    if (
      input.amount >=
      policy.requireHumanAbove
    ) {

      decision = "ESCALATE";

      reason =
        "Critical-risk transaction requires human review.";
    }
  }


  // ==========================================================
  // FINAL DECISION
  // ==========================================================

  const requiresHumanApproval =
    decision === "ESCALATE";


  return {

    decision,

    reason,

    triggeredRules,

    remainingRetries:
      Math.max(
        policy.maxRetries -
        input.retryCount,
        0
      ),

    withinRecoveryWindow,

    requiresHumanApproval,

  };
}