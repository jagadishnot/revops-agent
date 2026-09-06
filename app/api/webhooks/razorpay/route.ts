import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    const signature = request.headers.get(
      "x-razorpay-signature"
    );

    const webhookSecret =
      process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing webhook signature or secret",
        },
        { status: 400 }
      );
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const signaturesMatch = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!signaturesMatch) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid webhook signature",
        },
        { status: 401 }
      );
    }

    const event = JSON.parse(rawBody);

    console.log(
      "Razorpay webhook received:",
      event.event
    );

    /*
     * PAYMENT CAPTURED
     */
    if (event.event === "payment.captured") {
      const payment = event.payload?.payment?.entity;

      if (!payment) {
        return NextResponse.json({
          success: true,
          message: "Webhook received but payment data was missing",
        });
      }

      const notes = payment.notes ?? {};

      const transactionId =
        notes.reviveai_transaction_id;

      const recoveryCaseId =
        notes.recovery_case_id;

      if (transactionId && recoveryCaseId) {
        const recoveredAmount =
          Number(payment.amount) / 100;

        await prisma.recoveryCase.update({
          where: {
            id: recoveryCaseId,
          },
          data: {
            status: "RECOVERED",
            actualRecovery: recoveredAmount,
          },
        });

        await prisma.transaction.update({
          where: {
            id: transactionId,
          },
          data: {
            status: "SUCCESS",
            revenueAtRisk: 0,
          },
        });

        await prisma.recoveryAction.create({
          data: {
            recoveryCaseId,
            type: "PAYMENT_LINK",
            reason:
              "Payment successfully captured through ReviveAI recovery flow.",
            status: "RECOVERED",
            amount: recoveredAmount,
            expectedValue: recoveredAmount,
            executedAt: new Date(),
          },
        });

        await prisma.agentDecision.create({
          data: {
            recoveryCaseId,
            decision: "RECOVERY_CONFIRMED",
            reasoning:
              "Razorpay payment.captured webhook confirmed successful payment.",
            confidence: 1,
            expectedGain: recoveredAmount,
          },
        });

        await prisma.auditLog.create({
          data: {
            entityType: "RECOVERY_CASE",
            entityId: recoveryCaseId,
            action: "REVENUE_RECOVERED",
            actor: "RAZORPAY_WEBHOOK",
            details: {
              paymentId: payment.id,
              recoveredAmount,
              currency: payment.currency,
              transactionId,
            },
          },
        });

        console.log(
          `Revenue recovered: ₹${recoveredAmount}`
        );
      }
    }

    /*
     * PAYMENT FAILED
     */
    if (event.event === "payment.failed") {
      const payment = event.payload?.payment?.entity;

      if (payment) {
        const notes = payment.notes ?? {};

        const transactionId =
          notes.reviveai_transaction_id;

        const recoveryCaseId =
          notes.recovery_case_id;

        if (recoveryCaseId) {
          await prisma.recoveryCase.update({
            where: {
              id: recoveryCaseId,
            },
            data: {
              status: "FAILED",
            },
          });

          await prisma.auditLog.create({
            data: {
              entityType: "RECOVERY_CASE",
              entityId: recoveryCaseId,
              action: "RECOVERY_PAYMENT_FAILED",
              actor: "RAZORPAY_WEBHOOK",
              details: {
                paymentId: payment.id,
                transactionId: transactionId ?? null,
                errorCode:
                  payment.error_code ?? null,
                errorDescription:
                  payment.error_description ?? null,
              },
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      received: true,
    });
  } catch (error) {
    console.error(
      "Razorpay webhook error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}