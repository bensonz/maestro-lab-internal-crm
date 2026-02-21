-- CreateEnum
CREATE TYPE "ClientDraftStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventType" ADD VALUE 'CLIENT_DRAFT_CREATED';
ALTER TYPE "EventType" ADD VALUE 'CLIENT_DRAFT_SUBMITTED';

-- CreateTable
CREATE TABLE "ClientDraft" (
    "id" TEXT NOT NULL,
    "status" "ClientDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "step" INTEGER NOT NULL DEFAULT 1,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "idDocument" TEXT,
    "idNumber" TEXT,
    "idExpiry" TIMESTAMP(3),
    "assignedGmail" TEXT,
    "betmgmCheckPassed" BOOLEAN,
    "ssnDocument" TEXT,
    "secondAddress" TEXT,
    "hasCriminalRecord" BOOLEAN,
    "criminalRecordNotes" TEXT,
    "bankingHistory" TEXT,
    "paypalHistory" TEXT,
    "sportsbookHistory" TEXT,
    "platformData" JSONB,
    "contractDocument" TEXT,
    "paypalPreviouslyUsed" BOOLEAN NOT NULL DEFAULT false,
    "addressMismatch" BOOLEAN NOT NULL DEFAULT false,
    "debankedHistory" BOOLEAN NOT NULL DEFAULT false,
    "debankedBank" TEXT,
    "undisclosedInfo" BOOLEAN NOT NULL DEFAULT false,
    "closerId" TEXT NOT NULL,
    "resultClientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientDraft_resultClientId_key" ON "ClientDraft"("resultClientId");

-- AddForeignKey
ALTER TABLE "ClientDraft" ADD CONSTRAINT "ClientDraft_closerId_fkey" FOREIGN KEY ("closerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientDraft" ADD CONSTRAINT "ClientDraft_resultClientId_fkey" FOREIGN KEY ("resultClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
