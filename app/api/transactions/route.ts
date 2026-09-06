import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const risk = searchParams.get("risk");
    const customerId = searchParams.get("customerId");
    const limitParam = searchParams.get("limit");

    const limit = Math.min(Number(limitParam) || 50, 100);

    const transactions = await prisma.transaction.findMany({
      where: {
        ...(status
          ? {
              status: status as any,
            }
          : {}),

        ...(risk
          ? {
              riskLevel: risk as any,
            }
          : {}),

        ...(customerId
          ? {
              customerId,
            }
          : {}),
      },

      include: {
        customer: true,
        recoveryCase: true,
      },

      orderBy: {
        createdAt: "desc",
      },

      take: limit,
    });

    return NextResponse.json({
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error("Transaction API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch transactions",
      },
      {
        status: 500,
      }
    );
  }
}