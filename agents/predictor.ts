import { RiskLevel } from "../generated/prisma/client";
import { spawn } from "child_process";

export type RecoveryPredictionInput = {
  amount: number;

  riskLevel: RiskLevel | null;

  status: string;

  retryCount: number;

  abandoned: boolean;

  failureReason?: string | null;

  customerLifetimeValue: number;

  previousFailures: number;

  diagnosisCategory?: string;

  recoverability?: "HIGH" | "MEDIUM" | "LOW";

  checkoutDuration?: number | null;

  totalTransactions?: number;

  successfulPayments?: number;

  abandonedCheckouts?: number;

  paymentMethod?: string | null;

  preferredMethod?: string | null;

  customerSegment?: string | null;
};

export type RecoveryPredictionResult = {
  probability: number;

  expectedRecovery: number;

  confidence: number;

  factors: string[];
};


/* ============================================================
   CALL PYTHON ML MODEL
   ============================================================ */

async function callMLModel(
  input: RecoveryPredictionInput
): Promise<number> {

  return new Promise((resolve, reject) => {

    const pythonProcess = spawn(
      "python",
      ["ml/predict_service.py"],
      {
        cwd: process.cwd(),
      }
    );


    let output = "";

    let errorOutput = "";


    pythonProcess.stdout.on(
      "data",
      (data) => {
        output += data.toString();
      }
    );


    pythonProcess.stderr.on(
      "data",
      (data) => {
        errorOutput += data.toString();
      }
    );


    pythonProcess.on(
      "error",
      (error) => {
        reject(
          new Error(
            `Failed to start Python ML service: ${error.message}`
          )
        );
      }
    );


    pythonProcess.on(
      "close",
      (code) => {

        if (code !== 0) {

          reject(
            new Error(
              errorOutput ||
              `ML prediction process exited with code ${code}`
            )
          );

          return;
        }


        try {

          const result = JSON.parse(
            output.trim()
          );


          if (
            typeof result.recoveryProbability !==
            "number"
          ) {

            reject(
              new Error(
                "ML service returned an invalid recovery probability."
              )
            );

            return;
          }


          resolve(
            result.recoveryProbability
          );

        } catch (error) {

          reject(
            new Error(
              `Invalid ML service response: ${output}`
            )
          );
        }
      }
    );


    const mlInput = {

      amount: input.amount,

      retry_count: input.retryCount,

      checkout_duration:
        input.checkoutDuration ?? null,

      lifetime_value:
        input.customerLifetimeValue,

      total_transactions:
        input.totalTransactions ?? 0,

      successful_payments:
        input.successfulPayments ?? 0,

      failed_payments:
        input.previousFailures,

      abandoned_checkouts:
        input.abandonedCheckouts ?? 0,

      failure_reason:
        input.failureReason ?? "UNKNOWN",

      payment_method:
        input.paymentMethod ?? "UNKNOWN",

      preferred_method:
        input.preferredMethod ?? "UNKNOWN",

      customer_segment:
        input.customerSegment ?? "REGULAR",

      status:
        input.status,
    };


    pythonProcess.stdin.write(
      JSON.stringify(mlInput)
    );

    pythonProcess.stdin.end();

  });
}


/* ============================================================
   GENERATE EXPLANATION FACTORS
   ============================================================ */

function generateFactors(
  input: RecoveryPredictionInput,
  probability: number
): string[] {

  const factors: string[] = [];


  if (
    input.customerLifetimeValue >= 50000
  ) {

    factors.push(
      "High customer lifetime value"
    );
  }


  if (
    input.failureReason ===
      "NETWORK_ERROR" ||
    input.failureReason ===
      "TIMEOUT"
  ) {

    factors.push(
      "Potentially temporary payment failure"
    );
  }


  if (
    input.abandoned ||
    input.status === "ABANDONED"
  ) {

    factors.push(
      "Abandoned checkout is suitable for re-engagement"
    );
  }


  if (
    input.failureReason ===
      "CARD_EXPIRED" ||
    input.failureReason ===
      "BANK_DECLINE"
  ) {

    factors.push(
      "Alternative payment method may recover the transaction"
    );
  }


  if (
    input.retryCount >= 3
  ) {

    factors.push(
      "Multiple previous retries reduce recovery likelihood"
    );

  } else if (
    input.retryCount >= 2
  ) {

    factors.push(
      "Previous retries reduce recovery likelihood"
    );
  }


  if (
    input.previousFailures >= 3
  ) {

    factors.push(
      "Customer has repeated historical failures"
    );
  }


  if (
    input.amount >= 25000
  ) {

    factors.push(
      "High transaction value requires cautious recovery"
    );
  }


  if (
    probability >= 0.70
  ) {

    factors.push(
      "ML model predicts strong recovery potential"
    );

  } else if (
    probability >= 0.40
  ) {

    factors.push(
      "ML model predicts moderate recovery potential"
    );

  } else {

    factors.push(
      "ML model predicts low recovery potential"
    );
  }


  return factors;
}


/* ============================================================
   MAIN PREDICTOR
   ============================================================ */

export async function predictRecoveryProbability(
  input: RecoveryPredictionInput
): Promise<RecoveryPredictionResult> {

  try {

    const probability =
      await callMLModel(input);


    const expectedRecovery =
      input.amount * probability;


    /*
     * Confidence is deliberately kept separate from
     * recovery probability.
     *
     * Probability = estimated chance of recovery.
     *
     * Confidence = how much supporting evidence we have
     * available for the decision.
     */

    let confidence = 0.60;


    if (
      input.totalTransactions &&
      input.totalTransactions >= 5
    ) {

      confidence += 0.05;
    }


    if (
      input.previousFailures !== undefined
    ) {

      confidence += 0.05;
    }


    if (
      input.failureReason
    ) {

      confidence += 0.05;
    }


    if (
      input.paymentMethod
    ) {

      confidence += 0.05;
    }


    confidence = Math.min(
      confidence,
      0.90
    );


    const factors =
      generateFactors(
        input,
        probability
      );


    return {

      probability,

      expectedRecovery,

      confidence,

      factors,

    };


  } catch (error) {

    console.error(
      "ML prediction failed:",
      error
    );


    /*
     * IMPORTANT:
     *
     * We do NOT silently invent a probability.
     *
     * If ML is unavailable, the agent receives
     * an explicit error instead of pretending that
     * the prediction is valid.
     */

    throw new Error(
      "Recovery ML prediction unavailable."
    );
  }
}