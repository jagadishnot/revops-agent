import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const limitParam = searchParams.get("limit");

    const limit = Math.min(
      Number(limitParam) || 100,
      200
    );

    const customers =
      await prisma.customer.findMany({
        orderBy: {
          createdAt: "desc",
        },

        take: limit,

        include: {
          transactions: {
            select: {
              id: true,
              amount: true,
              status: true,
              revenueAtRisk: true,
            },
          },
        },
      });

    const formattedCustomers =
      customers.map((customer) => {
        const transactions =
          customer.transactions;

        const totalTransactions =
          transactions.length;

        const successfulTransactions =
          transactions.filter(
            (transaction) =>
              transaction.status === "SUCCESS"
          ).length;

        const previousFailures =
          transactions.filter(
            (transaction) =>
              transaction.status === "FAILED" ||
              transaction.status === "ABANDONED"
          ).length;

        const totalSpent =
          transactions
            .filter(
              (transaction) =>
                transaction.status === "SUCCESS"
            )
            .reduce(
              (sum, transaction) =>
                sum + transaction.amount,
              0
            );

        const revenueAtRisk =
          transactions.reduce(
            (sum, transaction) =>
              sum + transaction.revenueAtRisk,
            0
          );

        return {
          id: customer.id,

          name: customer.name,

          email: customer.email,

          // Prisma field is customerSegment.
          // API continues exposing it as "segment"
          // so the existing frontend remains compatible.
          segment:
            customer.customerSegment || "REGULAR",

          lifetimeValue:
            customer.lifetimeValue,

          previousFailures,

          totalTransactions,

          successfulTransactions,

          totalSpent,

          revenueAtRisk,

          createdAt:
            customer.createdAt,
        };
      });

    return NextResponse.json({
      success: true,

      count:
        formattedCustomers.length,

      customers:
        formattedCustomers,
    });
  } catch (error) {
    console.error(
      "Customers API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch customers",
      },
      {
        status: 500,
      }
    );
  }
}