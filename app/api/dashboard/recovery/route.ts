import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
  totalAtRisk,
  currentAtRisk,
  totalExpected,
  totalRecovered,
  recoveryAttempts,
  successfulRecoveries,
  stoppedCases,
  humanEscalations,
] = await Promise.all([
  // Original revenue that was at risk before recovery
  prisma.transaction.aggregate({
    _sum: { initialRevenueAtRisk: true },
  }),

  // Current unresolved revenue still at risk
  prisma.transaction.aggregate({
    _sum: { revenueAtRisk: true },
  }),



      prisma.recoveryCase.aggregate({
        _sum: {
          expectedRecovery: true,
        },
      }),

      prisma.recoveryCase.aggregate({
        _sum: {
          actualRecovery: true,
        },
      }),

      prisma.recoveryAction.count({
        where: {
          status: {
            not: "STOPPED",
          },
        },
      }),

      prisma.recoveryCase.count({
        where: {
          status: "RECOVERED",
        },
      }),

      prisma.recoveryCase.count({
        where: {
          status: "STOPPED",
        },
      }),

      prisma.recoveryAction.count({
        where: {
          type: "HUMAN_ESCALATION",
        },
      }),
    ]);

    const revenueAtRisk =
  totalAtRisk._sum.initialRevenueAtRisk ?? 0;

const currentRevenueAtRisk =
  currentAtRisk._sum.revenueAtRisk ?? 0;
    

    const expectedRecovery =
      totalExpected._sum.expectedRecovery ?? 0;

    const actualRecovered =
      totalRecovered._sum.actualRecovery ?? 0;

    const recoveryRate =
      revenueAtRisk > 0
        ? (actualRecovered / revenueAtRisk) * 100
        : 0;

    const expectedRecoveryRate =
      revenueAtRisk > 0
        ? (expectedRecovery / revenueAtRisk) * 100
        : 0;

    return NextResponse.json({
      success: true,

      recovery: {
        revenueAtRisk,
        currentRevenueAtRisk,
        expectedRecovery,
        actualRecovered,
        recoveryRate,
        expectedRecoveryRate,
        recoveryAttempts,
        successfulRecoveries,
        stoppedCases,
        humanEscalations,
      },
    });
  } catch (error) {
    console.error(
      "Recovery analytics error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to calculate recovery analytics",
      },
      { status: 500 }
    );
  }
}