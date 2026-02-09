/**
 * Demo seed — clean, minimal test data.
 *
 * Run:  npx tsx prisma/seed-demo.ts
 *
 * Creates:
 *   1 admin (gm@test.com)
 *   1 backoffice (admin@test.com)
 *   5 agents — one per tier (rookie → 4-star), hierarchy chain
 *   10 clients — each agent gets 1 approved + 1 pending
 *   Platform accounts, fund movements, earnings, todos, event logs
 *
 * Idempotent: wipes all data first, safe to re-run.
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
const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000)
const daysFromNow = (n: number) => new Date(Date.now() + n * 86400_000)

async function main() {
  console.log('🗑️  Wiping existing data...')
  await prisma.bonusAllocation.deleteMany()
  await prisma.leadershipPayout.deleteMany()
  await prisma.bonusPool.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.earning.deleteMany()
  await prisma.fundMovement.deleteMany()
  await prisma.profitShareDetail.deleteMany()
  await prisma.profitShareRule.deleteMany()
  await prisma.extensionRequest.deleteMany()
  await prisma.phoneAssignment.deleteMany()
  await prisma.toDo.deleteMany()
  await prisma.eventLog.deleteMany()
  await prisma.clientPlatform.deleteMany()
  await prisma.applicationDraft.deleteMany()
  await prisma.agentMetrics.deleteMany()
  await prisma.fundAllocation.deleteMany()
  await prisma.client.deleteMany()
  await prisma.partner.deleteMany()
  await prisma.user.deleteMany()

  console.log('👤 Creating users...')

  // ─── Admin + Backoffice ───
  const admin = await prisma.user.create({
    data: { email: 'gm@test.com', passwordHash: pw, name: 'Marcus Chen', role: UserRole.ADMIN, phone: '(555) 100-0001', tier: 'leadership', starLevel: 5 },
  })
  const bo = await prisma.user.create({
    data: { email: 'admin@test.com', passwordHash: pw, name: 'Sarah Mitchell', role: UserRole.BACKOFFICE, phone: '(555) 100-0002' },
  })

  // ─── 5 Agents: one per tier, chained hierarchy ───
  // 4★ (top) → 3★ → 2★ → 1★ → rookie (bottom)
  const agent4 = await prisma.user.create({
    data: { email: 'agent4star@test.com', passwordHash: pw, name: 'Pierre Dubois', role: UserRole.AGENT, phone: '(555) 200-0001', tier: '4-star', starLevel: 4 },
  })
  const agent3 = await prisma.user.create({
    data: { email: 'agent3star@test.com', passwordHash: pw, name: 'Carlos Rivera', role: UserRole.AGENT, phone: '(555) 200-0002', tier: '3-star', starLevel: 3, supervisorId: agent4.id },
  })
  const agent2 = await prisma.user.create({
    data: { email: 'agent2star@test.com', passwordHash: pw, name: 'Wei Zhang', role: UserRole.AGENT, phone: '(555) 200-0003', tier: '2-star', starLevel: 2, supervisorId: agent3.id },
  })
  const agent1 = await prisma.user.create({
    data: { email: 'agent1star@test.com', passwordHash: pw, name: 'Yuki Tanaka', role: UserRole.AGENT, phone: '(555) 200-0004', tier: '1-star', starLevel: 1, supervisorId: agent2.id },
  })
  const agentR = await prisma.user.create({
    data: { email: 'agent@test.com', passwordHash: pw, name: 'John Smith', role: UserRole.AGENT, phone: '(555) 200-0005', tier: 'rookie', starLevel: 0, supervisorId: agent1.id },
  })

  const agents = [agent4, agent3, agent2, agent1, agentR]

  // ─── Agent Metrics ───
  for (const a of agents) {
    await prisma.agentMetrics.create({
      data: { agentId: a.id, totalClients: 2, approvedClients: 1, rejectedClients: 0, delayCount: 0, extensionCount: 0, successRate: 50, delayRate: 0 },
    })
  }

  console.log('👥 Creating clients (1 approved + 1 pending per agent)...')

  const clientNames = [
    // agent4's clients
    { first: 'Alice', last: 'Thompson', email: 'alice@example.com' },
    { first: 'Bob', last: 'Martinez', email: 'bob@example.com' },
    // agent3's clients
    { first: 'Claire', last: 'Johnson', email: 'claire@example.com' },
    { first: 'Derek', last: 'Nguyen', email: 'derek@example.com' },
    // agent2's clients
    { first: 'Eva', last: 'Patel', email: 'eva@example.com' },
    { first: 'Frank', last: 'O\'Brien', email: 'frank@example.com' },
    // agent1's clients
    { first: 'Grace', last: 'Kim', email: 'grace@example.com' },
    { first: 'Henry', last: 'Baker', email: 'henry@example.com' },
    // agentR's clients
    { first: 'Iris', last: 'Santos', email: 'iris@example.com' },
    { first: 'Jake', last: 'Williams', email: 'jake@example.com' },
  ]

  const clients = []
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i]
    const approved = clientNames[i * 2]
    const pending = clientNames[i * 2 + 1]

    // Approved client
    const ac = await prisma.client.create({
      data: {
        firstName: approved.first, lastName: approved.last, email: approved.email,
        phone: `(555) 300-${String(i * 2 + 1).padStart(4, '0')}`,
        intakeStatus: IntakeStatus.APPROVED,
        statusChangedAt: daysAgo(10),
        agentId: agent.id,
        state: 'CA', city: 'Los Angeles', zipCode: '90001', country: 'US',
        createdAt: daysAgo(20),
      },
    })

    // Pending client
    const pc = await prisma.client.create({
      data: {
        firstName: pending.first, lastName: pending.last, email: pending.email,
        phone: `(555) 300-${String(i * 2 + 2).padStart(4, '0')}`,
        intakeStatus: IntakeStatus.IN_EXECUTION,
        statusChangedAt: daysAgo(3),
        executionDeadline: daysFromNow(4),
        agentId: agent.id,
        state: 'CA', city: 'Los Angeles', zipCode: '90001', country: 'US',
        createdAt: daysAgo(5),
      },
    })

    clients.push(ac, pc)
  }

  console.log('🎰 Creating platform accounts...')

  // Approved clients get verified platforms, pending clients get in-progress platforms
  for (let i = 0; i < clients.length; i++) {
    const isApproved = i % 2 === 0
    const platforms: { type: PlatformType; status: PlatformStatus }[] = isApproved
      ? [
          { type: PlatformType.DRAFTKINGS, status: PlatformStatus.VERIFIED },
          { type: PlatformType.FANDUEL, status: PlatformStatus.VERIFIED },
          { type: PlatformType.BANK, status: PlatformStatus.VERIFIED },
        ]
      : [
          { type: PlatformType.DRAFTKINGS, status: PlatformStatus.PENDING_UPLOAD },
          { type: PlatformType.FANDUEL, status: PlatformStatus.NOT_STARTED },
        ]

    for (const p of platforms) {
      await prisma.clientPlatform.create({
        data: {
          clientId: clients[i].id,
          platformType: p.type,
          status: p.status,
          reviewedBy: p.status === PlatformStatus.VERIFIED ? bo.name : undefined,
          reviewedAt: p.status === PlatformStatus.VERIFIED ? daysAgo(5) : undefined,
        },
      })
    }
  }

  console.log('📋 Creating todos...')

  // One todo per pending client
  for (let i = 1; i < clients.length; i += 2) {
    const agentIdx = Math.floor(i / 2)
    await prisma.toDo.create({
      data: {
        title: `Execute DraftKings for ${clients[i].firstName}`,
        type: ToDoType.EXECUTION,
        status: ToDoStatus.IN_PROGRESS,
        dueDate: daysFromNow(3),
        clientId: clients[i].id,
        assignedToId: agents[agentIdx].id,
        createdById: bo.id,
      },
    })
  }

  console.log('💰 Creating fund movements...')

  // Fund movements for approved clients only
  for (let i = 0; i < clients.length; i += 2) {
    const client = clients[i]
    const agentIdx = Math.floor(i / 2)

    // Deposit
    await prisma.fundMovement.create({
      data: {
        type: 'external', flowType: 'same_client',
        fromClientId: client.id, toClientId: client.id,
        fromPlatform: 'Bank', toPlatform: 'DraftKings',
        amount: 500 + agentIdx * 100,
        status: 'completed',
        settlementStatus: SettlementStatus.CONFIRMED,
        reviewedById: bo.id, reviewedAt: daysAgo(8),
        recordedById: bo.id, createdAt: daysAgo(15),
      },
    })

    // Withdrawal
    await prisma.fundMovement.create({
      data: {
        type: 'external', flowType: 'same_client',
        fromClientId: client.id, toClientId: client.id,
        fromPlatform: 'DraftKings', toPlatform: 'Bank',
        amount: 200 + agentIdx * 50,
        status: 'completed',
        settlementStatus: SettlementStatus.PENDING_REVIEW,
        recordedById: bo.id, createdAt: daysAgo(5),
      },
    })
  }

  console.log('💵 Creating earnings...')

  for (let i = 0; i < clients.length; i += 2) {
    const client = clients[i]
    await prisma.earning.create({
      data: { clientId: client.id, amount: 150, description: 'DraftKings commission', status: 'paid', paidAt: daysAgo(5) },
    })
    await prisma.earning.create({
      data: { clientId: client.id, amount: 75, description: 'FanDuel commission', status: 'pending' },
    })
  }

  console.log('📝 Creating event logs...')

  for (let i = 0; i < agents.length; i++) {
    const approvedClient = clients[i * 2]
    const pendingClient = clients[i * 2 + 1]

    await prisma.eventLog.create({
      data: { eventType: EventType.APPROVAL, description: `Client ${approvedClient.firstName} ${approvedClient.lastName} approved`, clientId: approvedClient.id, userId: admin.id, createdAt: daysAgo(10) },
    })
    await prisma.eventLog.create({
      data: { eventType: EventType.STATUS_CHANGE, description: `Client ${pendingClient.firstName} ${pendingClient.lastName} moved to IN_EXECUTION`, clientId: pendingClient.id, userId: agents[i].id, createdAt: daysAgo(3) },
    })
  }

  console.log('📊 Creating transactions...')

  for (let i = 0; i < clients.length; i += 2) {
    const client = clients[i]
    const agentIdx = Math.floor(i / 2)
    await prisma.transaction.create({
      data: { type: TransactionType.DEPOSIT, amount: 500 + agentIdx * 100, clientId: client.id, platformType: PlatformType.DRAFTKINGS, description: 'Initial deposit', recordedById: bo.id, createdAt: daysAgo(15) },
    })
    await prisma.transaction.create({
      data: { type: TransactionType.COMMISSION_PAYOUT, amount: 150, clientId: client.id, description: 'DraftKings commission payout', recordedById: bo.id, createdAt: daysAgo(5) },
    })
  }

  console.log('')
  console.log('✅ Demo seed complete!')
  console.log('')
  console.log('Test accounts (all password123):')
  console.log('  Admin:      gm@test.com')
  console.log('  Backoffice: admin@test.com')
  console.log('  4-Star:     agent4star@test.com (Pierre Dubois) 🇫🇷')
  console.log('  3-Star:     agent3star@test.com (Carlos Rivera) 🇪🇸')
  console.log('  2-Star:     agent2star@test.com (Wei Zhang) 🇨🇳')
  console.log('  1-Star:     agent1star@test.com (Yuki Tanaka) 🇯🇵')
  console.log('  Rookie:     agent@test.com (John Smith) 🇺🇸')
  console.log('')
  console.log('Hierarchy: 4★ Pierre → 3★ Carlos → 2★ Wei → 1★ Yuki → 0★ John')
  console.log('Each agent: 1 approved client + 1 in-execution client')
  console.log('Total: 2 staff, 5 agents, 10 clients, 10 movements, 10 earnings, 10 transactions')
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
