import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import {
  evaluateGuardrails,
} from "@/agents/guardrails";


// ==========================================================
// GET CURRENT MERCHANT GUARDRAIL POLICY
// ==========================================================

export async function GET() {
  try {
    const policy =
      await prisma.guardrailPolicy.findFirst({
        where: {
          enabled: true,
        },

        orderBy: {
          updatedAt: "desc",
        },
      });


    if (!policy) {
      return NextResponse.json(
        {
          success: false,

          error:
            "No active guardrail policy found.",
        },

        {
          status: 404,
        }
      );
    }


    return NextResponse.json({
      success: true,

      policy: {
        id: policy.id,

        name: policy.name,

        maxRetries:
          policy.maxRetries,

        maxIncentivePercent:
          policy.maxIncentivePercent,

        maxAutoRecovery:
          policy.maxAutoRecovery,

        maxCustomerContacts:
          policy.maxCustomerContacts,

        recoveryWindowHours:
          policy.recoveryWindowHours,

        requireHumanAbove:
          policy.requireHumanAbove,

        enabled:
          policy.enabled,

        updatedAt:
          policy.updatedAt,
      },
    });


  } catch (error) {

    console.error(
      "Guardrail policy GET error:",
      error
    );


    return NextResponse.json(
      {
        success: false,

        error:
          "Failed to fetch guardrail policy",
      },

      {
        status: 500,
      }
    );
  }
}


// ==========================================================
// POST — EVALUATE GUARDRAILS FOR A TRANSACTION
// ==========================================================

