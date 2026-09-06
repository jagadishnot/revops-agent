import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cases = await prisma.recoveryCase.findMany({
      include: {
        transaction: {
          include: {
            customer: true,
          },
        },
        actions: {
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
        decisions: {
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      count: cases.length,
      cases,
    });
  } catch (error) {
    console.error("Agent cases error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch recovery cases",
      },
      { status: 500 }
    );
  }
}