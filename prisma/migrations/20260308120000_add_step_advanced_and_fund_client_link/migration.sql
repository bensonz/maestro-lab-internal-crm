-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'STEP_ADVANCED';

-- AlterTable
ALTER TABLE "FundAllocation" ADD COLUMN "clientRecordId" TEXT;

-- AddForeignKey
ALTER TABLE "FundAllocation" ADD CONSTRAINT "FundAllocation_clientRecordId_fkey" FOREIGN KEY ("clientRecordId") REFERENCES "ClientRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