export async function POST(
  request: Request
) {

  try {

    const body =
      await request.json();

    const transactionId =
      body.transactionId;


    if (!transactionId) {

      return NextResponse.json(
        {
          success: false,

          error:
            "transactionId is required",
        },

        {
          status: 400,
        }
      );
    }


    // ==========================================================
    // LOAD TRANSACTION
    // ==========================================================

    const transaction =
      await prisma.transaction.findUnique({

        where: {
          id: transactionId,
        },

        include: {
          customer: true,

          recoveryCase: {
            include: {
              actions: true,
            },
          },
        },

      });


    if (!transaction) {

      return NextResponse.json(
        {
          success: false,

          error:
            "Transaction not found",
        },

        {
          status: 404,
        }
      );
    }


    // ==========================================================
    // REQUIRE STRATEGY
    // ==========================================================

    const recoveryCase =
      transaction.recoveryCase;


    if (
      !recoveryCase ||
      !recoveryCase.recommendedAction
    ) {

      return NextResponse.json(
        {
          success: false,

          error:
            "Recovery strategy is not available. Run the strategy stage first.",
        },

        {
          status: 400,
        }
      );
    }


    // ==========================================================
    // LOAD MERCHANT POLICY
    // ==========================================================

    const policy =
      await prisma.guardrailPolicy.findFirst({

        where: {
          enabled: true,
        },

        orderBy: {
          updatedAt: "desc",
        },

      });


    if (!policy) {

      return NextResponse.json(
        {
          success: false,

          error:
            "No active guardrail policy found.",
        },

        {
          status: 500,
        }
      );
    }


    // ==========================================================
    // CUSTOMER CONTACT COUNT
    // ==========================================================

    const customerContactCount =
      await prisma.recoveryAction.count({

        where: {

          recoveryCase: {

            transaction: {

              customerId:
                transaction.customerId,

            },

          },

          type: {
            in: [
              "SEND_EMAIL",
              "SEND_SMS",
              "SEND_WHATSAPP",
            ],
          },

        },

      });


    // ==========================================================
    // EVALUATE GUARDRAILS
    // ==========================================================

    const result =
      evaluateGuardrails(

        {
          transactionId:
            transaction.id,

          amount:
            transaction.amount,

          action:
            recoveryCase.recommendedAction,

          recoveryProbability:
            transaction.recoveryProbability ??
            recoveryCase.predictedProbability ??
            0,

          expectedRecovery:
            recoveryCase.expectedRecovery ??
            0,

          retryCount:
            transaction.retryCount,

          customerContactCount,

          createdAt:
            transaction.createdAt,

          riskLevel:
            transaction.riskLevel,
        },

        {
          maxRetries:
            policy.maxRetries,

          maxIncentivePercent:
            policy.maxIncentivePercent,

          maxAutoRecovery:
            policy.maxAutoRecovery,

          maxCustomerContacts:
            policy.maxCustomerContacts,

          recoveryWindowHours:
            policy.recoveryWindowHours,

          requireHumanAbove:
            policy.requireHumanAbove,

          enabled:
            policy.enabled,
        }
      );


    // ==========================================================
    // UPDATE RECOVERY CASE STATUS
    // ==========================================================

    let newStatus:
      | "ACTION_REQUIRED"
      | "STOPPED"
      | "IN_PROGRESS";


    if (
      result.decision === "ESCALATE"
    ) {

      newStatus =
        "ACTION_REQUIRED";

    } else if (
      result.decision === "BLOCK"
    ) {

      newStatus =
        "STOPPED";

    } else {

      newStatus =
        "IN_PROGRESS";
    }


    await prisma.recoveryCase.update({

      where: {
        id: recoveryCase.id,
      },

      data: {
        status: newStatus,
      },

    });


    // ==========================================================
    // SAVE AGENT DECISION
    // ==========================================================

    await prisma.agentDecision.create({

      data: {

        recoveryCaseId:
          recoveryCase.id,

        decision:
          `GUARDRAIL_${result.decision}`,

        reasoning:
          result.reason,

        confidence:
          result.decision === "ALLOW"
            ? 0.95
            : result.decision === "ESCALATE"
              ? 0.90
              : 0.95,

        expectedGain:
          recoveryCase.expectedRecovery ??
          0,

      },

    });


    // ==========================================================
    // AUDIT LOG
    // ==========================================================

    await prisma.auditLog.create({

      data: {

        entityType:
          "RECOVERY_CASE",

        entityId:
          recoveryCase.id,

        action:
          `GUARDRAIL_${result.decision}`,

        actor:
          "REVIVEAI_GUARDRAIL_AGENT",

        details: {

          decision:
            result.decision,

          reason:
            result.reason,

          triggeredRules:
            result.triggeredRules,

          selectedAction:
            recoveryCase.recommendedAction,

          amount:
            transaction.amount,

          recoveryProbability:
            transaction.recoveryProbability,

          expectedRecovery:
            recoveryCase.expectedRecovery,

          customerContactCount,

          remainingRetries:
            result.remainingRetries,

          withinRecoveryWindow:
            result.withinRecoveryWindow,

          requiresHumanApproval:
            result.requiresHumanApproval,

        },

      },

    });


    // ==========================================================
    // RESPONSE
    // ==========================================================

    return NextResponse.json({

      success: true,

      guardrails: {

        decision:
          result.decision,

        reason:
          result.reason,

        triggeredRules:
          result.triggeredRules,

        remainingRetries:
          result.remainingRetries,

        withinRecoveryWindow:
          result.withinRecoveryWindow,

        requiresHumanApproval:
          result.requiresHumanApproval,

      },

      policy: {

        id:
          policy.id,

        name:
          policy.name,

        maxRetries:
          policy.maxRetries,

        maxIncentivePercent:
          policy.maxIncentivePercent,

        maxAutoRecovery:
          policy.maxAutoRecovery,

        maxCustomerContacts:
          policy.maxCustomerContacts,

        recoveryWindowHours:
          policy.recoveryWindowHours,

        requireHumanAbove:
          policy.requireHumanAbove,

        enabled:
          policy.enabled,

      },

      recoveryCase: {

        id:
          recoveryCase.id,

        status:
          newStatus,

        recommendedAction:
          recoveryCase.recommendedAction,

      },

    });


  } catch (error) {

    console.error(
      "Guardrail evaluation error:",
      error
    );


    return NextResponse.json(
      {

        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to evaluate guardrails",

      },

      {
        status: 500,
      }
    );
  }
}