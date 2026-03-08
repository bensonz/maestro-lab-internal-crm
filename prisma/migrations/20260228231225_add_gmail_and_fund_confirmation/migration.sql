-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventType" ADD VALUE 'GMAIL_SYNCED';
ALTER TYPE "EventType" ADD VALUE 'EMAIL_TODO_CREATED';
ALTER TYPE "EventType" ADD VALUE 'FUND_CONFIRMED';
ALTER TYPE "EventType" ADD VALUE 'FUND_DISCREPANCY_FLAGGED';

-- DropForeignKey
ALTER TABLE "Todo" DROP CONSTRAINT "Todo_clientDraftId_fkey";

-- AlterTable
ALTER TABLE "FundAllocation" ADD COLUMN     "confirmationStatus" TEXT NOT NULL DEFAULT 'UNCONFIRMED',
ADD COLUMN     "confirmedAmount" DECIMAL(12,2),
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedById" TEXT,
ADD COLUMN     "discrepancyNotes" TEXT,
ADD COLUMN     "emailConfirmationId" TEXT;

-- AlterTable
ALTER TABLE "Todo" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "processedEmailId" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'MANUAL',
ALTER COLUMN "clientDraftId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "GmailIntegration" (
    "id" TEXT NOT NULL,
    "inboxEmail" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "historyId" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GmailIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedEmail" (
    "id" TEXT NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "threadId" TEXT,
    "from" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "snippet" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "detectionType" TEXT NOT NULL,
    "detectionData" JSONB,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "todoId" TEXT,
    "fundAllocationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GmailIntegration_inboxEmail_key" ON "GmailIntegration"("inboxEmail");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedEmail_gmailMessageId_key" ON "ProcessedEmail"("gmailMessageId");

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_clientDraftId_fkey" FOREIGN KEY ("clientDraftId") REFERENCES "ClientDraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundAllocation" ADD CONSTRAINT "FundAllocation_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
