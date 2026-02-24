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

  // James Park — Executive Director (beyond 4★, top of hierarchy branch 1)
  const jamesPark = await prisma.user.upsert({
    where: { email: 'james.park@test.com' },
    update: { leadershipTier: 'ED' },
    create: {
      email: 'james.park@test.com',
      passwordHash,
      name: 'James Park',
      role: 'AGENT',
      phone: '(555) 100-0003',
      tier: '4-star',
      starLevel: 4,
      leadershipTier: 'ED',
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
  console.log(`  Created ED agent: ${jamesPark.email}`)

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

  // ── Additional Test Agents ────────────────────────────
  // Build out a richer hierarchy for testing

  // Branch 1: Under James Park (4★)
  // Lisa Wang — 3★ agent (supervised by James Park)
  const lisaWang = await prisma.user.upsert({
    where: { email: 'lisa.wang@test.com' },
    update: { supervisorId: jamesPark.id },
    create: {
      email: 'lisa.wang@test.com',
      passwordHash,
      name: 'Lisa Wang',
      role: 'AGENT',
      phone: '(555) 100-0010',
      tier: '3-star',
      starLevel: 3,
      gender: 'Female',
      dateOfBirth: new Date('1992-09-12'),
      citizenship: 'US',
      address: '200 Market St, San Francisco, CA 94105',
      personalEmail: 'lisa.wang@personal.com',
      personalPhone: '(555) 300-0010',
      zelle: 'lisa.wang@zelle.com',
      idNumber: 'DL-33445566',
      idExpiry: new Date('2029-06-30'),
      loginAccount: 'lwang',
      supervisorId: jamesPark.id,
    },
  })
  console.log(`  Created 3-star agent: ${lisaWang.email}`)

  // Derek Nguyen — 1★ agent (supervised by Lisa Wang)
  const derekNguyen = await prisma.user.upsert({
    where: { email: 'derek.nguyen@test.com' },
    update: { supervisorId: lisaWang.id },
    create: {
      email: 'derek.nguyen@test.com',
      passwordHash,
      name: 'Derek Nguyen',
      role: 'AGENT',
      phone: '(555) 100-0011',
      tier: '1-star',
      starLevel: 1,
      gender: 'Male',
      dateOfBirth: new Date('1996-02-28'),
      citizenship: 'US',
      address: '88 Valencia St, San Francisco, CA 94110',
      personalEmail: 'derek.n@personal.com',
      personalPhone: '(555) 300-0011',
      zelle: 'derek.nguyen@zelle.com',
      idNumber: 'DL-11223344',
      idExpiry: new Date('2028-11-15'),
      loginAccount: 'dnguyen',
      supervisorId: lisaWang.id,
    },
  })
  console.log(`  Created 1-star agent: ${derekNguyen.email}`)

  // Priya Sharma — rookie agent (supervised by Lisa Wang)
  const priyaSharma = await prisma.user.upsert({
    where: { email: 'priya.sharma@test.com' },
    update: { supervisorId: lisaWang.id },
    create: {
      email: 'priya.sharma@test.com',
      passwordHash,
      name: 'Priya Sharma',
      role: 'AGENT',
      phone: '(555) 100-0012',
      tier: 'rookie',
      starLevel: 0,
      gender: 'Female',
      dateOfBirth: new Date('1999-07-04'),
      citizenship: 'US',
      address: '150 Mission St, San Francisco, CA 94105',
      personalEmail: 'priya.s@personal.com',
      personalPhone: '(555) 300-0012',
      zelle: 'priya.sharma@zelle.com',
      idNumber: 'DL-99001122',
      idExpiry: new Date('2029-03-01'),
      loginAccount: 'psharma',
      supervisorId: lisaWang.id,
    },
  })
  console.log(`  Created rookie agent: ${priyaSharma.email}`)

  // Branch 2: Under Marcus Rivera (2★)
  // Carlos Mendez — 1★ agent (supervised by Marcus Rivera)
  const carlosMendez = await prisma.user.upsert({
    where: { email: 'carlos.mendez@test.com' },
    update: { supervisorId: agent.id },
    create: {
      email: 'carlos.mendez@test.com',
      passwordHash,
      name: 'Carlos Mendez',
      role: 'AGENT',
      phone: '(555) 100-0013',
      tier: '1-star',
      starLevel: 1,
      gender: 'Male',
      dateOfBirth: new Date('1994-12-10'),
      citizenship: 'US',
      address: '500 Lake Shore Dr, Chicago, IL 60611',
      personalEmail: 'carlos.m@personal.com',
      personalPhone: '(555) 300-0013',
      zelle: 'carlos.mendez@zelle.com',
      idNumber: 'DL-55443322',
      idExpiry: new Date('2028-09-20'),
      loginAccount: 'cmendez',
      supervisorId: agent.id,
    },
  })
  console.log(`  Created 1-star agent: ${carlosMendez.email}`)

  // Aisha Williams — rookie agent (supervised by Marcus Rivera)
  const aishaWilliams = await prisma.user.upsert({
    where: { email: 'aisha.williams@test.com' },
    update: { supervisorId: agent.id },
    create: {
      email: 'aisha.williams@test.com',
      passwordHash,
      name: 'Aisha Williams',
      role: 'AGENT',
      phone: '(555) 100-0014',
      tier: 'rookie',
      starLevel: 0,
      gender: 'Female',
      dateOfBirth: new Date('2000-04-18'),
      citizenship: 'US',
      address: '300 Michigan Ave, Chicago, IL 60601',
      personalEmail: 'aisha.w@personal.com',
      personalPhone: '(555) 300-0014',
      zelle: 'aisha.williams@zelle.com',
      idNumber: 'DL-66778899',
      idExpiry: new Date('2029-08-10'),
      loginAccount: 'awilliams',
      supervisorId: agent.id,
    },
  })
  console.log(`  Created rookie agent: ${aishaWilliams.email}`)

  // Branch 2: Independent top-level agent (no supervisor)
  // Rachel Kim — Senior Executive Director (beyond 4★, top of hierarchy branch 2)
  const rachelKim = await prisma.user.upsert({
    where: { email: 'rachel.kim@test.com' },
    update: { leadershipTier: 'SED' },
    create: {
      email: 'rachel.kim@test.com',
      passwordHash,
      name: 'Rachel Kim',
      role: 'AGENT',
      phone: '(555) 100-0020',
      tier: '4-star',
      starLevel: 4,
      leadershipTier: 'SED',
      gender: 'Female',
      dateOfBirth: new Date('1988-01-25'),
      citizenship: 'US',
      address: '400 Peachtree St, Atlanta, GA 30308',
      personalEmail: 'rachel.k@personal.com',
      personalPhone: '(555) 300-0020',
      zelle: 'rachel.kim@zelle.com',
      idNumber: 'DL-44556677',
      idExpiry: new Date('2030-02-28'),
      loginAccount: 'rkim',
    },
  })
  console.log(`  Created SED agent: ${rachelKim.email}`)

  // Tony Russo — 2★ agent (supervised by Rachel Kim)
  const tonyRusso = await prisma.user.upsert({
    where: { email: 'tony.russo@test.com' },
    update: { supervisorId: rachelKim.id },
    create: {
      email: 'tony.russo@test.com',
      passwordHash,
      name: 'Tony Russo',
      role: 'AGENT',
      phone: '(555) 100-0021',
      tier: '2-star',
      starLevel: 2,
      gender: 'Male',
      dateOfBirth: new Date('1993-08-05'),
      citizenship: 'US',
      address: '250 Piedmont Ave, Atlanta, GA 30308',
      personalEmail: 'tony.r@personal.com',
      personalPhone: '(555) 300-0021',
      zelle: 'tony.russo@zelle.com',
      idNumber: 'DL-88990011',
      idExpiry: new Date('2029-04-15'),
      loginAccount: 'trusso',
      supervisorId: rachelKim.id,
    },
  })
  console.log(`  Created 2-star agent: ${tonyRusso.email}`)

  // Sofia Reyes — rookie agent (supervised by Tony Russo)
  const sofiaReyes = await prisma.user.upsert({
    where: { email: 'sofia.reyes@test.com' },
    update: { supervisorId: tonyRusso.id },
    create: {
      email: 'sofia.reyes@test.com',
      passwordHash,
      name: 'Sofia Reyes',
      role: 'AGENT',
      phone: '(555) 100-0022',
      tier: 'rookie',
      starLevel: 0,
      gender: 'Female',
      dateOfBirth: new Date('2001-03-22'),
      citizenship: 'US',
      address: '75 5th St NW, Atlanta, GA 30308',
      personalEmail: 'sofia.r@personal.com',
      personalPhone: '(555) 300-0022',
      zelle: 'sofia.reyes@zelle.com',
      idNumber: 'DL-22334455',
      idExpiry: new Date('2029-10-01'),
      loginAccount: 'sreyes',
      supervisorId: tonyRusso.id,
    },
  })
  console.log(`  Created rookie agent: ${sofiaReyes.email}`)

  // Kevin Okafor — 1★ agent (supervised by Rachel Kim)
  const kevinOkafor = await prisma.user.upsert({
    where: { email: 'kevin.okafor@test.com' },
    update: { supervisorId: rachelKim.id },
    create: {
      email: 'kevin.okafor@test.com',
      passwordHash,
      name: 'Kevin Okafor',
      role: 'AGENT',
      phone: '(555) 100-0023',
      tier: '1-star',
      starLevel: 1,
      gender: 'Male',
      dateOfBirth: new Date('1997-06-14'),
      citizenship: 'US',
      address: '180 Spring St, Atlanta, GA 30303',
      personalEmail: 'kevin.o@personal.com',
      personalPhone: '(555) 300-0023',
      zelle: 'kevin.okafor@zelle.com',
      idNumber: 'DL-77889900',
      idExpiry: new Date('2028-12-31'),
      loginAccount: 'kokafor',
      supervisorId: rachelKim.id,
    },
  })
  console.log(`  Created 1-star agent: ${kevinOkafor.email}`)

  // ── Remaining Ranks (4★, MD, CMO) ─────────────────────────
  // Ensure one agent exists at every rank in the progression ladder

  // Branch 3: CMO → MD → 4★ (pure, no leadership tier)
  // Victor Hayes — Chief Marketing Officer (top of branch 3)
  const victorHayes = await prisma.user.upsert({
    where: { email: 'victor.hayes@test.com' },
    update: { leadershipTier: 'CMO' },
    create: {
      email: 'victor.hayes@test.com',
      passwordHash,
      name: 'Victor Hayes',
      role: 'AGENT',
      phone: '(555) 100-0030',
      tier: '4-star',
      starLevel: 4,
      leadershipTier: 'CMO',
      gender: 'Male',
      dateOfBirth: new Date('1980-04-10'),
      citizenship: 'US',
      address: '1 Park Ave, New York, NY 10016',
      personalEmail: 'victor.h@personal.com',
      personalPhone: '(555) 300-0030',
      zelle: 'victor.hayes@zelle.com',
      idNumber: 'DL-10101010',
      idExpiry: new Date('2030-06-30'),
      loginAccount: 'vhayes',
    },
  })
  console.log(`  Created CMO agent: ${victorHayes.email}`)

  // Diana Foster — Managing Director (supervised by Victor Hayes)
  const dianaFoster = await prisma.user.upsert({
    where: { email: 'diana.foster@test.com' },
    update: { supervisorId: victorHayes.id, leadershipTier: 'MD' },
    create: {
      email: 'diana.foster@test.com',
      passwordHash,
      name: 'Diana Foster',
      role: 'AGENT',
      phone: '(555) 100-0031',
      tier: '4-star',
      starLevel: 4,
      leadershipTier: 'MD',
      gender: 'Female',
      dateOfBirth: new Date('1985-11-18'),
      citizenship: 'US',
      address: '200 5th Ave, New York, NY 10010',
      personalEmail: 'diana.f@personal.com',
      personalPhone: '(555) 300-0031',
      zelle: 'diana.foster@zelle.com',
      idNumber: 'DL-20202020',
      idExpiry: new Date('2030-03-15'),
      loginAccount: 'dfoster',
      supervisorId: victorHayes.id,
    },
  })
  console.log(`  Created MD agent: ${dianaFoster.email}`)

  // Ryan Mitchell — 4★ pure (no leadership tier, supervised by Diana Foster)
  const ryanMitchell = await prisma.user.upsert({
    where: { email: 'ryan.mitchell@test.com' },
    update: { supervisorId: dianaFoster.id },
    create: {
      email: 'ryan.mitchell@test.com',
      passwordHash,
      name: 'Ryan Mitchell',
      role: 'AGENT',
      phone: '(555) 100-0032',
      tier: '4-star',
      starLevel: 4,
      gender: 'Male',
      dateOfBirth: new Date('1991-07-30'),
      citizenship: 'US',
      address: '350 Madison Ave, New York, NY 10017',
      personalEmail: 'ryan.m@personal.com',
      personalPhone: '(555) 300-0032',
      zelle: 'ryan.mitchell@zelle.com',
      idNumber: 'DL-30303030',
      idExpiry: new Date('2029-09-01'),
      loginAccount: 'rmitchell',
      supervisorId: dianaFoster.id,
    },
  })
  console.log(`  Created 4-star agent: ${ryanMitchell.email}`)

  // ── Backoffice Staff ─────────────────────────────────────
  // Additional non-agent users for testing

  const boStaff = await prisma.user.upsert({
    where: { email: 'backoffice@test.com' },
    update: {},
    create: {
      email: 'backoffice@test.com',
      passwordHash,
      name: 'Nina Patel',
      role: 'BACKOFFICE',
      phone: '(555) 200-0010',
      tier: 'admin',
      starLevel: 0,
    },
  })
  console.log(`  Created backoffice: ${boStaff.email}`)

  const financeUser = await prisma.user.upsert({
    where: { email: 'finance@test.com' },
    update: {},
    create: {
      email: 'finance@test.com',
      passwordHash,
      name: 'David Chen',
      role: 'FINANCE',
      phone: '(555) 200-0011',
      tier: 'admin',
      starLevel: 0,
    },
  })
  console.log(`  Created finance: ${financeUser.email}`)

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

  await prisma.phoneAssignment.deleteMany({
    where: { clientDraft: { closerId: agent.id } },
  })
  await prisma.clientDraft.deleteMany({ where: { closerId: agent.id } })
  // Compute future dates for phone assignment (sign out = now, due back = 3 days from now)
  const signOutDate = new Date()
  const dueBackDate = new Date(signOutDate.getTime() + 3 * 24 * 60 * 60 * 1000)

  const sampleDraft = await prisma.clientDraft.create({
    data: {
      closerId: agent.id,
      status: 'DRAFT',
      step: 3,
      firstName: 'Sarah',
      lastName: 'Martinez',
      email: 'sarah.m@example.com',
      phone: '(555) 600-0001',
      idDocument: '/uploads/sample-client-id.jpg',
      idNumber: 'DL-55667788',
      idExpiry: new Date('2028-08-20'),
      assignedGmail: 'sarah.martinez.work@gmail.com',
      deviceReservationDate: new Date().toISOString().split('T')[0],
    },
  })
  console.log(`  Created sample client draft: ${sampleDraft.id} (step 3, for Marcus, with device reservation + Gmail)`)

  // Sample PhoneAssignment — signed out device for Sarah Martinez's draft
  const sampleAssignment = await prisma.phoneAssignment.create({
    data: {
      phoneNumber: '(555) 777-0001',
      carrier: 'T-Mobile',
      deviceId: 'IMEI-9876543210',
      clientDraftId: sampleDraft.id,
      agentId: agent.id,
      signedOutById: boStaff.id,
      signedOutAt: signOutDate,
      dueBackAt: dueBackDate,
      status: 'SIGNED_OUT',
    },
  })
  console.log(`  Created sample phone assignment: ${sampleAssignment.id} (signed out, due ${dueBackDate.toISOString().split('T')[0]})`)

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
  console.log('\n  Progression ladder: Rookie → 1★ → 2★ → 3★ → 4★ → ED → SED → MD → CMO')
  console.log('  Branch 1: James Park (ED) → Marcus Rivera (2★) → Jamie Torres (Rookie)')
  console.log('                                                   → Carlos Mendez (1★)')
  console.log('                                                   → Aisha Williams (Rookie)')
  console.log('                             → Lisa Wang (3★) → Derek Nguyen (1★)')
  console.log('                                              → Priya Sharma (Rookie)')
  console.log('  Branch 2: Rachel Kim (SED) → Tony Russo (2★) → Sofia Reyes (Rookie)')
  console.log('                             → Kevin Okafor (1★)')
  console.log('  Branch 3: Victor Hayes (CMO) → Diana Foster (MD) → Ryan Mitchell (4★)')
  console.log('  Staff: Nina Patel (Backoffice), David Chen (Finance)')
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
