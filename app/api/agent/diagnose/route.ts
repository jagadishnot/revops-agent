import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { diagnoseTransaction } from "@/agents/diagnosis";

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
        recoveryCase: true,
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

    const previousFailures = await prisma.transaction.count({
      where: {
        customerId: transaction.customerId,
        status: "FAILED",
        id: {
          not: transaction.id,
        },
      },
    });

    const result = diagnoseTransaction({
      amount: transaction.amount,
      status: transaction.status,
      failureReason: transaction.failureReason,
      retryCount: transaction.retryCount,
      abandoned: transaction.abandoned,
      customerSegment: transaction.customer.customerSegment,
      previousFailures,
    });

    let recoveryCase = transaction.recoveryCase;

    if (!recoveryCase) {
      recoveryCase = await prisma.recoveryCase.create({
        data: {
          transactionId: transaction.id,
          status: "ANALYZING",
          diagnosis: result.diagnosis,
        },
      });
    } else {
      recoveryCase = await prisma.recoveryCase.update({
        where: {
          id: recoveryCase.id,
        },
        data: {
          diagnosis: result.diagnosis,
          status: "ANALYZING",
        },
      });
    }

    await prisma.agentDecision.create({
      data: {
        recoveryCaseId: recoveryCase.id,
        decision: "DIAGNOSE",
        reasoning: JSON.stringify({
          diagnosis: result.diagnosis,
          category: result.category,
          recoverability: result.recoverability,
          recommendedApproach: result.recommendedApproach,
          reasoning: result.reasoning,
        }),
        confidence:
          result.recoverability === "HIGH"
            ? 0.9
            : result.recoverability === "MEDIUM"
              ? 0.7
              : 0.4,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "TRANSACTION",
        entityId: transaction.id,
        action: "AI_DIAGNOSIS",
        actor: "REVIVEAI_AGENT",
        details: {
          diagnosis: result.diagnosis,
          category: result.category,
          recoverability: result.recoverability,
        },
      },
    });

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        externalId: transaction.externalId,
        amount: transaction.amount,
        status: transaction.status,
      },
      diagnosis: result,
      recoveryCaseId: recoveryCase.id,
    });
  } catch (error) {
    console.error("Diagnosis error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to diagnose transaction",
      },
      { status: 500 }
    );
  }
}