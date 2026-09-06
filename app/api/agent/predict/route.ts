import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { predictRecoveryProbability } from "@/agents/predictor";

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

    // ============================================================
    // LOAD TRANSACTION + CUSTOMER
    // ============================================================

    const transaction =
      await prisma.transaction.findUnique({
        where: {
          id: transactionId,
        },
        include: {
          customer: true,
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

    // ============================================================
    // ONLY PREDICT AT-RISK TRANSACTIONS
    // ============================================================

    if (
      transaction.status !== "FAILED" &&
      transaction.status !== "ABANDONED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Recovery prediction is only available for FAILED or ABANDONED transactions.",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // BUILD ML INPUT
    // ============================================================

    const prediction =
      await predictRecoveryProbability({
        amount: transaction.amount,

        riskLevel: transaction.riskLevel,

        status: transaction.status,

        retryCount: transaction.retryCount,

        abandoned: transaction.abandoned,

        failureReason:
          transaction.failureReason,

        customerLifetimeValue:
          transaction.customer.lifetimeValue,

        previousFailures:
          transaction.customer.failedPayments,

        checkoutDuration:
          transaction.checkoutDuration,

        totalTransactions:
          transaction.customer.totalTransactions,

        successfulPayments:
          transaction.customer.successfulPayments,

        abandonedCheckouts:
          transaction.customer.abandonedCheckouts,

        paymentMethod:
          transaction.paymentMethod,

        preferredMethod:
          transaction.customer.preferredMethod,

        customerSegment:
          transaction.customer.customerSegment,
      });

    // ============================================================
    // SAVE PREDICTION TO TRANSACTION
    // ============================================================

    await prisma.transaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        recoveryProbability:
          prediction.probability,

        revenueAtRisk:
          transaction.amount,

      },
    });

    // ============================================================
    // FIND OR CREATE RECOVERY CASE
    // ============================================================

    const recoveryCase =
      await prisma.recoveryCase.upsert({
        where: {
          transactionId:
            transaction.id,
        },

        create: {
          transactionId:
            transaction.id,

          status: "ACTION_REQUIRED",

          predictedProbability:
            prediction.probability,

          expectedRecovery:
            prediction.expectedRecovery,

          attempts: 0,
        },

        update: {
          predictedProbability:
            prediction.probability,

          expectedRecovery:
            prediction.expectedRecovery,

          status: "ACTION_REQUIRED",
        },
      });

    // ============================================================
    // SAVE AGENT DECISION
    // ============================================================

    await prisma.agentDecision.create({
      data: {
        recoveryCaseId:
          recoveryCase.id,

        decision:
          "RECOVERY_PROBABILITY_PREDICTED",

        reasoning:
          prediction.factors.join("; "),

        confidence:
          prediction.confidence,

        expectedGain:
          prediction.expectedRecovery,
      },
    });

    // ============================================================
    // AUDIT LOG
    // ============================================================

    await prisma.auditLog.create({
      data: {
        entityType:
          "TRANSACTION",

        entityId:
          transaction.id,

        action:
          "ML_RECOVERY_PREDICTION",

        actor:
          "REVIVEAI_ML_AGENT",

        details: {
          probability:
            prediction.probability,

          expectedRecovery:
            prediction.expectedRecovery,

          confidence:
            prediction.confidence,

          factors:
            prediction.factors,
        },
      },
    });

    // ============================================================
    // RESPONSE
    // ============================================================

    return NextResponse.json({
      success: true,

      prediction: {
        probability:
          prediction.probability,

        probabilityPercentage:
          Number(
            (
              prediction.probability *
              100
            ).toFixed(2)
          ),

        expectedRecovery:
          prediction.expectedRecovery,

        confidence:
          prediction.confidence,

        factors:
          prediction.factors,
      },

      recoveryCase: {
        id:
          recoveryCase.id,

        status:
          recoveryCase.status,

        predictedProbability:
          recoveryCase.predictedProbability,

        expectedRecovery:
          recoveryCase.expectedRecovery,
      },
    });

  } catch (error) {
    console.error(
      "Recovery prediction error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to generate recovery prediction",
      },
      {
        status: 500,
      }
    );
  }
}