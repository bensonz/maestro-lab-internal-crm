-- AlterTable
ALTER TABLE "ClientDraft" ADD COLUMN     "agentConfidenceLevel" TEXT,
ADD COLUMN     "clientHidingInfo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "clientHidingInfoNotes" TEXT;
