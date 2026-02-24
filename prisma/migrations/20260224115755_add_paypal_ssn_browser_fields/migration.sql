-- AlterTable
ALTER TABLE "ClientDraft" ADD COLUMN     "paypalBrowserVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paypalSsnLinked" BOOLEAN NOT NULL DEFAULT false;
