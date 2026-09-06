import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const limitParam = searchParams.get("limit");
    const limit = Math.min(Number(limitParam) || 100, 200);

    const logs = await prisma.auditLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error("Audit API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch audit logs",
      },
      {
        status: 500,
      }
    );
  }
}