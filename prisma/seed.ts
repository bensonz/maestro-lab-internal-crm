import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { hash } from 'bcryptjs'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  const passwordHash = await hash('password123', 12)

  // ── Test Users ─────────────────────────────────────────

  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      passwordHash,
      name: 'Sarah Chen',
      role: 'ADMIN',
      phone: '(555) 200-0001',
      tier: 'admin',
      starLevel: 0,
    },
  })
  console.log(`  Created admin: ${admin.email}`)

  const gm = await prisma.user.upsert({
    where: { email: 'gm@test.com' },
    update: {},
    create: {
      email: 'gm@test.com',
      passwordHash,
      name: 'Tom Adams',
      role: 'ADMIN',
      phone: '(555) 200-0002',
      tier: 'admin',
      starLevel: 0,
    },
  })
  console.log(`  Created GM: ${gm.email}`)

  // James Park — 4★ agent (top of hierarchy)
  const jamesPark = await prisma.user.upsert({
    where: { email: 'james.park@test.com' },
    update: {},
    create: {
      email: 'james.park@test.com',
      passwordHash,
      name: 'James Park',
      role: 'AGENT',
      phone: '(555) 100-0003',
      tier: '4-star',
      starLevel: 4,
      gender: 'Male',
      dateOfBirth: new Date('1990-06-20'),
      citizenship: 'US',
      address: '100 Broadway, New York, NY 10001',
      personalEmail: 'james.park@personal.com',
      personalPhone: '(555) 300-0003',
      zelle: 'james.park@zelle.com',
      idNumber: 'DL-99887766',
      idExpiry: new Date('2029-12-31'),
      loginAccount: 'jpark',
    },
  })
  console.log(`  Created 4-star agent: ${jamesPark.email}`)

  // Marcus Rivera — 2★ agent (supervised by James Park)
  const agent = await prisma.user.upsert({
    where: { email: 'agent@test.com' },
    update: { supervisorId: jamesPark.id, starLevel: 2, tier: '2-star' },
    create: {
      email: 'agent@test.com',
      passwordHash,
      name: 'Marcus Rivera',
      role: 'AGENT',
      phone: '(555) 100-0001',
      tier: '2-star',
      starLevel: 2,
      gender: 'Male',
      dateOfBirth: new Date('1998-03-15'),
      citizenship: 'US',
      address: '456 Oak Ave, Chicago, IL 60601',
      personalEmail: 'marcus.r@personal.com',
      personalPhone: '(555) 300-0001',
      zelle: 'marcus.zelle@email.com',
      idNumber: 'DL-12345678',
      idExpiry: new Date('2028-05-15'),
      loginAccount: 'mrivera',
      supervisorId: jamesPark.id,
    },
  })
  console.log(`  Created agent: ${agent.email}`)

  // ── Sample Pending Application ─────────────────────────

  const pendingAppHash = await hash('newagent123', 12)

  // Delete existing application for this email to allow re-seeding
  await prisma.agentApplication.deleteMany({ where: { email: 'alex.johnson@example.com' } })
  const pendingApp = await prisma.agentApplication.create({
    data: {
      firstName: 'Alex',
      lastName: 'Johnson',
      email: 'alex.johnson@example.com',
      phone: '(555) 400-0001',
      password: pendingAppHash,
      gender: 'Male',
      dateOfBirth: new Date('1995-07-22'),
      citizenship: 'US',
      address: '789 Pine Rd',
      city: 'Austin',
      state: 'TX',
      zipCode: '73301',
      country: 'US',
      idDocument: '/uploads/sample-id.jpg',
      addressDocument: '/uploads/sample-address-proof.jpg',
      idNumber: 'DL-87654321',
      idExpiry: new Date('2029-01-15'),
      zelle: 'alex.j@zelle.com',
      referredByName: 'Marcus Rivera',
      status: 'PENDING',
    },
  })
  console.log(`  Created pending application: ${pendingApp.email}`)

  // ── Sample Approved Application ────────────────────────

  const approvedAppHash = await hash('approved123', 12)

  // Jamie Torres — rookie agent (supervised by Marcus Rivera)
  const approvedUser = await prisma.user.upsert({
    where: { email: 'jamie.torres@example.com' },
    update: { supervisorId: agent.id },
    create: {
      email: 'jamie.torres@example.com',
      passwordHash: approvedAppHash,
      name: 'Jamie Torres',
      role: 'AGENT',
      phone: '(555) 400-0002',
      tier: 'rookie',
      starLevel: 0,
      supervisorId: agent.id,
    },
  })

  await prisma.agentApplication.deleteMany({ where: { email: 'jamie.torres@example.com' } })
  await prisma.agentApplication.create({
    data: {
      firstName: 'Jamie',
      lastName: 'Torres',
      email: 'jamie.torres@example.com',
      phone: '(555) 400-0002',
      password: approvedAppHash,
      gender: 'Female',
      dateOfBirth: new Date('1997-11-08'),
      citizenship: 'US',
      address: '321 Elm St',
      city: 'Denver',
      state: 'CO',
      zipCode: '80201',
      country: 'US',
      zelle: 'jamie.t@zelle.com',
      referredByName: 'Marcus Rivera',
      status: 'APPROVED',
      reviewedById: admin.id,
      reviewedAt: new Date('2026-02-15'),
      reviewNotes: 'Strong referral from Marcus. Approved.',
      resultUserId: approvedUser.id,
    },
  })
  console.log(`  Created approved application: jamie.torres@example.com`)

  // ── Sample Clients + Bonus Pools ───────────────────────
  // Hierarchy: James Park (4★) → Marcus Rivera (2★) → Jamie Torres (0★)

  // Clean up existing sample clients to allow re-seeding
  await prisma.bonusAllocation.deleteMany({
    where: { pool: { client: { email: { startsWith: 'sample-client' } } } },
  })
  await prisma.bonusPool.deleteMany({
    where: { client: { email: { startsWith: 'sample-client' } } },
  })
  await prisma.client.deleteMany({
    where: { email: { startsWith: 'sample-client' } },
  })

  // Client 1 — Approved, closed by Marcus Rivera (2★)
  // Chain: Marcus (2★) → James Park (4★)
  // Distribution: Direct $200 to Marcus, Star pool: Marcus 2 slices ($100) + James 2 slices ($100)
  const client1 = await prisma.client.create({
    data: {
      firstName: 'David',
      lastName: 'Wilson',
      email: 'sample-client-1@example.com',
      phone: '(555) 500-0001',
      status: 'APPROVED',
      closerId: agent.id,
      approvedAt: new Date('2026-02-10'),
    },
  })

  await prisma.bonusPool.create({
    data: {
      clientId: client1.id,
      closerId: agent.id,
      closerStarLevel: 2,
      totalAmount: 400,
      directAmount: 200,
      starPoolAmount: 200,
      distributedSlices: 4,
      recycledSlices: 0,
      status: 'DISTRIBUTED',
      distributedAt: new Date('2026-02-10'),
      allocations: {
        create: [
          {
            agentId: agent.id,
            agentStarLevel: 2,
            type: 'DIRECT',
            slices: 0,
            amount: 200,
            status: 'PAID',
            paidAt: new Date('2026-02-15'),
            paidById: admin.id,
          },
          {
            agentId: agent.id,
            agentStarLevel: 2,
            type: 'STAR_SLICE',
            slices: 2,
            amount: 100,
            status: 'PAID',
            paidAt: new Date('2026-02-15'),
            paidById: admin.id,
          },
          {
            agentId: jamesPark.id,
            agentStarLevel: 4,
            type: 'STAR_SLICE',
            slices: 2,
            amount: 100,
            status: 'PAID',
            paidAt: new Date('2026-02-15'),
            paidById: admin.id,
          },
        ],
      },
    },
  })
  console.log(`  Created client 1 (David Wilson) + bonus pool — closed by Marcus`)

  // Client 2 — Approved, closed by Jamie Torres (0★ rookie)
  // Chain: Jamie (0★) → Marcus (2★) → James Park (4★)
  // Distribution: Direct $200 to Jamie, Star pool: Jamie 0, Marcus 2 ($100), James 2 ($100)
  const client2 = await prisma.client.create({
    data: {
      firstName: 'Emily',
      lastName: 'Chen',
      email: 'sample-client-2@example.com',
      phone: '(555) 500-0002',
      status: 'APPROVED',
      closerId: approvedUser.id,
      approvedAt: new Date('2026-02-12'),
    },
  })

  await prisma.bonusPool.create({
    data: {
      clientId: client2.id,
      closerId: approvedUser.id,
      closerStarLevel: 0,
      totalAmount: 400,
      directAmount: 200,
      starPoolAmount: 200,
      distributedSlices: 4,
      recycledSlices: 0,
      status: 'DISTRIBUTED',
      distributedAt: new Date('2026-02-12'),
      allocations: {
        create: [
          {
            agentId: approvedUser.id,
            agentStarLevel: 0,
            type: 'DIRECT',
            slices: 0,
            amount: 200,
            status: 'PENDING',
          },
          {
            agentId: agent.id,
            agentStarLevel: 2,
            type: 'STAR_SLICE',
            slices: 2,
            amount: 100,
            status: 'PENDING',
          },
          {
            agentId: jamesPark.id,
            agentStarLevel: 4,
            type: 'STAR_SLICE',
            slices: 2,
            amount: 100,
            status: 'PENDING',
          },
        ],
      },
    },
  })
  console.log(`  Created client 2 (Emily Chen) + bonus pool — closed by Jamie`)

  // Client 3 — Pending (no bonus pool yet)
  await prisma.client.create({
    data: {
      firstName: 'Robert',
      lastName: 'Kim',
      email: 'sample-client-3@example.com',
      phone: '(555) 500-0003',
      status: 'PENDING',
      closerId: agent.id,
    },
  })
  console.log(`  Created client 3 (Robert Kim) — pending, no bonus pool`)

  // ── Sample Client Draft ────────────────────────────────

  await prisma.clientDraft.deleteMany({ where: { closerId: agent.id } })
  const sampleDraft = await prisma.clientDraft.create({
    data: {
      closerId: agent.id,
      status: 'DRAFT',
      step: 2,
      firstName: 'Sarah',
      lastName: 'Martinez',
      email: 'sarah.m@example.com',
      phone: '(555) 600-0001',
      idDocument: '/uploads/sample-client-id.jpg',
      idNumber: 'DL-55667788',
      idExpiry: new Date('2028-08-20'),
    },
  })
  console.log(`  Created sample client draft: ${sampleDraft.id} (step 2, for Marcus)`)

  // ── Event Logs ─────────────────────────────────────────

  await prisma.eventLog.createMany({
    data: [
      {
        eventType: 'USER_CREATED',
        description: 'Admin account created during seed',
        userId: admin.id,
      },
      {
        eventType: 'APPLICATION_SUBMITTED',
        description: 'Agent application submitted by Alex Johnson',
        metadata: { applicationId: pendingApp.id },
      },
      {
        eventType: 'APPLICATION_APPROVED',
        description: 'Application approved for Jamie Torres',
        userId: admin.id,
        metadata: { createdUserId: approvedUser.id },
      },
      {
        eventType: 'BONUS_POOL_DISTRIBUTED',
        description: 'Bonus pool distributed for David Wilson',
        userId: agent.id,
        metadata: { clientName: 'David Wilson', distributedSlices: 4 },
      },
      {
        eventType: 'BONUS_POOL_DISTRIBUTED',
        description: 'Bonus pool distributed for Emily Chen',
        userId: approvedUser.id,
        metadata: { clientName: 'Emily Chen', distributedSlices: 4 },
      },
    ],
  })
  console.log('  Created event logs')

  console.log('\nSeeding complete!')
  console.log('\n  Hierarchy: James Park (4★) → Marcus Rivera (2★) → Jamie Torres (0★)')
  console.log('  Clients: 2 approved (with bonus pools), 1 pending')
  console.log('  Bonus pools: $800 total distributed')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
