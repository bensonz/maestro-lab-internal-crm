-- AlterEnum
ALTER TYPE "PlatformStatus" ADD VALUE 'RETRY_PENDING';

-- AlterTable
ALTER TABLE "ClientPlatform" ADD COLUMN     "agentResult" TEXT,
ADD COLUMN     "retryAfter" TIMESTAMP(3),
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0;
