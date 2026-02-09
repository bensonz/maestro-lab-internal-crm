-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('AGENT', 'BACKOFFICE', 'ADMIN', 'FINANCE');

-- CreateEnum
CREATE TYPE "IntakeStatus" AS ENUM ('PENDING', 'PHONE_ISSUED', 'IN_EXECUTION', 'NEEDS_MORE_INFO', 'PENDING_EXTERNAL', 'EXECUTION_DELAYED', 'INACTIVE', 'READY_FOR_APPROVAL', 'APPROVED', 'REJECTED', 'PARTNERSHIP_ENDED');

-- CreateEnum
CREATE TYPE "PlatformType" AS ENUM ('DRAFTKINGS', 'FANDUEL', 'BETMGM', 'CAESARS', 'FANATICS', 'BALLYBET', 'BETRIVERS', 'BET365', 'BANK', 'PAYPAL', 'EDGEBOOST');

-- CreateEnum
CREATE TYPE "PlatformStatus" AS ENUM ('NOT_STARTED', 'PENDING_UPLOAD', 'PENDING_REVIEW', 'NEEDS_MORE_INFO', 'PENDING_EXTERNAL', 'VERIFIED', 'REJECTED', 'LIMITED');

-- CreateEnum
CREATE TYPE "ToDoType" AS ENUM ('EXECUTION', 'UPLOAD_SCREENSHOT', 'PROVIDE_INFO', 'PAYMENT', 'PHONE_SIGNOUT', 'PHONE_RETURN', 'VERIFICATION');

