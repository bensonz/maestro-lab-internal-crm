-- AlterTable
ALTER TABLE "ClientDraft" ADD COLUMN     "currentAddress" TEXT,
ADD COLUMN     "differentAddressDuration" TEXT,
ADD COLUMN     "differentAddressProof" TEXT,
ADD COLUMN     "livesAtDifferentAddress" BOOLEAN NOT NULL DEFAULT false;
