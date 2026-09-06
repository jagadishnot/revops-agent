/*
  Warnings:

  - You are about to drop the `Test` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'ABANDONED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RecoveryStatus" AS ENUM ('AT_RISK', 'ANALYZING', 'ACTION_REQUIRED', 'IN_PROGRESS', 'RECOVERED', 'FAILED', 'STOPPED');

-- CreateEnum
CREATE TYPE "RecoveryActionType" AS ENUM ('RETRY_PAYMENT', 'PAYMENT_LINK', 'SEND_EMAIL', 'SEND_SMS', 'SEND_WHATSAPP', 'OFFER_INCENTIVE', 'HUMAN_ESCALATION', 'STOP');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- DropTable
DROP TABLE "Test";

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "lifetimeValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTransactions" INTEGER NOT NULL DEFAULT 0,
    "successfulPayments" INTEGER NOT NULL DEFAULT 0,
    "failedPayments" INTEGER NOT NULL DEFAULT 0,
    "abandonedCheckouts" INTEGER NOT NULL DEFAULT 0,
    "preferredMethod" TEXT,
    "customerSegment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "TransactionStatus" NOT NULL,
    "failureReason" TEXT,
    "paymentMethod" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "checkoutDuration" INTEGER,
    "abandoned" BOOLEAN NOT NULL DEFAULT false,
    "recoveryProbability" DOUBLE PRECISION,
    "revenueAtRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskLevel" "RiskLevel",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryCase" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "status" "RecoveryStatus" NOT NULL,
    "diagnosis" TEXT,
    "predictedProbability" DOUBLE PRECISION,
    "recommendedAction" "RecoveryActionType",
    "expectedRecovery" DOUBLE PRECISION,
    "actualRecovery" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecoveryCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryAction" (
    "id" TEXT NOT NULL,
    "recoveryCaseId" TEXT NOT NULL,
    "type" "RecoveryActionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "expectedValue" DOUBLE PRECISION,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecoveryAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentDecision" (
    "id" TEXT NOT NULL,
    "recoveryCaseId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "expectedGain" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardrailPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxRetries" INTEGER NOT NULL DEFAULT 2,
    "maxIncentivePercent" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "maxAutoRecovery" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "maxCustomerContacts" INTEGER NOT NULL DEFAULT 2,
    "recoveryWindowHours" INTEGER NOT NULL DEFAULT 24,
    "requireHumanAbove" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuardrailPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_externalId_key" ON "Customer"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_externalId_key" ON "Transaction"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "RecoveryCase_transactionId_key" ON "RecoveryCase"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "GuardrailPolicy_name_key" ON "GuardrailPolicy"("name");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryCase" ADD CONSTRAINT "RecoveryCase_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryAction" ADD CONSTRAINT "RecoveryAction_recoveryCaseId_fkey" FOREIGN KEY ("recoveryCaseId") REFERENCES "RecoveryCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentDecision" ADD CONSTRAINT "AgentDecision_recoveryCaseId_fkey" FOREIGN KEY ("recoveryCaseId") REFERENCES "RecoveryCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