-- CreateEnum
CREATE TYPE "ToDoStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExtensionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('APPLICATION_SUBMITTED', 'PHONE_ISSUED', 'PHONE_RETURNED', 'PLATFORM_UPLOAD', 'PLATFORM_STATUS_CHANGE', 'TODO_CREATED', 'TODO_COMPLETED', 'STATUS_CHANGE', 'DEADLINE_EXTENDED', 'DEADLINE_MISSED', 'APPROVAL', 'REJECTION', 'COMMENT', 'KPI_IMPACT', 'LOGIN', 'LOGOUT', 'TRANSACTION_CREATED', 'SETTLEMENT_CREATED', 'USER_CREATED', 'USER_UPDATED', 'USER_DEACTIVATED', 'CONFIG_CHANGED', 'EXPORT');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'INTERNAL_TRANSFER', 'COMMISSION_PAYOUT', 'FEE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING_REVIEW', 'CONFIRMED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "phone" TEXT,
    "avatar" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "supervisorId" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'rookie',
    "starLevel" INTEGER NOT NULL DEFAULT 0,
    "gender" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "idNumber" TEXT,
    "idExpiry" TIMESTAMP(3),
    "idDocument" TEXT,
    "ssn" TEXT,
    "citizenship" TEXT,
    "personalEmail" TEXT,
    "personalPhone" TEXT,
    "companyPhone" TEXT,
    "carrier" TEXT,
    "zelle" TEXT,
    "address" TEXT,
    "loginAccount" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "idNumber" TEXT,
    "idDocument" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT,
    "questionnaire" TEXT,
    "applicationNotes" TEXT,
    "intakeStatus" "IntakeStatus" NOT NULL DEFAULT 'PENDING',
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "complianceReview" TEXT,
    "complianceStatus" TEXT,
    "backgroundCheck" BOOLEAN NOT NULL DEFAULT false,
    "executionDeadline" TIMESTAMP(3),
    "deadlineExtensions" INTEGER NOT NULL DEFAULT 0,
    "agentId" TEXT NOT NULL,
    "partnerId" TEXT,
    "closedAt" TIMESTAMP(3),
    "closureReason" TEXT,
    "closureProof" TEXT[],
    "closedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPlatform" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "platformType" "PlatformType" NOT NULL,
    "status" "PlatformStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "username" TEXT,
    "accountId" TEXT,
    "screenshots" TEXT[],
    "reviewNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "externalId" TEXT,
    "externalStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientPlatform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToDo" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ToDoType" NOT NULL,
    "status" "ToDoStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "stepNumber" INTEGER,
    "platformType" "PlatformType",
    "extensionsUsed" INTEGER NOT NULL DEFAULT 0,
    "maxExtensions" INTEGER NOT NULL DEFAULT 3,
    "screenshots" TEXT[],
    "clientId" TEXT,
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToDo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventLog" (
    "id" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "description" TEXT NOT NULL,
    "clientId" TEXT,
    "userId" TEXT,
    "metadata" JSONB,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "eventLogId" TEXT,
    "clientId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneAssignment" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "deviceId" TEXT,
    "clientId" TEXT,
    "agentId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "signedOutAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhoneAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentMetrics" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "totalClients" INTEGER NOT NULL DEFAULT 0,
    "approvedClients" INTEGER NOT NULL DEFAULT 0,
    "rejectedClients" INTEGER NOT NULL DEFAULT 0,
    "delayCount" INTEGER NOT NULL DEFAULT 0,
    "extensionCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "delayRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Earning" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Earning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundAllocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationDraft" (
    "id" TEXT NOT NULL,
    "formData" JSONB NOT NULL,
    "agentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtensionRequest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "status" "ExtensionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "requestedDays" INTEGER NOT NULL DEFAULT 3,
    "currentDeadline" TIMESTAMP(3) NOT NULL,
    "newDeadline" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtensionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundMovement" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "flowType" TEXT NOT NULL,
    "fromClientId" TEXT,
    "fromPlatform" TEXT NOT NULL,
    "toClientId" TEXT,
    "toPlatform" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "fee" DECIMAL(10,2),
    "method" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "notes" TEXT,
    "settlementStatus" "SettlementStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonusPool" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "closerId" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 400,
    "directAmount" DECIMAL(10,2) NOT NULL DEFAULT 200,
    "starPoolAmount" DECIMAL(10,2) NOT NULL DEFAULT 200,
    "totalSlices" INTEGER NOT NULL DEFAULT 4,
    "sliceValue" DECIMAL(10,2) NOT NULL DEFAULT 50,
    "distributedSlices" INTEGER NOT NULL DEFAULT 0,
    "recycledSlices" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "hierarchySnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BonusPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonusAllocation" (
    "id" TEXT NOT NULL,
    "bonusPoolId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "slices" INTEGER NOT NULL DEFAULT 0,
    "amount" DECIMAL(10,2) NOT NULL,
    "starLevelAtTime" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3),
    "payoutRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BonusAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadershipPayout" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "bonusAmount" DECIMAL(10,2),
    "sharePercent" DECIMAL(5,2),
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "teamRevenue" DECIMAL(12,2),
    "payoutAmount" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadershipPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'completed',
    "clientId" TEXT,
    "platformType" "PlatformType",
    "fundMovementId" TEXT,
    "bonusPoolId" TEXT,
    "description" TEXT,
    "reference" TEXT,
    "documentUrl" TEXT,
    "recordedById" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "company" TEXT,
    "type" TEXT NOT NULL DEFAULT 'referral',
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfitShareRule" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "splitType" TEXT NOT NULL DEFAULT 'percentage',
    "partnerPercent" DECIMAL(5,2),
    "companyPercent" DECIMAL(5,2),
    "fixedAmount" DECIMAL(10,2),
    "appliesTo" TEXT NOT NULL DEFAULT 'all',
    "platformType" "PlatformType",
    "minAmount" DECIMAL(10,2),
    "maxAmount" DECIMAL(10,2),
    "feePercent" DECIMAL(5,2),
    "feeFixed" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'active',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfitShareRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfitShareDetail" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "transactionId" TEXT,
    "fundMovementId" TEXT,
    "grossAmount" DECIMAL(10,2) NOT NULL,
    "feeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(10,2) NOT NULL,
    "partnerAmount" DECIMAL(10,2) NOT NULL,
    "companyAmount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfitShareDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_supervisorId_idx" ON "User"("supervisorId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Client_intakeStatus_idx" ON "Client"("intakeStatus");

-- CreateIndex
CREATE INDEX "Client_agentId_idx" ON "Client"("agentId");

-- CreateIndex
CREATE INDEX "Client_partnerId_idx" ON "Client"("partnerId");

-- CreateIndex
CREATE INDEX "Client_createdAt_idx" ON "Client"("createdAt");

-- CreateIndex
CREATE INDEX "ClientPlatform_status_idx" ON "ClientPlatform"("status");

-- CreateIndex
CREATE INDEX "ClientPlatform_platformType_idx" ON "ClientPlatform"("platformType");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPlatform_clientId_platformType_key" ON "ClientPlatform"("clientId", "platformType");

-- CreateIndex
CREATE INDEX "ToDo_status_idx" ON "ToDo"("status");

-- CreateIndex
CREATE INDEX "ToDo_type_idx" ON "ToDo"("type");

-- CreateIndex
CREATE INDEX "ToDo_assignedToId_idx" ON "ToDo"("assignedToId");

-- CreateIndex
CREATE INDEX "ToDo_clientId_idx" ON "ToDo"("clientId");

-- CreateIndex
CREATE INDEX "ToDo_dueDate_idx" ON "ToDo"("dueDate");

-- CreateIndex
CREATE INDEX "ToDo_platformType_idx" ON "ToDo"("platformType");

-- CreateIndex
CREATE INDEX "EventLog_clientId_idx" ON "EventLog"("clientId");

-- CreateIndex
CREATE INDEX "EventLog_userId_idx" ON "EventLog"("userId");

-- CreateIndex
CREATE INDEX "EventLog_eventType_idx" ON "EventLog"("eventType");

-- CreateIndex
CREATE INDEX "EventLog_createdAt_idx" ON "EventLog"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_eventLogId_idx" ON "Notification"("eventLogId");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneAssignment_clientId_key" ON "PhoneAssignment"("clientId");

-- CreateIndex
CREATE INDEX "PhoneAssignment_phoneNumber_idx" ON "PhoneAssignment"("phoneNumber");

-- CreateIndex
CREATE INDEX "PhoneAssignment_agentId_idx" ON "PhoneAssignment"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentMetrics_agentId_key" ON "AgentMetrics"("agentId");

-- CreateIndex
CREATE INDEX "AgentMetrics_agentId_idx" ON "AgentMetrics"("agentId");

-- CreateIndex
CREATE INDEX "Earning_clientId_idx" ON "Earning"("clientId");

-- CreateIndex
CREATE INDEX "Earning_status_idx" ON "Earning"("status");

-- CreateIndex
CREATE INDEX "ApplicationDraft_agentId_idx" ON "ApplicationDraft"("agentId");

-- CreateIndex
CREATE INDEX "ExtensionRequest_clientId_idx" ON "ExtensionRequest"("clientId");

-- CreateIndex
CREATE INDEX "ExtensionRequest_status_idx" ON "ExtensionRequest"("status");

-- CreateIndex
CREATE INDEX "ExtensionRequest_requestedById_idx" ON "ExtensionRequest"("requestedById");

-- CreateIndex
CREATE INDEX "FundMovement_fromClientId_idx" ON "FundMovement"("fromClientId");

-- CreateIndex
CREATE INDEX "FundMovement_toClientId_idx" ON "FundMovement"("toClientId");

-- CreateIndex
CREATE INDEX "FundMovement_recordedById_idx" ON "FundMovement"("recordedById");

-- CreateIndex
CREATE INDEX "FundMovement_settlementStatus_idx" ON "FundMovement"("settlementStatus");

-- CreateIndex
CREATE INDEX "FundMovement_createdAt_idx" ON "FundMovement"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BonusPool_clientId_key" ON "BonusPool"("clientId");

-- CreateIndex
CREATE INDEX "BonusPool_closerId_idx" ON "BonusPool"("closerId");

-- CreateIndex
CREATE INDEX "BonusPool_status_idx" ON "BonusPool"("status");

-- CreateIndex
CREATE INDEX "BonusAllocation_bonusPoolId_idx" ON "BonusAllocation"("bonusPoolId");

-- CreateIndex
CREATE INDEX "BonusAllocation_agentId_idx" ON "BonusAllocation"("agentId");

-- CreateIndex
CREATE INDEX "BonusAllocation_status_idx" ON "BonusAllocation"("status");

-- CreateIndex
CREATE INDEX "LeadershipPayout_agentId_idx" ON "LeadershipPayout"("agentId");

-- CreateIndex
CREATE INDEX "LeadershipPayout_tier_idx" ON "LeadershipPayout"("tier");

-- CreateIndex
CREATE INDEX "LeadershipPayout_status_idx" ON "LeadershipPayout"("status");

-- CreateIndex
CREATE INDEX "Transaction_clientId_idx" ON "Transaction"("clientId");

-- CreateIndex
CREATE INDEX "Transaction_platformType_idx" ON "Transaction"("platformType");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "Transaction_recordedById_idx" ON "Transaction"("recordedById");

-- CreateIndex
CREATE INDEX "Transaction_fundMovementId_idx" ON "Transaction"("fundMovementId");

-- CreateIndex
CREATE INDEX "Partner_status_idx" ON "Partner"("status");

-- CreateIndex
CREATE INDEX "Partner_type_idx" ON "Partner"("type");

-- CreateIndex
CREATE INDEX "ProfitShareRule_partnerId_idx" ON "ProfitShareRule"("partnerId");

-- CreateIndex
CREATE INDEX "ProfitShareRule_status_idx" ON "ProfitShareRule"("status");

-- CreateIndex
CREATE INDEX "ProfitShareRule_appliesTo_idx" ON "ProfitShareRule"("appliesTo");

-- CreateIndex
CREATE INDEX "ProfitShareDetail_partnerId_idx" ON "ProfitShareDetail"("partnerId");

-- CreateIndex
CREATE INDEX "ProfitShareDetail_ruleId_idx" ON "ProfitShareDetail"("ruleId");

-- CreateIndex
CREATE INDEX "ProfitShareDetail_status_idx" ON "ProfitShareDetail"("status");

-- CreateIndex
CREATE INDEX "ProfitShareDetail_createdAt_idx" ON "ProfitShareDetail"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPlatform" ADD CONSTRAINT "ClientPlatform_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToDo" ADD CONSTRAINT "ToDo_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToDo" ADD CONSTRAINT "ToDo_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToDo" ADD CONSTRAINT "ToDo_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_eventLogId_fkey" FOREIGN KEY ("eventLogId") REFERENCES "EventLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneAssignment" ADD CONSTRAINT "PhoneAssignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneAssignment" ADD CONSTRAINT "PhoneAssignment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMetrics" ADD CONSTRAINT "AgentMetrics_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Earning" ADD CONSTRAINT "Earning_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDraft" ADD CONSTRAINT "ApplicationDraft_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtensionRequest" ADD CONSTRAINT "ExtensionRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtensionRequest" ADD CONSTRAINT "ExtensionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtensionRequest" ADD CONSTRAINT "ExtensionRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundMovement" ADD CONSTRAINT "FundMovement_fromClientId_fkey" FOREIGN KEY ("fromClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundMovement" ADD CONSTRAINT "FundMovement_toClientId_fkey" FOREIGN KEY ("toClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundMovement" ADD CONSTRAINT "FundMovement_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundMovement" ADD CONSTRAINT "FundMovement_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusPool" ADD CONSTRAINT "BonusPool_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusPool" ADD CONSTRAINT "BonusPool_closerId_fkey" FOREIGN KEY ("closerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusAllocation" ADD CONSTRAINT "BonusAllocation_bonusPoolId_fkey" FOREIGN KEY ("bonusPoolId") REFERENCES "BonusPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusAllocation" ADD CONSTRAINT "BonusAllocation_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadershipPayout" ADD CONSTRAINT "LeadershipPayout_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitShareRule" ADD CONSTRAINT "ProfitShareRule_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitShareDetail" ADD CONSTRAINT "ProfitShareDetail_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitShareDetail" ADD CONSTRAINT "ProfitShareDetail_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ProfitShareRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
