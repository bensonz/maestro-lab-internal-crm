-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('AGENT', 'BACKOFFICE', 'ADMIN', 'FINANCE');

-- CreateEnum
CREATE TYPE "IntakeStatus" AS ENUM ('PENDING', 'PHONE_ISSUED', 'IN_EXECUTION', 'NEEDS_MORE_INFO', 'PENDING_EXTERNAL', 'EXECUTION_DELAYED', 'INACTIVE', 'READY_FOR_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PlatformType" AS ENUM ('BANK', 'PAYPAL', 'EDGEBOOST', 'SPORTSBOOK');

-- CreateEnum
CREATE TYPE "PlatformStatus" AS ENUM ('NOT_STARTED', 'PENDING_UPLOAD', 'PENDING_REVIEW', 'NEEDS_MORE_INFO', 'PENDING_EXTERNAL', 'VERIFIED', 'REJECTED', 'LIMITED');

-- CreateEnum
CREATE TYPE "ToDoType" AS ENUM ('EXECUTION', 'UPLOAD_SCREENSHOT', 'PROVIDE_INFO', 'PAYMENT', 'PHONE_SIGNOUT', 'PHONE_RETURN', 'VERIFICATION');

-- CreateEnum
CREATE TYPE "ToDoStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('APPLICATION_SUBMITTED', 'PHONE_ISSUED', 'PHONE_RETURNED', 'PLATFORM_UPLOAD', 'PLATFORM_STATUS_CHANGE', 'TODO_CREATED', 'TODO_COMPLETED', 'STATUS_CHANGE', 'DEADLINE_EXTENDED', 'DEADLINE_MISSED', 'APPROVAL', 'REJECTION', 'COMMENT', 'KPI_IMPACT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "phone" TEXT,
    "avatar" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Client_intakeStatus_idx" ON "Client"("intakeStatus");

-- CreateIndex
CREATE INDEX "Client_agentId_idx" ON "Client"("agentId");

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
CREATE INDEX "EventLog_clientId_idx" ON "EventLog"("clientId");

-- CreateIndex
CREATE INDEX "EventLog_userId_idx" ON "EventLog"("userId");

-- CreateIndex
CREATE INDEX "EventLog_eventType_idx" ON "EventLog"("eventType");

-- CreateIndex
CREATE INDEX "EventLog_createdAt_idx" ON "EventLog"("createdAt");

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

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "PhoneAssignment" ADD CONSTRAINT "PhoneAssignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneAssignment" ADD CONSTRAINT "PhoneAssignment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMetrics" ADD CONSTRAINT "AgentMetrics_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Earning" ADD CONSTRAINT "Earning_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
