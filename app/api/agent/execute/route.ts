import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { razorpay } from "@/lib/razorpay";
import { executeRecoveryAction } from "@/agents/executor";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const transactionId = body.transactionId;

    if (!transactionId) {
      return NextResponse.json(
        {
          success: false,
          error: "transactionId is required",
        },
        { status: 400 }
      );
    }

    const transaction = await prisma.transaction.findUnique({
      where: {
        id: transactionId,
      },
      include: {
        customer: true,
        recoveryCase: {
          include: {
            actions: true,
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction not found",
        },
        { status: 404 }
      );
    }

    const recoveryCase = transaction.recoveryCase;

    if (!recoveryCase) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Recovery case not found. Complete diagnosis, prediction and strategy first.",
        },
        { status: 400 }
      );
    }

    if (!recoveryCase.recommendedAction) {
      return NextResponse.json(
        {
          success: false,
          error: "No recovery action has been selected.",
        },
        { status: 400 }
      );
    }

    /*
     * Only execute cases that have passed the guardrail stage.
     */
    if (
      recoveryCase.status !== "IN_PROGRESS" &&
      recoveryCase.recommendedAction !== "HUMAN_ESCALATION" &&
      recoveryCase.recommendedAction !== "STOP"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Recovery action has not been approved by the guardrail engine.",
        },
        { status: 403 }
      );
    }

    const action = recoveryCase.recommendedAction;

    /*
     * Prevent accidental duplicate execution.
     */
    const existingExecution =
      await prisma.recoveryAction.findFirst({
        where: {
          recoveryCaseId: recoveryCase.id,
          type: action,
          status: {
            in: [
              "EXECUTED",
              "SIMULATED",
              "AWAITING_HUMAN",
              "READY",
            ],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    if (existingExecution) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        message:
          "This recovery action has already been executed or prepared.",
        action: existingExecution,
      });
    }

    let execution;

    /*
     * Razorpay Test Mode Payment Link.
     */
    if (action === "PAYMENT_LINK") {
      const paymentLink = await razorpay.paymentLink.create({
        amount: Math.round(transaction.amount * 100),
        currency: transaction.currency,
        description: `ReviveAI recovery for ${transaction.externalId}`,

        customer: {
          name: transaction.customer.name,
          email: transaction.customer.email,
          contact:
            transaction.customer.phone ?? undefined,
        },

        notify: {
          email: false,
          sms: false,
        },

        reminder_enable: false,

        notes: {
          reviveai_transaction_id: transaction.id,
          reviveai_external_id: transaction.externalId,
          recovery_case_id: recoveryCase.id,
        },
      });

      execution = {
        success: true,
        action,
        status: "READY",
        message:
          "Razorpay Test Mode payment link created.",
        externalReference: paymentLink.id,
        paymentLink: paymentLink.short_url,
      };
    } else {
      execution = await executeRecoveryAction({
        action,
        transactionId: transaction.id,
        externalId: transaction.externalId,
        amount: transaction.amount,
        customerName: transaction.customer.name,
        customerEmail: transaction.customer.email,
        customerPhone: transaction.customer.phone,
        retryCount: transaction.retryCount,
        recoveryCaseId: recoveryCase.id,
      });
    }

    /*
     * Persist the recovery action.
     */
    await prisma.recoveryAction.create({
      data: {
        recoveryCaseId: recoveryCase.id,
        type: action,

        reason:
          recoveryCase.diagnosis ??
          "Recovery action selected by ReviveAI.",

        status: execution.status,

        amount: transaction.amount,

        expectedValue:
          recoveryCase.expectedRecovery ?? 0,

        executedAt: new Date(),
      },
    });

    /*
     * Update retry count when a retry is executed.
     */
    if (
      action === "RETRY_PAYMENT" &&
      execution.success
    ) {
      await prisma.transaction.update({
        where: {
          id: transaction.id,
        },

        data: {
          retryCount: {
            increment: 1,
          },
        },
      });
    }

    /*
     * Determine the new recovery case status.
     *
     * IMPORTANT:
     * Using const here preserves the string-literal
     * union so Prisma can correctly type-check the
     * RecoveryStatus enum.
     */
    const newStatus =
      action === "STOP"
        ? "STOPPED"
        : action === "HUMAN_ESCALATION"
        ? "ACTION_REQUIRED"
        : execution.success
        ? "IN_PROGRESS"
        : "FAILED";

    await prisma.recoveryCase.update({
      where: {
        id: recoveryCase.id,
      },

      data: {
        status: newStatus,
        attempts: {
          increment: 1,
        },
      },
    });

    /*
     * Agent decision.
     */
    await prisma.agentDecision.create({
      data: {
        recoveryCaseId: recoveryCase.id,

        decision: "EXECUTE_RECOVERY_ACTION",

        reasoning: execution.message,

        confidence:
          recoveryCase.predictedProbability ?? 0,

        expectedGain:
          recoveryCase.expectedRecovery ?? 0,
      },
    });

    /*
     * Audit trail.
     */
    await prisma.auditLog.create({
      data: {
        entityType: "RECOVERY_CASE",

        entityId: recoveryCase.id,

        action: "RECOVERY_ACTION_EXECUTED",

        actor: "REVIVEAI_EXECUTOR",

        details: {
          action,

          status: execution.status,

          success: execution.success,

          message: execution.message,

          externalReference:
            execution.externalReference ?? null,

          paymentLink:
            execution.paymentLink ?? null,

          amount: transaction.amount,
        },
      },
    });

    return NextResponse.json({
      success: execution.success,

      transaction: {
        id: transaction.id,
        externalId: transaction.externalId,
        amount: transaction.amount,
      },

      execution,

      recoveryCase: {
        id: recoveryCase.id,
        status: newStatus,
        attempts: recoveryCase.attempts + 1,
      },
    });
  } catch (error) {
    console.error(
      "Recovery execution error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to execute recovery action.",
      },
      {
        status: 500,
      }
    );
  }
}
