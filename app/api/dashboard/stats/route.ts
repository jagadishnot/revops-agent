import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Total transactions
    const totalTransactions = await prisma.transaction.count();

    // Status counts
    const [
      successCount,
      failedCount,
      abandonedCount,
      expiredCount,
      pendingCount,
    ] = await Promise.all([
      prisma.transaction.count({
        where: { status: "SUCCESS" },
      }),
      prisma.transaction.count({
        where: { status: "FAILED" },
      }),
      prisma.transaction.count({
        where: { status: "ABANDONED" },
      }),
      prisma.transaction.count({
        where: { status: "EXPIRED" },
      }),
      prisma.transaction.count({
        where: { status: "PENDING" },
      }),
    ]);

    // Risk counts
    const [criticalCount, highCount, mediumCount, lowCount] =
      await Promise.all([
        prisma.transaction.count({
          where: { riskLevel: "CRITICAL" },
        }),
        prisma.transaction.count({
          where: { riskLevel: "HIGH" },
        }),
        prisma.transaction.count({
          where: { riskLevel: "MEDIUM" },
        }),
        prisma.transaction.count({
          where: { riskLevel: "LOW" },
        }),
      ]);

    // Total revenue at risk
    const revenueAtRiskResult = await prisma.transaction.aggregate({
      _sum: {
        revenueAtRisk: true,
      },
    });

    // Total transaction value
    const totalAmountResult = await prisma.transaction.aggregate({
      _sum: {
        amount: true,
      },
    });

    // Failed + abandoned revenue
    const recoverableRevenueResult = await prisma.transaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: {
          in: ["FAILED", "ABANDONED"],
        },
      },
    });

    const revenueAtRisk =
      revenueAtRiskResult._sum.revenueAtRisk ?? 0;

    const totalAmount =
      totalAmountResult._sum.amount ?? 0;

    const recoverableRevenue =
      recoverableRevenueResult._sum.amount ?? 0;

    // Success rate
    const successRate =
      totalTransactions > 0
        ? (successCount / totalTransactions) * 100
        : 0;

    return NextResponse.json({
      success: true,

      overview: {
        totalTransactions,
        totalAmount,
        revenueAtRisk,
        recoverableRevenue,
        successRate,
      },

      status: {
        success: successCount,
        failed: failedCount,
        abandoned: abandonedCount,
        expired: expiredCount,
        pending: pendingCount,
      },

      risk: {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },

      recovery: {
  recovered: 0,
  recoveryRate: 0,
  recoveryOpportunity: recoverableRevenue,
},
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to calculate dashboard statistics",
      },
      { status: 500 }
    );
  }
}