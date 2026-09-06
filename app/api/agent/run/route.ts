import { NextResponse } from "next/server";
import { runReviveAI } from "@/agents/orchestrator";

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

    const url = new URL(request.url);

    const baseUrl = `${url.protocol}//${url.host}`;

    const result = await runReviveAI(
      transactionId,
      baseUrl
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "ReviveAI orchestrator error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Agent workflow failed",
      },
      { status: 500 }
    );
  }
}