import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  selectRecoveryStrategy,
} from "@/agents/strategy";

export async function POST(
  request: Request
) {

  try {

    const body =
      await request.json();


    const transactionId =
      body.transactionId;


    if (!transactionId) {

      return NextResponse.json(
        {
          success: false,
          error:
            "transactionId is required",
        },
        {
          status: 400,
        }
      );
    }


    // ==========================================================
    // LOAD TRANSACTION
    // ==========================================================

    const transaction =
      await prisma.transaction.findUnique({

        where: {
          id: transactionId,
        },

        include: {
          customer: true,
          recoveryCase: true,
        },

      });


    if (!transaction) {

      return NextResponse.json(
        {
          success: false,
          error:
            "Transaction not found",
        },
        {
          status: 404,
        }
      );
    }


    // ==========================================================
    // REQUIRE ML PREDICTION
    // ==========================================================

    if (
      transaction.recoveryProbability ===
      null
    ) {

      return NextResponse.json(
        {
          success: false,

          error:
            "Recovery probability is not available. Run the prediction stage first.",
        },
        {
          status: 400,
        }
      );
    }


    const expectedRecovery =
      transaction.recoveryCase
        ?.expectedRecovery ??
      (
        transaction.amount *
        transaction.recoveryProbability
      );


    // ==========================================================
    // STRATEGY INPUT
    // ==========================================================

    const strategy =
      selectRecoveryStrategy({

        amount:
          transaction.amount,

        recoveryProbability:
          transaction.recoveryProbability,

        expectedRecovery,

        failureReason:
          transaction.failureReason,

        status:
          transaction.status,

        retryCount:
          transaction.retryCount,

        customerLifetimeValue:
          transaction.customer.lifetimeValue,

        previousFailures:
          transaction.customer.failedPayments,

        abandoned:
          transaction.abandoned,

        paymentMethod:
          transaction.paymentMethod,

        preferredMethod:
          transaction.customer.preferredMethod,

        customerSegment:
          transaction.customer.customerSegment,

      });


    // ==========================================================
    // UPDATE RECOVERY CASE
    // ==========================================================

    const recoveryCase =
      await prisma.recoveryCase.upsert({

        where: {
          transactionId:
            transaction.id,
        },

        create: {

          transactionId:
            transaction.id,

          status:
            "ACTION_REQUIRED",

          predictedProbability:
            transaction.recoveryProbability,

          expectedRecovery:
            strategy.expectedRecovery,

          recommendedAction:
            strategy.action,

        },

        update: {

          predictedProbability:
            transaction.recoveryProbability,

          expectedRecovery:
            strategy.expectedRecovery,

          recommendedAction:
            strategy.action,

          status:
            "ACTION_REQUIRED",

        },

      });


    // ==========================================================
    // SAVE DECISION
    // ==========================================================

    await prisma.agentDecision.create({

      data: {

        recoveryCaseId:
          recoveryCase.id,

        decision:
          `STRATEGY_SELECTED:${strategy.action}`,

        reasoning:
          strategy.reason,

        confidence:
          strategy.confidence,

        expectedGain:
          strategy.expectedRecovery,

      },

    });


    // ==========================================================
    // SAVE AUDIT
    // ==========================================================

    await prisma.auditLog.create({

      data: {

        entityType:
          "RECOVERY_CASE",

        entityId:
          recoveryCase.id,

        action:
          "STRATEGY_SELECTED",

        actor:
          "REVIVEAI_STRATEGY_AGENT",

        details: {

          selectedAction:
            strategy.action,

          probability:
            strategy.probability,

          expectedRecovery:
            strategy.expectedRecovery,

          confidence:
            strategy.confidence,

          alternatives:
            strategy.alternatives,

        },

      },

    });


    // ==========================================================
    // RESPONSE
    // ==========================================================

    return NextResponse.json({

      success: true,

      strategy: {

        action:
          strategy.action,

        reason:
          strategy.reason,

        probability:
          strategy.probability,

        expectedRecovery:
          strategy.expectedRecovery,

        confidence:
          strategy.confidence,

        alternatives:
          strategy.alternatives,

      },

      recoveryCase: {

        id:
          recoveryCase.id,

        recommendedAction:
          recoveryCase.recommendedAction,

        expectedRecovery:
          recoveryCase.expectedRecovery,

      },

    });

  } catch (error) {

    console.error(
      "Recovery strategy error:",
      error
    );


    return NextResponse.json(
      {

        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to select recovery strategy",

      },
      {
        status: 500,
      }
    );
  }
}