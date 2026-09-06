import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectRevenueRisk } from "@/agents/detector";

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

    const result = detectRevenueRisk({
      amount: transaction.amount,
      status: transaction.status,
      retryCount: transaction.retryCount,
      abandoned: transaction.abandoned,
      failureReason: transaction.failureReason,
      customerLifetimeValue: transaction.customer.lifetimeValue,
      previousFailures,
    });

    await prisma.transaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        recoveryProbability: null,
        revenueAtRisk: result.revenueAtRisk,
        riskLevel: result.level,
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
      risk: result,
    });
  } catch (error) {
    console.error("Risk detection error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to detect revenue risk",
      },
      { status: 500 }
    );
  }
}