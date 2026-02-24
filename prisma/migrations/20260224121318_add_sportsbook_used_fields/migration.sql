-- AlterTable
ALTER TABLE "ClientDraft" ADD COLUMN     "sportsbookStatuses" TEXT,
ADD COLUMN     "sportsbookUsedBefore" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sportsbookUsedList" TEXT;
