import { RecoveryActionType } from "../generated/prisma/client";

export type ExecuteActionInput = {
  action: RecoveryActionType;
  transactionId: string;
  externalId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  retryCount: number;
  recoveryCaseId: string;
};

export type ExecuteActionResult = {
  success: boolean;
  action: RecoveryActionType;
  status: string;
  message: string;
  externalReference?: string;
  paymentLink?: string;
};

export async function executeRecoveryAction(
  input: ExecuteActionInput
): Promise<ExecuteActionResult> {
  switch (input.action) {
    case RecoveryActionType.RETRY_PAYMENT:
      return {
        success: true,
        action: input.action,
        status: "SIMULATED",
        message:
          "Controlled payment retry initiated in simulation mode.",
        externalReference: `RETRY-${input.externalId}-${input.retryCount + 1}`,
      };

    case RecoveryActionType.PAYMENT_LINK:
      /*
       * Actual Razorpay Payment Link creation is handled
       * by the API route so credentials remain server-side.
       */
      return {
        success: true,
        action: input.action,
        status: "READY",
        message:
          "Payment link action approved and ready for Razorpay execution.",
      };

    case RecoveryActionType.SEND_EMAIL:
      return {
        success: true,
        action: input.action,
        status: "SIMULATED",
        message:
          `Recovery email simulated for ${input.customerEmail}.`,
      };

    case RecoveryActionType.SEND_SMS:
      return {
        success: true,
        action: input.action,
        status: "SIMULATED",
        message:
          `Recovery SMS simulated for ${input.customerPhone ?? "customer"}.`,
      };

    case RecoveryActionType.SEND_WHATSAPP:
      return {
        success: true,
        action: input.action,
        status: "SIMULATED",
        message:
          `Recovery WhatsApp message simulated for ${input.customerPhone ?? "customer"}.`,
      };

    case RecoveryActionType.OFFER_INCENTIVE:
      return {
        success: true,
        action: input.action,
        status: "SIMULATED",
        message:
          "Recovery incentive generated in simulation mode.",
      };

    case RecoveryActionType.HUMAN_ESCALATION:
      return {
        success: true,
        action: input.action,
        status: "AWAITING_HUMAN",
        message:
          "Recovery case escalated for human review.",
      };

    case RecoveryActionType.STOP:
      return {
        success: true,
        action: input.action,
        status: "STOPPED",
        message:
          "Recovery workflow stopped by the agent.",
      };

    default:
      return {
        success: false,
        action: input.action,
        status: "FAILED",
        message: "Unsupported recovery action.",
      };
  }
}