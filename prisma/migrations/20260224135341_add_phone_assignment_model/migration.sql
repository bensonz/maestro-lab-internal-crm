-- CreateEnum
CREATE TYPE "PhoneAssignmentStatus" AS ENUM ('SIGNED_OUT', 'RETURNED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventType" ADD VALUE 'DEVICE_SIGNED_OUT';
ALTER TYPE "EventType" ADD VALUE 'DEVICE_RETURNED';

-- CreateTable
CREATE TABLE "PhoneAssignment" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "carrier" TEXT,
    "deviceId" TEXT,
    "notes" TEXT,
    "clientDraftId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "signedOutById" TEXT NOT NULL,
    "signedOutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueBackAt" TIMESTAMP(3) NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "status" "PhoneAssignmentStatus" NOT NULL DEFAULT 'SIGNED_OUT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhoneAssignment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PhoneAssignment" ADD CONSTRAINT "PhoneAssignment_clientDraftId_fkey" FOREIGN KEY ("clientDraftId") REFERENCES "ClientDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneAssignment" ADD CONSTRAINT "PhoneAssignment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneAssignment" ADD CONSTRAINT "PhoneAssignment_signedOutById_fkey" FOREIGN KEY ("signedOutById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
