-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'FUND_ALLOCATED';

-- CreateTable
CREATE TABLE "FundAllocation" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "platform" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundAllocation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FundAllocation" ADD CONSTRAINT "FundAllocation_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
