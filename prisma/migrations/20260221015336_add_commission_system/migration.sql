-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BonusPoolStatus" AS ENUM ('PENDING', 'DISTRIBUTED');

-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "AllocationType" AS ENUM ('DIRECT', 'STAR_SLICE', 'BACKFILL');

-- CreateEnum
CREATE TYPE "LeadershipTier" AS ENUM ('NONE', 'ED', 'SED', 'MD', 'CMO');

-- CreateEnum
CREATE TYPE "QuarterlySettlementStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventType" ADD VALUE 'CLIENT_APPROVED';
ALTER TYPE "EventType" ADD VALUE 'BONUS_POOL_CREATED';
ALTER TYPE "EventType" ADD VALUE 'BONUS_POOL_DISTRIBUTED';
ALTER TYPE "EventType" ADD VALUE 'STAR_LEVEL_CHANGED';
ALTER TYPE "EventType" ADD VALUE 'LEADERSHIP_PROMOTED';
ALTER TYPE "EventType" ADD VALUE 'ALLOCATION_PAID';
ALTER TYPE "EventType" ADD VALUE 'QUARTERLY_SETTLEMENT_CREATED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "leadershipTier" "LeadershipTier" NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'PENDING',
    "closerId" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonusPool" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "closerId" TEXT NOT NULL,
    "closerStarLevel" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL DEFAULT 400,
    "directAmount" INTEGER NOT NULL DEFAULT 200,
    "starPoolAmount" INTEGER NOT NULL DEFAULT 200,
    "distributedSlices" INTEGER NOT NULL DEFAULT 0,
    "recycledSlices" INTEGER NOT NULL DEFAULT 0,
    "status" "BonusPoolStatus" NOT NULL DEFAULT 'PENDING',
    "distributedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BonusPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonusAllocation" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentStarLevel" INTEGER NOT NULL,
    "type" "AllocationType" NOT NULL,
    "slices" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "AllocationStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paidById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BonusAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionLog" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "previousStarLevel" INTEGER NOT NULL,
    "newStarLevel" INTEGER NOT NULL,
    "previousLeadershipTier" "LeadershipTier" NOT NULL DEFAULT 'NONE',
    "newLeadershipTier" "LeadershipTier" NOT NULL DEFAULT 'NONE',
    "promotionBonus" INTEGER,
    "approvedClientCount" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuarterlySettlement" (
    "id" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "leaderTier" "LeadershipTier" NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "teamRevenue" DECIMAL(12,2) NOT NULL,
    "commissionPercent" INTEGER NOT NULL,
    "commissionAmount" DECIMAL(12,2) NOT NULL,
    "teamAgentIds" TEXT[],
    "metadata" JSONB,
    "status" "QuarterlySettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuarterlySettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BonusPool_clientId_key" ON "BonusPool"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "QuarterlySettlement_leaderId_year_quarter_key" ON "QuarterlySettlement"("leaderId", "year", "quarter");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_closerId_fkey" FOREIGN KEY ("closerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusPool" ADD CONSTRAINT "BonusPool_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusPool" ADD CONSTRAINT "BonusPool_closerId_fkey" FOREIGN KEY ("closerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusAllocation" ADD CONSTRAINT "BonusAllocation_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "BonusPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusAllocation" ADD CONSTRAINT "BonusAllocation_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusAllocation" ADD CONSTRAINT "BonusAllocation_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionLog" ADD CONSTRAINT "PromotionLog_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterlySettlement" ADD CONSTRAINT "QuarterlySettlement_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
