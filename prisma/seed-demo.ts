/**
 * Demo seed — populates the DB with realistic test data.
 *
 * Run:  npx tsx prisma/seed-demo.ts
 *
 * Creates:
 *   1 admin (gm@test.com)          — kept from original seed
 *   2 backoffice users
 *   10 agents (with hierarchy: 2 seniors supervise 4 juniors each, 2 mid-level standalone)
 *   10 clients at various intake stages
 *   Platform accounts, todos, phone assignments, fund movements, earnings, event logs
 *
 * Idempotent-ish: wipes ALL data first via truncate cascade, so safe to re-run.
 */

import 'dotenv/config'
import { PrismaClient, UserRole, IntakeStatus, PlatformType, PlatformStatus, ToDoType, ToDoStatus, EventType, SettlementStatus, TransactionType } from './generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const hash = (pw: string) => bcrypt.hashSync(pw, 10)
const pw = hash('password123')

// Helpers
const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000)
const daysFromNow = (n: number) => new Date(Date.now() + n * 86400_000)

async function main() {
  console.log('🗑️  Wiping existing data...')
  // Delete in dependency order
  await prisma.bonusAllocation.deleteMany()
  await prisma.leadershipPayout.deleteMany()
  await prisma.bonusPool.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.earning.deleteMany()
  await prisma.fundMovement.deleteMany()
  await prisma.extensionRequest.deleteMany()
  await prisma.phoneAssignment.deleteMany()
  await prisma.toDo.deleteMany()
  await prisma.eventLog.deleteMany()
  await prisma.clientPlatform.deleteMany()
  await prisma.applicationDraft.deleteMany()
  await prisma.agentMetrics.deleteMany()
  await prisma.fundAllocation.deleteMany()
  await prisma.client.deleteMany()
  await prisma.user.deleteMany()

  console.log('👤 Creating users...')

  // ─── Admin ───
  const admin = await prisma.user.create({
    data: { email: 'gm@test.com', passwordHash: pw, name: 'Marcus Chen', role: UserRole.ADMIN, phone: '(555) 100-0001', tier: 'leadership', starLevel: 5 },
  })

  // ─── Backoffice ───
  const bo1 = await prisma.user.create({
    data: { email: 'admin@test.com', passwordHash: pw, name: 'Sarah Mitchell', role: UserRole.BACKOFFICE, phone: '(555) 100-0002' },
  })
  const bo2 = await prisma.user.create({
    data: { email: 'bo2@test.com', passwordHash: pw, name: 'David Park', role: UserRole.BACKOFFICE, phone: '(555) 100-0003' },
  })

  // ─── Agents ───
  // 2 seniors (3★), 2 mid (2★), 6 juniors (0-1★)
  const senior1 = await prisma.user.create({
    data: { email: 'agent@test.com', passwordHash: pw, name: 'John Doe', role: UserRole.AGENT, phone: '(555) 200-0001', tier: 'senior', starLevel: 3 },
  })
  const senior2 = await prisma.user.create({
    data: { email: 'agent2@test.com', passwordHash: pw, name: 'Maria Garcia', role: UserRole.AGENT, phone: '(555) 200-0002', tier: 'senior', starLevel: 3 },
  })
  const mid1 = await prisma.user.create({
    data: { email: 'agent3@test.com', passwordHash: pw, name: 'James Wilson', role: UserRole.AGENT, phone: '(555) 200-0003', tier: 'intermediate', starLevel: 2, supervisorId: senior1.id },
  })
  const mid2 = await prisma.user.create({
    data: { email: 'agent4@test.com', passwordHash: pw, name: 'Emily Zhang', role: UserRole.AGENT, phone: '(555) 200-0004', tier: 'intermediate', starLevel: 2, supervisorId: senior2.id },
  })
  const jr1 = await prisma.user.create({
    data: { email: 'agent5@test.com', passwordHash: pw, name: 'Tyler Brooks', role: UserRole.AGENT, phone: '(555) 200-0005', tier: 'rookie', starLevel: 1, supervisorId: senior1.id },
  })
  const jr2 = await prisma.user.create({
    data: { email: 'agent6@test.com', passwordHash: pw, name: 'Ashley Kim', role: UserRole.AGENT, phone: '(555) 200-0006', tier: 'rookie', starLevel: 1, supervisorId: senior1.id },
  })
  const jr3 = await prisma.user.create({
    data: { email: 'agent7@test.com', passwordHash: pw, name: 'Carlos Rivera', role: UserRole.AGENT, phone: '(555) 200-0007', tier: 'rookie', starLevel: 0, supervisorId: senior2.id },
  })
  const jr4 = await prisma.user.create({
    data: { email: 'agent8@test.com', passwordHash: pw, name: 'Jessica Tran', role: UserRole.AGENT, phone: '(555) 200-0008', tier: 'rookie', starLevel: 0, supervisorId: senior2.id },
  })
  const jr5 = await prisma.user.create({
    data: { email: 'agent9@test.com', passwordHash: pw, name: 'Brandon Lee', role: UserRole.AGENT, phone: '(555) 200-0009', tier: 'rookie', starLevel: 1, supervisorId: mid1.id },
  })
  const jr6 = await prisma.user.create({
    data: { email: 'agent10@test.com', passwordHash: pw, name: 'Nicole Adams', role: UserRole.AGENT, phone: '(555) 200-0010', tier: 'rookie', starLevel: 0, supervisorId: mid2.id },
  })

  const agents = [senior1, senior2, mid1, mid2, jr1, jr2, jr3, jr4, jr5, jr6]

  // ─── Agent Metrics ───
  for (const a of agents) {
    await prisma.agentMetrics.create({
      data: { agentId: a.id, totalClients: 0, approvedClients: 0, rejectedClients: 0, delayCount: 0, extensionCount: 0, successRate: 0, delayRate: 0 },
    })
  }

  console.log('👥 Creating clients at various stages...')

  // Client definitions — each at a different intake stage
  const clientDefs = [
    { first: 'Alice', last: 'Thompson', email: 'alice.t@example.com', phone: '(555) 300-0001', status: IntakeStatus.PENDING, agent: jr1, daysOld: 1 },
    { first: 'Bob', last: 'Martinez', email: 'bob.m@example.com', phone: '(555) 300-0002', status: IntakeStatus.PHONE_ISSUED, agent: jr2, daysOld: 3 },
    { first: 'Claire', last: 'Johnson', email: 'claire.j@example.com', phone: '(555) 300-0003', status: IntakeStatus.IN_EXECUTION, agent: mid1, daysOld: 5 },
    { first: 'Derek', last: 'Nguyen', email: 'derek.n@example.com', phone: '(555) 300-0004', status: IntakeStatus.NEEDS_MORE_INFO, agent: jr3, daysOld: 7 },
    { first: 'Eva', last: 'Patel', email: 'eva.p@example.com', phone: '(555) 300-0005', status: IntakeStatus.PENDING_EXTERNAL, agent: mid2, daysOld: 10 },
    { first: 'Frank', last: 'O\'Brien', email: 'frank.o@example.com', phone: '(555) 300-0006', status: IntakeStatus.EXECUTION_DELAYED, agent: jr4, daysOld: 14 },
    { first: 'Grace', last: 'Kim', email: 'grace.k@example.com', phone: '(555) 300-0007', status: IntakeStatus.READY_FOR_APPROVAL, agent: senior1, daysOld: 12 },
    { first: 'Henry', last: 'Baker', email: 'henry.b@example.com', phone: '(555) 300-0008', status: IntakeStatus.APPROVED, agent: senior1, daysOld: 20 },
    { first: 'Iris', last: 'Santos', email: 'iris.s@example.com', phone: '(555) 300-0009', status: IntakeStatus.APPROVED, agent: senior2, daysOld: 25 },
    { first: 'Jake', last: 'Williams', email: 'jake.w@example.com', phone: '(555) 300-0010', status: IntakeStatus.REJECTED, agent: jr5, daysOld: 18 },
  ]

  const clients = []
  for (const c of clientDefs) {
    const deadline = ([IntakeStatus.IN_EXECUTION, IntakeStatus.EXECUTION_DELAYED, IntakeStatus.PENDING_EXTERNAL] as IntakeStatus[]).includes(c.status)
      ? (c.status === IntakeStatus.EXECUTION_DELAYED ? daysAgo(1) : daysFromNow(2))
      : null

    const client = await prisma.client.create({
      data: {
        firstName: c.first,
        lastName: c.last,
        email: c.email,
        phone: c.phone,
        intakeStatus: c.status,
        statusChangedAt: daysAgo(Math.max(0, c.daysOld - 2)),
        executionDeadline: deadline,
        agentId: c.agent.id,
        createdAt: daysAgo(c.daysOld),
        state: 'CA',
        city: 'Los Angeles',
        zipCode: '90001',
        country: 'US',
      },
    })
    clients.push(client)
  }

  console.log('🎰 Creating platform accounts...')

  // Platform assignments — more platforms for further-along clients
  const platformAssignments: { clientIdx: number; platform: PlatformType; status: PlatformStatus }[] = [
    // Alice (PENDING) — no platforms yet

    // Bob (PHONE_ISSUED) — 2 platforms, not started
    { clientIdx: 1, platform: PlatformType.DRAFTKINGS, status: PlatformStatus.NOT_STARTED },
    { clientIdx: 1, platform: PlatformType.FANDUEL, status: PlatformStatus.NOT_STARTED },

    // Claire (IN_EXECUTION) — 3 platforms, mixed
    { clientIdx: 2, platform: PlatformType.DRAFTKINGS, status: PlatformStatus.VERIFIED },
    { clientIdx: 2, platform: PlatformType.FANDUEL, status: PlatformStatus.PENDING_UPLOAD },
    { clientIdx: 2, platform: PlatformType.BETMGM, status: PlatformStatus.NOT_STARTED },

    // Derek (NEEDS_MORE_INFO) — 2 platforms, needs info
    { clientIdx: 3, platform: PlatformType.CAESARS, status: PlatformStatus.NEEDS_MORE_INFO },
    { clientIdx: 3, platform: PlatformType.DRAFTKINGS, status: PlatformStatus.PENDING_REVIEW },

    // Eva (PENDING_EXTERNAL) — 3 platforms, waiting on external
    { clientIdx: 4, platform: PlatformType.FANDUEL, status: PlatformStatus.VERIFIED },
    { clientIdx: 4, platform: PlatformType.BETMGM, status: PlatformStatus.PENDING_EXTERNAL },
    { clientIdx: 4, platform: PlatformType.BANK, status: PlatformStatus.VERIFIED },

    // Frank (EXECUTION_DELAYED) — 4 platforms, mostly stuck
    { clientIdx: 5, platform: PlatformType.DRAFTKINGS, status: PlatformStatus.VERIFIED },
    { clientIdx: 5, platform: PlatformType.FANDUEL, status: PlatformStatus.PENDING_UPLOAD },
    { clientIdx: 5, platform: PlatformType.BETRIVERS, status: PlatformStatus.NOT_STARTED },
    { clientIdx: 5, platform: PlatformType.PAYPAL, status: PlatformStatus.VERIFIED },

    // Grace (READY_FOR_APPROVAL) — 5 platforms, all verified
    { clientIdx: 6, platform: PlatformType.DRAFTKINGS, status: PlatformStatus.VERIFIED },
    { clientIdx: 6, platform: PlatformType.FANDUEL, status: PlatformStatus.VERIFIED },
    { clientIdx: 6, platform: PlatformType.BETMGM, status: PlatformStatus.VERIFIED },
    { clientIdx: 6, platform: PlatformType.CAESARS, status: PlatformStatus.VERIFIED },
    { clientIdx: 6, platform: PlatformType.BANK, status: PlatformStatus.VERIFIED },

    // Henry (APPROVED) — 6 platforms, all verified + financial
    { clientIdx: 7, platform: PlatformType.DRAFTKINGS, status: PlatformStatus.VERIFIED },
    { clientIdx: 7, platform: PlatformType.FANDUEL, status: PlatformStatus.VERIFIED },
    { clientIdx: 7, platform: PlatformType.BETMGM, status: PlatformStatus.VERIFIED },
    { clientIdx: 7, platform: PlatformType.CAESARS, status: PlatformStatus.VERIFIED },
    { clientIdx: 7, platform: PlatformType.BANK, status: PlatformStatus.VERIFIED },
    { clientIdx: 7, platform: PlatformType.PAYPAL, status: PlatformStatus.VERIFIED },

    // Iris (APPROVED) — 5 platforms, all verified
    { clientIdx: 8, platform: PlatformType.FANDUEL, status: PlatformStatus.VERIFIED },
    { clientIdx: 8, platform: PlatformType.BETMGM, status: PlatformStatus.VERIFIED },
    { clientIdx: 8, platform: PlatformType.FANATICS, status: PlatformStatus.VERIFIED },
    { clientIdx: 8, platform: PlatformType.BANK, status: PlatformStatus.VERIFIED },
    { clientIdx: 8, platform: PlatformType.EDGEBOOST, status: PlatformStatus.VERIFIED },

    // Jake (REJECTED) — 2 platforms, rejected
    { clientIdx: 9, platform: PlatformType.DRAFTKINGS, status: PlatformStatus.REJECTED },
    { clientIdx: 9, platform: PlatformType.FANDUEL, status: PlatformStatus.REJECTED },
  ]

  for (const pa of platformAssignments) {
    await prisma.clientPlatform.create({
      data: {
        clientId: clients[pa.clientIdx].id,
        platformType: pa.platform,
        status: pa.status,
        reviewedBy: pa.status === PlatformStatus.VERIFIED ? bo1.name : undefined,
        reviewedAt: pa.status === PlatformStatus.VERIFIED ? daysAgo(2) : undefined,
      },
    })
  }

  console.log('📋 Creating todos...')

  const todoDefs = [
    // Bob — phone sign-out pending
    { clientIdx: 1, agentIdx: 1, title: 'Sign out of phone', type: ToDoType.PHONE_SIGNOUT, status: ToDoStatus.PENDING, due: daysFromNow(1) },

    // Claire — execution tasks
    { clientIdx: 2, agentIdx: 2, title: 'Execute FanDuel account', type: ToDoType.EXECUTION, status: ToDoStatus.IN_PROGRESS, due: daysFromNow(2) },
    { clientIdx: 2, agentIdx: 2, title: 'Upload DraftKings screenshots', type: ToDoType.UPLOAD_SCREENSHOT, status: ToDoStatus.COMPLETED, due: daysAgo(1) },

    // Derek — needs info
    { clientIdx: 3, agentIdx: 4, title: 'Provide additional ID documentation', type: ToDoType.PROVIDE_INFO, status: ToDoStatus.PENDING, due: daysFromNow(3) },

    // Eva — verification
    { clientIdx: 4, agentIdx: 3, title: 'Verify BetMGM account', type: ToDoType.VERIFICATION, status: ToDoStatus.IN_PROGRESS, due: daysFromNow(1) },

    // Frank — overdue tasks
    { clientIdx: 5, agentIdx: 5, title: 'Execute FanDuel account', type: ToDoType.EXECUTION, status: ToDoStatus.OVERDUE, due: daysAgo(2) },
    { clientIdx: 5, agentIdx: 5, title: 'Upload BetRivers screenshots', type: ToDoType.UPLOAD_SCREENSHOT, status: ToDoStatus.PENDING, due: daysFromNow(1) },

    // Grace — last verification step
    { clientIdx: 6, agentIdx: 0, title: 'Final compliance review', type: ToDoType.VERIFICATION, status: ToDoStatus.COMPLETED, due: daysAgo(1) },

    // Henry — payment todo
    { clientIdx: 7, agentIdx: 0, title: 'Process commission payout', type: ToDoType.PAYMENT, status: ToDoStatus.PENDING, due: daysFromNow(5) },

    // Iris — phone return
    { clientIdx: 8, agentIdx: 1, title: 'Return assigned phone', type: ToDoType.PHONE_RETURN, status: ToDoStatus.PENDING, due: daysFromNow(3) },
  ]

  for (const t of todoDefs) {
    await prisma.toDo.create({
      data: {
        title: t.title,
        type: t.type,
        status: t.status,
        dueDate: t.due,
        completedAt: t.status === ToDoStatus.COMPLETED ? daysAgo(1) : undefined,
        clientId: clients[t.clientIdx].id,
        assignedToId: agents[t.agentIdx].id,
        createdById: bo1.id,
      },
    })
  }

  console.log('📱 Creating phone assignments...')

  // Bob (PHONE_ISSUED) and Frank (EXECUTION_DELAYED) have phones
  await prisma.phoneAssignment.create({
    data: { phoneNumber: '(555) 400-0001', deviceId: 'IPHONE-001', clientId: clients[1].id, agentId: jr2.id, issuedAt: daysAgo(2) },
  })
  await prisma.phoneAssignment.create({
    data: { phoneNumber: '(555) 400-0002', deviceId: 'IPHONE-002', clientId: clients[5].id, agentId: jr4.id, issuedAt: daysAgo(10) },
  })
  // Iris — phone issued and signed out
  await prisma.phoneAssignment.create({
    data: { phoneNumber: '(555) 400-0003', deviceId: 'IPHONE-003', clientId: clients[8].id, agentId: senior2.id, issuedAt: daysAgo(20), signedOutAt: daysAgo(5) },
  })

  console.log('💰 Creating fund movements...')

  // Fund movements for approved clients (Henry, Iris) + Grace (ready for approval)
  const movementDefs = [
    // Henry — multiple movements, mixed settlement statuses
    { fromClient: 7, toClient: 7, fromPlatform: 'Bank', toPlatform: 'DraftKings', amount: 500, status: 'completed', settlement: SettlementStatus.CONFIRMED, reviewer: bo1, daysOld: 15 },
    { fromClient: 7, toClient: 7, fromPlatform: 'Bank', toPlatform: 'FanDuel', amount: 300, status: 'completed', settlement: SettlementStatus.CONFIRMED, reviewer: bo1, daysOld: 14 },
    { fromClient: 7, toClient: 7, fromPlatform: 'DraftKings', toPlatform: 'Bank', amount: 750, status: 'completed', settlement: SettlementStatus.CONFIRMED, reviewer: bo2, daysOld: 10 },
    { fromClient: 7, toClient: 7, fromPlatform: 'Bank', toPlatform: 'BetMGM', amount: 200, status: 'completed', settlement: SettlementStatus.PENDING_REVIEW, reviewer: null, daysOld: 5 },
    { fromClient: 7, toClient: 7, fromPlatform: 'FanDuel', toPlatform: 'Caesars', amount: 150, status: 'completed', settlement: SettlementStatus.PENDING_REVIEW, reviewer: null, daysOld: 3 },
    { fromClient: 7, toClient: 7, fromPlatform: 'BetMGM', toPlatform: 'Bank', amount: 400, status: 'pending', settlement: SettlementStatus.PENDING_REVIEW, reviewer: null, daysOld: 1 },

    // Iris — fewer movements
    { fromClient: 8, toClient: 8, fromPlatform: 'Bank', toPlatform: 'FanDuel', amount: 1000, status: 'completed', settlement: SettlementStatus.CONFIRMED, reviewer: bo1, daysOld: 20 },
    { fromClient: 8, toClient: 8, fromPlatform: 'FanDuel', toPlatform: 'BetMGM', amount: 600, status: 'completed', settlement: SettlementStatus.CONFIRMED, reviewer: bo1, daysOld: 15 },
    { fromClient: 8, toClient: 8, fromPlatform: 'Bank', toPlatform: 'Fanatics', amount: 250, status: 'completed', settlement: SettlementStatus.PENDING_REVIEW, reviewer: null, daysOld: 7 },
    { fromClient: 8, toClient: 8, fromPlatform: 'BetMGM', toPlatform: 'Bank', amount: 800, status: 'completed', settlement: SettlementStatus.REJECTED, reviewer: bo2, daysOld: 4, reviewNotes: 'Amount mismatch — needs resubmission' },

    // Grace — small movements pending review
    { fromClient: 6, toClient: 6, fromPlatform: 'Bank', toPlatform: 'DraftKings', amount: 100, status: 'completed', settlement: SettlementStatus.PENDING_REVIEW, reviewer: null, daysOld: 8 },
    { fromClient: 6, toClient: 6, fromPlatform: 'Bank', toPlatform: 'FanDuel', amount: 100, status: 'completed', settlement: SettlementStatus.PENDING_REVIEW, reviewer: null, daysOld: 6 },

    // Cross-client transfer: Henry → Iris
    { fromClient: 7, toClient: 8, fromPlatform: 'PayPal', toPlatform: 'Bank', amount: 200, status: 'completed', settlement: SettlementStatus.CONFIRMED, reviewer: bo1, daysOld: 12 },
  ]

  for (const m of movementDefs) {
    const isSameClient = m.fromClient === m.toClient
    await prisma.fundMovement.create({
      data: {
        type: m.fromPlatform === 'Bank' || m.toPlatform === 'Bank' ? 'external' : 'internal',
        flowType: isSameClient ? 'same_client' : 'different_clients',
        fromClientId: clients[m.fromClient].id,
        toClientId: clients[m.toClient].id,
        fromPlatform: m.fromPlatform,
        toPlatform: m.toPlatform,
        amount: m.amount,
        status: m.status,
        settlementStatus: m.settlement,
        reviewedById: m.reviewer?.id ?? undefined,
        reviewedAt: m.reviewer ? daysAgo(m.daysOld - 1) : undefined,
        reviewNotes: (m as { reviewNotes?: string }).reviewNotes ?? undefined,
        recordedById: bo1.id,
        createdAt: daysAgo(m.daysOld),
      },
    })
  }

  console.log('💵 Creating earnings...')

  // Earnings for approved clients
  await prisma.earning.create({ data: { clientId: clients[7].id, amount: 150, description: 'DraftKings commission', status: 'paid', paidAt: daysAgo(8) } })
  await prisma.earning.create({ data: { clientId: clients[7].id, amount: 100, description: 'FanDuel commission', status: 'paid', paidAt: daysAgo(5) } })
  await prisma.earning.create({ data: { clientId: clients[7].id, amount: 75, description: 'BetMGM commission', status: 'pending' } })
  await prisma.earning.create({ data: { clientId: clients[8].id, amount: 200, description: 'FanDuel commission', status: 'paid', paidAt: daysAgo(10) } })
  await prisma.earning.create({ data: { clientId: clients[8].id, amount: 120, description: 'BetMGM commission', status: 'pending' } })

  console.log('📝 Creating event logs...')

  const eventDefs = [
    { type: EventType.APPLICATION_SUBMITTED, desc: 'New client application submitted', clientIdx: 0, userId: jr1.id, daysOld: 1 },
    { type: EventType.PHONE_ISSUED, desc: 'Phone IPHONE-001 issued', clientIdx: 1, userId: jr2.id, daysOld: 2 },
    { type: EventType.STATUS_CHANGE, desc: 'Status changed to IN_EXECUTION', clientIdx: 2, userId: mid1.id, daysOld: 4 },
    { type: EventType.PLATFORM_STATUS_CHANGE, desc: 'DraftKings verified', clientIdx: 2, userId: bo1.id, daysOld: 3 },
    { type: EventType.TODO_CREATED, desc: 'Created: Provide additional ID documentation', clientIdx: 3, userId: bo1.id, daysOld: 6 },
    { type: EventType.STATUS_CHANGE, desc: 'Status changed to PENDING_EXTERNAL', clientIdx: 4, userId: mid2.id, daysOld: 8 },
    { type: EventType.DEADLINE_MISSED, desc: 'Execution deadline missed', clientIdx: 5, userId: jr4.id, daysOld: 1 },
    { type: EventType.STATUS_CHANGE, desc: 'Status changed to EXECUTION_DELAYED', clientIdx: 5, userId: bo1.id, daysOld: 1 },
    { type: EventType.PLATFORM_STATUS_CHANGE, desc: 'All platforms verified — ready for approval', clientIdx: 6, userId: bo1.id, daysOld: 2 },
    { type: EventType.APPROVAL, desc: 'Client approved', clientIdx: 7, userId: admin.id, daysOld: 8 },
    { type: EventType.TRANSACTION_CREATED, desc: 'Fund movement: $500 Bank → DraftKings', clientIdx: 7, userId: bo1.id, daysOld: 15 },
    { type: EventType.APPROVAL, desc: 'Client approved', clientIdx: 8, userId: admin.id, daysOld: 12 },
    { type: EventType.REJECTION, desc: 'Client rejected — failed compliance', clientIdx: 9, userId: admin.id, daysOld: 5 },
    { type: EventType.STATUS_CHANGE, desc: 'Status changed to READY_FOR_APPROVAL', clientIdx: 6, userId: senior1.id, daysOld: 3 },
  ]

  for (const e of eventDefs) {
    await prisma.eventLog.create({
      data: {
        eventType: e.type,
        description: e.desc,
        clientId: clients[e.clientIdx].id,
        userId: e.userId,
        createdAt: daysAgo(e.daysOld),
      },
    })
  }

  console.log('📊 Creating transactions...')

  // A few ledger transactions for approved clients
  await prisma.transaction.create({ data: { type: TransactionType.DEPOSIT, amount: 500, clientId: clients[7].id, platformType: PlatformType.DRAFTKINGS, description: 'Initial deposit', recordedById: bo1.id, createdAt: daysAgo(15) } })
  await prisma.transaction.create({ data: { type: TransactionType.DEPOSIT, amount: 300, clientId: clients[7].id, platformType: PlatformType.FANDUEL, description: 'FanDuel deposit', recordedById: bo1.id, createdAt: daysAgo(14) } })
  await prisma.transaction.create({ data: { type: TransactionType.WITHDRAWAL, amount: 750, clientId: clients[7].id, platformType: PlatformType.DRAFTKINGS, description: 'Withdrawal to bank', recordedById: bo1.id, createdAt: daysAgo(10) } })
  await prisma.transaction.create({ data: { type: TransactionType.COMMISSION_PAYOUT, amount: 150, clientId: clients[7].id, description: 'DraftKings commission payout', recordedById: bo1.id, createdAt: daysAgo(8) } })
  await prisma.transaction.create({ data: { type: TransactionType.DEPOSIT, amount: 1000, clientId: clients[8].id, platformType: PlatformType.FANDUEL, description: 'Initial deposit', recordedById: bo1.id, createdAt: daysAgo(20) } })
  await prisma.transaction.create({ data: { type: TransactionType.INTERNAL_TRANSFER, amount: 600, clientId: clients[8].id, description: 'FanDuel → BetMGM transfer', recordedById: bo1.id, createdAt: daysAgo(15) } })

  // Extension request for Frank
  await prisma.extensionRequest.create({
    data: {
      clientId: clients[5].id,
      requestedById: jr4.id,
      reason: 'Client traveling — needs 3 more days to complete FanDuel execution',
      requestedDays: 3,
      currentDeadline: daysAgo(1),
      status: 'PENDING',
    },
  })

  console.log('')
  console.log('✅ Demo seed complete!')
  console.log('')
  console.log('Test accounts (all password123):')
  console.log('  Admin:      gm@test.com')
  console.log('  Backoffice: admin@test.com, bo2@test.com')
  console.log('  Agents:     agent@test.com through agent10@test.com')
  console.log('')
  console.log('Clients (10):')
  clientDefs.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.first} ${c.last} — ${c.status} (agent: ${c.agent.id === senior1.id ? 'John Doe' : c.agent.id === senior2.id ? 'Maria Garcia' : agents.find(a => a.id === c.agent.id)?.name})`)
  })
  console.log('')
  console.log('Summary: 1 admin, 2 backoffice, 10 agents, 10 clients, 13 fund movements, 5 earnings, 6 transactions, 10 todos, 3 phones, 14 events')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
