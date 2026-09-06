import { prisma } from "../lib/prisma";

export type OrchestratorResult = {
  success: boolean;
  transactionId: string;

  stages: {
    detect: unknown;
    diagnose: unknown;
    predict: unknown;
    strategy: unknown;
    guardrails: unknown;
    execute?: unknown;
  };

  finalStatus: string;

  message: string;
};


async function callInternalApi(
  baseUrl: string,
  path: string,
  transactionId: string
) {
  const response = await fetch(
    `${baseUrl}${path}`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        transactionId,
      }),

      cache: "no-store",
    }
  );


  const data =
    await response.json();


  if (
    !response.ok ||
    !data.success
  ) {

    throw new Error(
      data.error ||
      `Agent stage failed: ${path}`
    );
  }


  return data;
}


export async function runReviveAI(
  transactionId: string,
  baseUrl: string
): Promise<OrchestratorResult> {

  // ============================================================
  // LOAD TRANSACTION
  // ============================================================

  const transaction =
    await prisma.transaction.findUnique({

      where: {
        id: transactionId,
      },

    });


  if (!transaction) {

    throw new Error(
      "Transaction not found"
    );
  }


  // ============================================================
  // SAFETY CHECK
  // ============================================================
  //
  // ReviveAI should only attempt recovery for transactions
  // that are currently FAILED or ABANDONED.
  //
  // If a previous recovery succeeded, the webhook changes
  // the transaction to SUCCESS.
  //
  // Running the agent again would be incorrect.
  //
  // ============================================================

  if (
    transaction.status !== "FAILED" &&
    transaction.status !== "ABANDONED"
  ) {

    return {

      success: true,

      transactionId,

      stages: {

        detect: {
          skipped: true,
          reason:
            `Transaction is already ${transaction.status}.`,
        },

        diagnose: {
          skipped: true,
        },

        predict: {
          skipped: true,
        },

        strategy: {
          skipped: true,
        },

        guardrails: {
          skipped: true,
        },

      },

      finalStatus:
        transaction.status,

      message:
        `Recovery workflow skipped because this transaction is already ${transaction.status}.`,

    };
  }


  // ============================================================
  // DETECTION
  // ============================================================

  const detect =
    await callInternalApi(
      baseUrl,
      "/api/agent/detect",
      transactionId
    );


  // ============================================================
  // DIAGNOSIS
  // ============================================================

  const diagnose =
    await callInternalApi(
      baseUrl,
      "/api/agent/diagnose",
      transactionId
    );


  // ============================================================
  // ML PREDICTION
  // ============================================================

  const predict =
    await callInternalApi(
      baseUrl,
      "/api/agent/predict",
      transactionId
    );


  // ============================================================
  // STRATEGY
  // ============================================================

  const strategy =
    await callInternalApi(
      baseUrl,
      "/api/agent/strategy",
      transactionId
    );


  // ============================================================
  // GUARDRAILS
  // ============================================================

  const guardrails =
    await callInternalApi(
      baseUrl,
      "/api/agent/guardrails",
      transactionId
    );


  // ============================================================
  // GUARDRAIL DECISION
  // ============================================================

  if (
    guardrails.guardrails?.decision !==
    "ALLOW"
  ) {

    const finalStatus =
      guardrails.guardrails?.decision ===
      "ESCALATE"
        ? "ACTION_REQUIRED"
        : "STOPPED";


    return {

      success: true,

      transactionId,

      stages: {

        detect,

        diagnose,

        predict,

        strategy,

        guardrails,

      },

      finalStatus,

      message:
        guardrails.guardrails?.reason ??
        "Recovery execution was blocked by guardrails.",

    };
  }


  // ============================================================
  // EXECUTION
  // ============================================================

  const execute =
    await callInternalApi(
      baseUrl,
      "/api/agent/execute",
      transactionId
    );


  // ============================================================
  // RESULT
  // ============================================================

  return {

    success: true,

    transactionId,

    stages: {

      detect,

      diagnose,

      predict,

      strategy,

      guardrails,

      execute,

    },

    finalStatus:
      execute.execution?.status ??
      "IN_PROGRESS",

    message:
      execute.execution?.message ??
      "Recovery action executed.",

  };
}