import "dotenv/config";

import {
  PrismaClient,
  TransactionStatus,
  RiskLevel,
} from "../generated/prisma/client";

import { PrismaPg } from "@prisma/adapter-pg";

// ============================================================
// DATABASE CONNECTION - PRISMA 7
// ============================================================

const connectionString = process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error(
    "❌ DIRECT_URL is not defined in .env file"
  );
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

// ============================================================
// CONSTANTS
// ============================================================

const FAILURE_REASONS = [
  "INSUFFICIENT_FUNDS",
  "BANK_DECLINE",
  "TIMEOUT",
  "AUTHENTICATION_FAILED",
  "NETWORK_ERROR",
  "CARD_EXPIRED",
  "USER_ABANDONED",
];

const PAYMENT_METHODS = [
  "UPI",
  "CARD",
  "NETBANKING",
  "WALLET",
];

const CUSTOMER_SEGMENTS = [
  "HIGH_VALUE",
  "REGULAR",
  "NEW",
  "AT_RISK",
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

function randomAmount(): number {
  const amounts = [
    299,
    499,
    799,
    999,
    1499,
    1999,
    2499,
    3499,
    4999,
    7999,
    9999,
    14999,
    24999,
  ];

  return randomItem(amounts);
}

// ============================================================
// RISK CALCULATION
// ============================================================

function calculateRisk(
  status: TransactionStatus,
  amount: number,
  retryCount: number,
  previousFailures: number,
  abandoned: boolean
): RiskLevel {
  let score = 0;

  // Failed / abandoned transaction
  if (
    status === TransactionStatus.FAILED ||
    status === TransactionStatus.ABANDONED
  ) {
    score += 30;
  }

  // High-value transaction
  if (amount >= 5000) {
    score += 20;
  }

  // Multiple retry attempts
  if (retryCount >= 2) {
    score += 20;
  }

  // Customer has history of failures
  if (previousFailures >= 3) {
    score += 15;
  }

  // Checkout abandonment
  if (abandoned) {
    score += 15;
  }

  // Convert score to risk level
  if (score >= 70) {
    return RiskLevel.CRITICAL;
  }

  if (score >= 50) {
    return RiskLevel.HIGH;
  }

  if (score >= 30) {
    return RiskLevel.MEDIUM;
  }

  return RiskLevel.LOW;
}

// ============================================================
// MAIN SEED FUNCTION
// ============================================================

async function main() {
  console.log("");
  console.log("==============================================");
  console.log("🚀 REVIVEAI DATABASE SEED");
  console.log("==============================================");
  console.log("");

  // ----------------------------------------------------------
  // 1. CLEAR EXISTING DATA
  // ----------------------------------------------------------

  console.log("🧹 Clearing existing data...");

  await prisma.auditLog.deleteMany();

  await prisma.agentDecision.deleteMany();

  await prisma.recoveryAction.deleteMany();

  await prisma.recoveryCase.deleteMany();

  await prisma.transaction.deleteMany();

  await prisma.customer.deleteMany();

  await prisma.guardrailPolicy.deleteMany();

  console.log("✅ Existing data cleared.");
  console.log("");

  // ----------------------------------------------------------
  // 2. CREATE DEFAULT GUARDRAIL POLICY
  // ----------------------------------------------------------

  console.log("🛡️ Creating guardrail policy...");

  await prisma.guardrailPolicy.create({
    data: {
      name: "DEFAULT_MERCHANT_POLICY",

      // Maximum automatic payment retries
      maxRetries: 2,

      // Maximum discount/incentive allowed
      maxIncentivePercent: 5,

      // Maximum transaction value that agent
      // can recover automatically
      maxAutoRecovery: 10000,

      // Maximum number of customer contacts
      maxCustomerContacts: 2,

      // Recovery window
      recoveryWindowHours: 24,

      // Human approval required above this amount
      requireHumanAbove: 10000,

      enabled: true,
    },
  });

  console.log("✅ Default guardrail policy created.");
  console.log("");

  // ----------------------------------------------------------
  // 3. DATASET SIZE
  // ----------------------------------------------------------

  const CUSTOMER_COUNT = 1000;

  const TRANSACTION_COUNT = 10000;

  // ----------------------------------------------------------
  // 4. CREATE CUSTOMERS
  // ----------------------------------------------------------

  console.log("👥 Generating customers...");
  console.log("");

  const customers = [];

  for (let i = 0; i < CUSTOMER_COUNT; i++) {
    const segment = randomItem(
      CUSTOMER_SEGMENTS
    );

    // Each customer has between 3 and 30 transactions
    const totalTransactions = randomInt(3, 30);

    // Default success rate
    let successRate = 0.7;

    // High-value customers usually have
    // better payment history
    if (segment === "HIGH_VALUE") {
      successRate = 0.9;
    }

    // New customers may have more failures
    if (segment === "NEW") {
      successRate = 0.6;
    }

    // At-risk customers have poor payment history
    if (segment === "AT_RISK") {
      successRate = 0.4;
    }

    const successfulPayments = Math.floor(
      totalTransactions * successRate
    );

    const failedPayments =
      totalTransactions -
      successfulPayments;

    // Approximate lifetime value
    const lifetimeValue =
      successfulPayments *
      randomInt(500, 5000);

    const customer =
      await prisma.customer.create({
        data: {
          externalId: `CUS-${String(
            i + 1
          ).padStart(6, "0")}`,

          name: `Customer ${i + 1}`,

          email: `customer${
            i + 1
          }@example.com`,

          phone: `90000${String(i).padStart(
            5,
            "0"
          )}`,

          lifetimeValue,

          totalTransactions,

          successfulPayments,

          failedPayments,

          abandonedCheckouts: randomInt(
            0,
            5
          ),

          preferredMethod:
            randomItem(
              PAYMENT_METHODS
            ),

          customerSegment: segment,
        },
      });

    customers.push(customer);

    // Progress
    if ((i + 1) % 100 === 0) {
      console.log(
        `   👤 Customers: ${i + 1}/${CUSTOMER_COUNT}`
      );
    }
  }

  console.log("");
  console.log(
    `✅ Created ${customers.length} customers.`
  );
  console.log("");

  // ----------------------------------------------------------
  // 5. CREATE TRANSACTIONS
  // ----------------------------------------------------------

  console.log("💳 Generating transactions...");
  console.log("");

  let successCount = 0;

  let failedCount = 0;

  let abandonedCount = 0;

  let expiredCount = 0;

  let atRiskCount = 0;

  let criticalCount = 0;

  let highCount = 0;

  let mediumCount = 0;

  let lowCount = 0;

  let totalRevenueAtRisk = 0;

  for (
    let i = 0;
    i < TRANSACTION_COUNT;
    i++
  ) {
    // Select random customer
    const customer =
      randomItem(customers);

    // Generate amount
    const amount =
      randomAmount();

    // --------------------------------------------------------
    // TRANSACTION STATUS
    // --------------------------------------------------------

    const roll = Math.random();

    let status: TransactionStatus;

    if (roll < 0.65) {
      status =
        TransactionStatus.SUCCESS;

      successCount++;
    } else if (roll < 0.85) {
      status =
        TransactionStatus.FAILED;

      failedCount++;
    } else if (roll < 0.97) {
      status =
        TransactionStatus.ABANDONED;

      abandonedCount++;
    } else {
      status =
        TransactionStatus.EXPIRED;

      expiredCount++;
    }

    // --------------------------------------------------------
    // FAILURE / ABANDONMENT
    // --------------------------------------------------------

    const failed =
      status ===
      TransactionStatus.FAILED;

    const abandoned =
      status ===
      TransactionStatus.ABANDONED;

    // --------------------------------------------------------
    // RETRIES
    // --------------------------------------------------------

    const retryCount =
      failed || abandoned
        ? randomInt(0, 3)
        : 0;

    // --------------------------------------------------------
    // FAILURE REASON
    // --------------------------------------------------------

    const failureReason =
      failed || abandoned
        ? randomItem(
            FAILURE_REASONS
          )
        : null;

    // --------------------------------------------------------
    // CHECKOUT DURATION
    // --------------------------------------------------------

    const checkoutDuration =
      randomInt(10, 600);

    // --------------------------------------------------------
    // REVENUE AT RISK
    // --------------------------------------------------------

    const revenueAtRisk =
      failed || abandoned
        ? amount
        : 0;

    totalRevenueAtRisk +=
      revenueAtRisk;

    // --------------------------------------------------------
    // RISK LEVEL
    // --------------------------------------------------------

    const riskLevel =
      calculateRisk(
        status,
        amount,
        retryCount,
        customer.failedPayments,
        abandoned
      );

    // Count risk levels
    if (
      riskLevel ===
      RiskLevel.CRITICAL
    ) {
      criticalCount++;
      atRiskCount++;
    } else if (
      riskLevel ===
      RiskLevel.HIGH
    ) {
      highCount++;
      atRiskCount++;
    } else if (
      riskLevel ===
      RiskLevel.MEDIUM
    ) {
      mediumCount++;
    } else {
      lowCount++;
    }

    // --------------------------------------------------------
    // CREATE TRANSACTION
    // --------------------------------------------------------

    await prisma.transaction.create({
      data: {
        externalId: `TXN-${String(
          i + 1
        ).padStart(8, "0")}`,

        customerId: customer.id,

        amount,

        currency: "INR",

        status,

        failureReason,

        paymentMethod:
          randomItem(
            PAYMENT_METHODS
          ),

        retryCount,

        checkoutDuration,

        abandoned,

        // AI model will calculate this later
        recoveryProbability: null,

        revenueAtRisk,
        initialRevenueAtRisk: revenueAtRisk,

        riskLevel,
      },
    });

    // Progress every 1000 records
    if ((i + 1) % 1000 === 0) {
      console.log(
        `   💳 Transactions: ${i + 1}/${TRANSACTION_COUNT}`
      );
    }
  }

  // ----------------------------------------------------------
  // 6. FINAL STATISTICS
  // ----------------------------------------------------------

  console.log("");
  console.log(
    "=============================================="
  );

  console.log(
    "✅ REVIVEAI DATASET GENERATION COMPLETE"
  );

  console.log(
    "=============================================="
  );

  console.log("");

  console.log(
    `👥 Customers           : ${CUSTOMER_COUNT}`
  );

  console.log(
    `💳 Transactions        : ${TRANSACTION_COUNT}`
  );

  console.log("");

  console.log("📊 Transaction Status");

  console.log(
    `   ✅ Success          : ${successCount}`
  );

  console.log(
    `   ❌ Failed           : ${failedCount}`
  );

  console.log(
    `   🛒 Abandoned       : ${abandonedCount}`
  );

  console.log(
    `   ⏱️ Expired          : ${expiredCount}`
  );

  console.log("");

  console.log("🚨 Risk Distribution");

  console.log(
    `   🔴 Critical         : ${criticalCount}`
  );

  console.log(
    `   🟠 High             : ${highCount}`
  );

  console.log(
    `   🟡 Medium           : ${mediumCount}`
  );

  console.log(
    `   🟢 Low              : ${lowCount}`
  );

  console.log("");

  console.log(
    `⚠️ High/Critical Risk : ${atRiskCount}`
  );

  console.log(
    `💰 Revenue At Risk     : ₹${totalRevenueAtRisk.toLocaleString(
      "en-IN"
    )}`
  );

  console.log("");

  console.log(
    "🛡️ Guardrail Policy    : DEFAULT_MERCHANT_POLICY"
  );

  console.log("");

  console.log(
    "=============================================="
  );

  console.log(
    "🎉 ReviveAI database is ready!"
  );

  console.log(
    "=============================================="
  );

  console.log("");
}

// ============================================================
// RUN SEED
// ============================================================

main()
  .catch((error) => {
    console.error("");
    console.error(
      "❌ SEED FAILED"
    );
    console.error(
      "=============================================="
    );
    console.error(error);
    console.error(
      "=============================================="
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });