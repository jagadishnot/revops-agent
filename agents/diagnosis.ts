export type DiagnosisInput = {
  amount: number;
  status: string;
  failureReason?: string | null;
  retryCount: number;
  abandoned: boolean;
  customerSegment?: string | null;
  previousFailures: number;
};

export type DiagnosisResult = {
  diagnosis: string;
  category: string;
  recoverability: "HIGH" | "MEDIUM" | "LOW";
  recommendedApproach: string;
  reasoning: string[];
};

export function diagnoseTransaction(
  input: DiagnosisInput
): DiagnosisResult {
  const reasoning: string[] = [];

  if (input.status === "ABANDONED") {
    reasoning.push("Customer started checkout but did not complete payment.");

    return {
      diagnosis: "Checkout abandonment",
      category: "ABANDONED_CHECKOUT",
      recoverability: "HIGH",
      recommendedApproach:
        "Re-engage the customer with a payment link and a short recovery message.",
      reasoning,
    };
  }

  if (input.failureReason === "INSUFFICIENT_FUNDS") {
    reasoning.push("The payment failed because sufficient funds were unavailable.");

    if (input.retryCount >= 2) {
      reasoning.push("Multiple retries have already occurred.");

      return {
        diagnosis: "Repeated insufficient-funds failure",
        category: "INSUFFICIENT_FUNDS",
        recoverability: "LOW",
        recommendedApproach:
          "Avoid repeated automatic retries and consider delayed recovery or human escalation.",
        reasoning,
      };
    }

    return {
      diagnosis: "Insufficient funds",
      category: "INSUFFICIENT_FUNDS",
      recoverability: "MEDIUM",
      recommendedApproach:
        "Allow a limited retry after a delay rather than repeatedly retrying immediately.",
      reasoning,
    };
  }

  if (
    input.failureReason === "NETWORK_ERROR" ||
    input.failureReason === "TIMEOUT"
  ) {
    reasoning.push("The failure appears potentially temporary.");
    reasoning.push("A fresh payment attempt may succeed.");

    return {
      diagnosis: "Temporary payment connectivity failure",
      category: "TEMPORARY_FAILURE",
      recoverability: "HIGH",
      recommendedApproach:
        "Attempt one controlled retry before using another recovery channel.",
      reasoning,
    };
  }

  if (input.failureReason === "AUTHENTICATION_FAILED") {
    reasoning.push("The payment authentication step was unsuccessful.");

    return {
      diagnosis: "Payment authentication failure",
      category: "AUTHENTICATION_FAILURE",
      recoverability: "MEDIUM",
      recommendedApproach:
        "Ask the customer to retry using the payment flow rather than repeatedly charging.",
      reasoning,
    };
  }

  if (input.failureReason === "CARD_EXPIRED") {
    reasoning.push("The customer's card appears to be expired.");

    return {
      diagnosis: "Expired payment method",
      category: "PAYMENT_METHOD_INVALID",
      recoverability: "MEDIUM",
      recommendedApproach:
        "Send a payment link so the customer can choose another payment method.",
      reasoning,
    };
  }

  if (input.failureReason === "BANK_DECLINE") {
    reasoning.push("The issuing bank declined the payment.");

    return {
      diagnosis: "Bank-declined payment",
      category: "BANK_DECLINE",
      recoverability: "MEDIUM",
      recommendedApproach:
        "Use an alternative payment channel instead of repeated immediate retries.",
      reasoning,
    };
  }

  if (input.previousFailures >= 3) {
    reasoning.push("The customer has experienced multiple previous failures.");

    return {
      diagnosis: "Repeated customer payment failure",
      category: "REPEATED_FAILURE",
      recoverability: "LOW",
      recommendedApproach:
        "Reduce automated attempts and consider human-assisted recovery.",
      reasoning,
    };
  }

  return {
    diagnosis: "Payment failure with insufficient diagnostic evidence",
    category: "UNKNOWN",
    recoverability: "MEDIUM",
    recommendedApproach:
      "Use a controlled recovery attempt and observe the result.",
    reasoning: [
      "No strong failure pattern was detected.",
    ],
  };
}