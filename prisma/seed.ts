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

  const agent = await prisma.user.upsert({
    where: { email: 'agent@test.com' },
    update: {},
    create: {
      email: 'agent@test.com',
      passwordHash,
      name: 'Marcus Rivera',
      role: 'AGENT',
      phone: '(555) 100-0001',
      tier: 'rising',
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
      supervisorId: null, // no supervisor for seed
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

  // Create the user first
  const approvedUser = await prisma.user.upsert({
    where: { email: 'jamie.torres@example.com' },
    update: {},
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
    ],
  })
  console.log('  Created event logs')

  console.log('Seeding complete!')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
