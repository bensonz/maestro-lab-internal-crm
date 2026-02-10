-- AlterTable
ALTER TABLE "Client" ADD COLUMN "gmailAccount" TEXT;
ALTER TABLE "Client" ADD COLUMN "gmailPassword" TEXT;
ALTER TABLE "Client" ADD COLUMN "prequalCompleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ApplicationDraft" ADD COLUMN "clientId" TEXT;
ALTER TABLE "ApplicationDraft" ADD COLUMN "phase" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "ApplicationDraft_clientId_idx" ON "ApplicationDraft"("clientId");
