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
  await prisma.transaction.deleteMany({
    where: { client: { email: { startsWith: 'sample-client' } } },
  })
  // Clean up phone assignments linked to sample client drafts
  await prisma.phoneAssignment.deleteMany({
    where: { clientDraft: { resultClient: { email: { startsWith: 'sample-client' } } } },
  })
  // Clean up drafts linked to sample clients
  await prisma.clientDraft.deleteMany({
    where: { resultClient: { email: { startsWith: 'sample-client' } } },
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

  // Create linked ClientDraft for Client 1 (David Wilson) — simulates full intake
  const draft1 = await prisma.clientDraft.create({
    data: {
      closerId: agent.id,
      status: 'SUBMITTED',
      step: 4,
      resultClientId: client1.id,
      firstName: 'David',
      lastName: 'Wilson',
      email: 'sample-client-1@example.com',
      phone: '(555) 500-0001',
      dateOfBirth: new Date('1992-03-15'),
      idNumber: 'DL-77881234',
      idExpiry: new Date('2028-11-30'),
      address: '742 Evergreen Terrace, Springfield, IL 62704',
      citizenship: 'US',
      assignedGmail: 'david.wilson.work@gmail.com',
      gmailPassword: 'DWils#2026!',
      betmgmCheckPassed: true,
      betmgmLogin: 'david.wilson.work@gmail.com',
      betmgmPassword: 'BetMGM#David2026',
      ssnNumber: '***-**-4567',
      bankingHistory: 'Chase checking, good standing 5yr',
      paypalPreviouslyUsed: false,
      debankedHistory: false,
      hasCriminalRecord: false,
      addressMismatch: false,
      undisclosedInfo: false,
      occupation: 'Software Engineer',
      annualIncome: '$75,000-$100,000',
      employmentStatus: 'Employed Full-Time',
      maritalStatus: 'Single',
      platformData: {
        paypal: { username: 'david.wilson.work@gmail.com', status: 'VERIFIED' },
        onlineBanking: {
          username: 'david.wilson.work@gmail.com', accountId: 'CHK-9901', bank: 'Chase', status: 'VERIFIED',
          routingNumber: '021000021', bankAccountNumber: '4839201756',
          cardNumber: '4532 1234 5678 9012', cvv: '847', cardExpiry: '09/28', pin: '2580',
          cardImages: ['/uploads/david-wilson-bank-card.jpg'],
        },
        edgeboost: {
          username: 'david.wilson.work@gmail.com', accountId: 'EB-4401', status: 'VERIFIED',
          cardNumber: '5412 7534 0000 1234', cvv: '312', cardExpiry: '11/27',
          cardImages: ['/uploads/david-wilson-edgeboost-card.jpg'],
        },
        draftkings: { username: 'DWilsonDK', accountId: 'DK-7701', status: 'VERIFIED' },
        fanduel: { username: 'DWilsonFD', accountId: 'FD-3301', status: 'VERIFIED' },
        betmgm: { username: 'david.wilson.work@gmail.com', accountId: 'MGM-1101', status: 'VERIFIED' },
        caesars: { username: 'DWilsonCZR', accountId: 'CZR-2201', status: 'PENDING_REVIEW' },
        fanatics: { username: 'DWilsonFAN', accountId: 'FAN-5501' },
      },
      generatedCredentials: {
        gmailPassword: 'DWils#2026!',
        betmgmPassword: 'BetMGM#David2026',
        platformPasswords: {
          sportsbook: 'SBook#David2026',
          BETMGM: 'BetMGM#David2026',
          PAYPAL: 'PPal#David2026',
          ONLINE_BANKING: 'Bank#David2026',
          EDGEBOOST: 'Edge#David2026',
        },
        bankPin4: '2580',
        bankPin6: '258000',
      },
      contractDocument: '/uploads/david-wilson-contract.pdf',
      createdAt: new Date('2026-02-05'),
      updatedAt: new Date('2026-02-09'),
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

  // Create linked ClientDraft for Client 2 (Emily Chen)
  const draft2 = await prisma.clientDraft.create({
    data: {
      closerId: approvedUser.id,
      status: 'SUBMITTED',
      step: 4,
      resultClientId: client2.id,
      firstName: 'Emily',
      lastName: 'Chen',
      email: 'sample-client-2@example.com',
      phone: '(555) 500-0002',
      dateOfBirth: new Date('1995-08-22'),
      idNumber: 'DL-33449988',
      idExpiry: new Date('2027-06-15'),
      address: '1200 Peachtree St NE, Atlanta, GA 30309',
      currentAddress: '450 Piedmont Ave NE, Atlanta, GA 30308',
      livesAtDifferentAddress: true,
      citizenship: 'US',
      assignedGmail: 'emily.chen.work@gmail.com',
      gmailPassword: 'EChen#2026!',
      betmgmCheckPassed: true,
      betmgmLogin: 'emily.chen.work@gmail.com',
      betmgmPassword: 'BetMGM#Emily2026',
      ssnNumber: '***-**-8901',
      bankingHistory: 'Citi checking, 3yr history',
      paypalPreviouslyUsed: true,
      debankedHistory: false,
      hasCriminalRecord: false,
      addressMismatch: true,
      undisclosedInfo: false,
      occupation: 'Marketing Manager',
      annualIncome: '$50,000-$75,000',
      employmentStatus: 'Employed Full-Time',
      maritalStatus: 'Married',
      platformData: {
        paypal: { username: 'emily.chen.work@gmail.com', status: 'VERIFIED' },
        onlineBanking: {
          username: 'emily.chen.work@gmail.com', accountId: 'CHK-5502', bank: 'Citi', status: 'VERIFIED',
          routingNumber: '021000089', bankAccountNumber: '5527801943',
          cardNumber: '4916 3344 7788 2201', cvv: '523', cardExpiry: '04/28', pin: '1234',
          cardImages: ['/uploads/emily-chen-bank-card.jpg'],
        },
        edgeboost: {
          username: 'emily.chen.work@gmail.com', accountId: 'EB-2202', status: 'PENDING_REVIEW',
          cardNumber: '5500 1122 3344 5566', cvv: '789', cardExpiry: '08/27',
          cardImages: ['/uploads/emily-chen-edgeboost-card.jpg'],
        },
        draftkings: { username: 'EChenDK', accountId: 'DK-8802', status: 'VERIFIED' },
        fanduel: { username: 'EChenFD', accountId: 'FD-4402', status: 'VERIFIED' },
        betmgm: { username: 'emily.chen.work@gmail.com', accountId: 'MGM-6602', status: 'VERIFIED' },
        betrivers: { username: 'EChenBR', accountId: 'BR-1102' },
        bet365: { username: 'EChen365', accountId: '365-9902' },
      },
      generatedCredentials: {
        gmailPassword: 'EChen#2026!',
        betmgmPassword: 'BetMGM#Emily2026',
        platformPasswords: {
          sportsbook: 'SBook#Emily2026',
          BETMGM: 'BetMGM#Emily2026',
          PAYPAL: 'PPal#Emily2026',
          ONLINE_BANKING: 'Bank#Emily2026',
          EDGEBOOST: 'Edge#Emily2026',
        },
        bankPin4: '1234',
        bankPin6: '123400',
      },
      contractDocument: '/uploads/emily-chen-contract.pdf',
      createdAt: new Date('2026-02-08'),
      updatedAt: new Date('2026-02-11'),
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
  const client3 = await prisma.client.create({
    data: {
      firstName: 'Robert',
      lastName: 'Kim',
      email: 'sample-client-3@example.com',
      phone: '(555) 500-0003',
      status: 'PENDING',
      closerId: agent.id,
    },
  })

  // Create linked ClientDraft for Client 3 (Robert Kim — submitted, pending approval)
  const draft3 = await prisma.clientDraft.create({
    data: {
      closerId: agent.id,
      status: 'SUBMITTED',
      step: 4,
      resultClientId: client3.id,
      firstName: 'Robert',
      lastName: 'Kim',
      email: 'sample-client-3@example.com',
      phone: '(555) 500-0003',
      dateOfBirth: new Date('1990-01-10'),
      idNumber: 'DL-11225577',
      idExpiry: new Date('2027-03-20'),
      address: '300 Michigan Ave, Chicago, IL 60601',
      citizenship: 'US',
      assignedGmail: 'robert.kim.work@gmail.com',
      gmailPassword: 'RKim#2026!',
      betmgmCheckPassed: true,
      betmgmLogin: 'robert.kim.work@gmail.com',
      betmgmPassword: 'BetMGM#Robert2026',
      ssnNumber: '***-**-3456',
      bankingHistory: 'Chase savings + checking, 7yr',
      paypalPreviouslyUsed: false,
      debankedHistory: true,
      debankedBank: 'Wells Fargo',
      hasCriminalRecord: false,
      addressMismatch: false,
      undisclosedInfo: false,
      occupation: 'Accountant',
      annualIncome: '$100,000+',
      employmentStatus: 'Employed Full-Time',
      maritalStatus: 'Single',
      platformData: {
        paypal: { username: 'robert.kim.work@gmail.com', status: 'PENDING_REVIEW' },
        onlineBanking: { username: 'robert.kim.work@gmail.com', accountId: 'CHK-3303', bank: 'Chase', status: 'PENDING_REVIEW' },
        draftkings: { username: 'RKimDK', accountId: 'DK-5503', status: 'PENDING_REVIEW' },
        fanduel: { username: 'RKimFD', accountId: 'FD-7703' },
        betmgm: { username: 'robert.kim.work@gmail.com', accountId: 'MGM-9903' },
      },
      generatedCredentials: {
        gmailPassword: 'RKim#2026!',
        betmgmPassword: 'BetMGM#Robert2026',
        platformPasswords: {
          sportsbook: 'SBook#Robert2026',
          BETMGM: 'BetMGM#Robert2026',
          PAYPAL: 'PPal#Robert2026',
          ONLINE_BANKING: 'Bank#Robert2026',
        },
        bankPin4: '2580',
        bankPin6: '258000',
      },
      contractDocument: '/uploads/robert-kim-contract.pdf',
      createdAt: new Date('2026-02-20'),
      updatedAt: new Date('2026-02-25'),
    },
  })
  console.log(`  Created client 3 (Robert Kim) — pending, no bonus pool`)

  // ── Phone Assignments for Sample Clients ─────────────────
  // These simulate device assignments during the intake process

  await prisma.phoneAssignment.create({
    data: {
      phoneNumber: '(555) 888-0001',
      carrier: 'Verizon',
      deviceId: 'IMEI-1001001001',
      clientDraftId: draft1.id,
      agentId: agent.id,
      signedOutById: boStaff.id,
      signedOutAt: new Date('2026-02-06'),
      dueBackAt: new Date('2026-02-09'),
      returnedAt: new Date('2026-02-08'),
      status: 'RETURNED',
    },
  })

  await prisma.phoneAssignment.create({
    data: {
      phoneNumber: '(555) 888-0002',
      carrier: 'T-Mobile',
      deviceId: 'IMEI-2002002002',
      clientDraftId: draft2.id,
      agentId: approvedUser.id,
      signedOutById: boStaff.id,
      signedOutAt: new Date('2026-02-09'),
      dueBackAt: new Date('2026-02-12'),
      returnedAt: new Date('2026-02-11'),
      status: 'RETURNED',
    },
  })

  await prisma.phoneAssignment.create({
    data: {
      phoneNumber: '(555) 888-0003',
      carrier: 'AT&T',
      deviceId: 'IMEI-3003003003',
      clientDraftId: draft3.id,
      agentId: agent.id,
      signedOutById: boStaff.id,
      signedOutAt: new Date('2026-02-21'),
      dueBackAt: new Date('2026-02-24'),
      status: 'SIGNED_OUT',
    },
  })
  console.log('  Created phone assignments for 3 sample clients')

  // ── Transactions for Approved Clients ──────────────────────
  // Simulate fund deposits and withdrawals

  // David Wilson — 4 transactions
  await prisma.transaction.createMany({
    data: [
      {
        clientId: client1.id,
        type: 'DEPOSIT',
        amount: 500.00,
        description: 'Initial deposit to DraftKings',
        platformType: 'DRAFTKINGS',
        createdAt: new Date('2026-02-11'),
      },
      {
        clientId: client1.id,
        type: 'DEPOSIT',
        amount: 300.00,
        description: 'Deposit to FanDuel',
        platformType: 'FANDUEL',
        createdAt: new Date('2026-02-13'),
      },
      {
        clientId: client1.id,
        type: 'DEPOSIT',
        amount: 200.00,
        description: 'PayPal fund transfer',
        platformType: 'PAYPAL',
        createdAt: new Date('2026-02-15'),
      },
      {
        clientId: client1.id,
        type: 'WITHDRAWAL',
        amount: 150.00,
        description: 'Withdrawal from DraftKings',
        platformType: 'DRAFTKINGS',
        createdAt: new Date('2026-02-20'),
      },
    ],
  })

  // Emily Chen — 3 transactions
  await prisma.transaction.createMany({
    data: [
      {
        clientId: client2.id,
        type: 'DEPOSIT',
        amount: 400.00,
        description: 'Initial deposit to BetMGM',
        platformType: 'BETMGM',
        createdAt: new Date('2026-02-13'),
      },
      {
        clientId: client2.id,
        type: 'DEPOSIT',
        amount: 250.00,
        description: 'Bank transfer deposit',
        platformType: 'ONLINE_BANKING',
        createdAt: new Date('2026-02-16'),
      },
      {
        clientId: client2.id,
        type: 'WITHDRAWAL',
        amount: 100.00,
        description: 'PayPal withdrawal',
        platformType: 'PAYPAL',
        createdAt: new Date('2026-02-22'),
      },
    ],
  })
  console.log('  Created transactions for approved clients')

  // ── Sample Client Draft ────────────────────────────────

  // Delete in dependency order: Todo → PhoneAssignment → ClientDraft
  await prisma.todo.deleteMany({
    where: { clientDraft: { closerId: agent.id } },
  })
  await prisma.phoneAssignment.deleteMany({
    where: { clientDraft: { closerId: agent.id } },
  })
  await prisma.clientDraft.deleteMany({ where: { closerId: agent.id, resultClientId: null } })
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

  // ── Additional Step 3 & 4 Drafts (for testing the last intake steps) ────

  // Michael Thompson — Step 3, ~5/11 platforms done
  const draftMichael = await prisma.clientDraft.create({
    data: {
      closerId: agent.id,
      status: 'DRAFT',
      step: 3,
      firstName: 'Michael',
      lastName: 'Thompson',
      email: 'michael.t@example.com',
      phone: '(555) 600-0010',
      idDocument: '/uploads/michael-thompson-id.jpg',
      idNumber: 'DL-44556677',
      idExpiry: new Date('2029-04-15'),
      dateOfBirth: new Date('1988-11-03'),
      address: '555 Oak Boulevard, Denver, CO 80203',
      citizenship: 'US',
      assignedGmail: 'michael.thompson.work@gmail.com',
      gmailPassword: 'MThom#2026!',
      gmailScreenshot: '/uploads/michael-gmail-screenshot.jpg',
      betmgmCheckPassed: true,
      betmgmLogin: 'michael.thompson.work@gmail.com',
      betmgmPassword: 'BetMGM#Michael2026',
      betmgmRegScreenshot: '/uploads/michael-betmgm-reg.jpg',
      betmgmLoginScreenshot: '/uploads/michael-betmgm-login.jpg',
      ssnDocument: '/uploads/michael-ssn.jpg',
      ssnNumber: '***-**-7890',
      bankingHistory: 'BOA checking, good standing 4yr',
      paypalPreviouslyUsed: false,
      debankedHistory: false,
      hasCriminalRecord: false,
      addressMismatch: false,
      undisclosedInfo: false,
      occupation: 'Sales Manager',
      annualIncome: '$75,000-$100,000',
      employmentStatus: 'Employed Full-Time',
      maritalStatus: 'Married',
      deviceReservationDate: new Date().toISOString().split('T')[0],
      platformData: [
        { platform: 'PAYPAL', username: 'michael.thompson.work@gmail.com', accountId: '', screenshot: '/uploads/michael-paypal.jpg', status: 'VERIFIED' },
        { platform: 'ONLINE_BANKING', username: 'michael.thompson.work@gmail.com', accountId: 'CHK-8801', screenshot: '/uploads/michael-bank.jpg', bank: 'Bank of America', status: 'VERIFIED', routingNumber: '026009593', bankAccountNumber: '3847291056', pin: '2580' },
        { platform: 'DRAFTKINGS', username: 'MThompDK', accountId: 'DK-4401', screenshot: '/uploads/michael-dk.jpg', screenshotPersonalInfo: '/uploads/michael-dk-info.jpg', screenshotDeposit: '/uploads/michael-dk-deposit.jpg', status: 'VERIFIED' },
        { platform: 'FANDUEL', username: 'MThompFD', accountId: 'FD-5501', screenshot: '/uploads/michael-fd.jpg', screenshotPersonalInfo: '/uploads/michael-fd-info.jpg', status: 'VERIFIED' },
        { platform: 'BETMGM', username: 'michael.thompson.work@gmail.com', accountId: 'MGM-6601', screenshot: '/uploads/michael-mgm.jpg', status: 'VERIFIED' },
        { platform: 'EDGEBOOST', username: '', accountId: '', screenshot: '', status: '' },
        { platform: 'CAESARS', username: '', accountId: '', screenshot: '', status: '' },
        { platform: 'FANATICS', username: '', accountId: '', screenshot: '', status: '' },
        { platform: 'BETRIVERS', username: '', accountId: '', screenshot: '', status: '' },
        { platform: 'BET365', username: '', accountId: '', screenshot: '', status: '' },
        { platform: 'ESPNBET', username: '', accountId: '', screenshot: '', status: '' },
      ],
      generatedCredentials: {
        gmailPassword: 'MThom#2026!',
        betmgmPassword: 'BetMGM#Michael2026',
        platformPasswords: {
          sportsbook: 'SBook#Michael2026',
          BETMGM: 'BetMGM#Michael2026',
          PAYPAL: 'PPal#Michael2026',
          ONLINE_BANKING: 'Bank#Michael2026',
          EDGEBOOST: 'Edge#Michael2026',
        },
        bankPin4: '2580',
        bankPin6: '258000',
      },
    },
  })
  await prisma.phoneAssignment.create({
    data: {
      phoneNumber: '(555) 777-0010',
      carrier: 'Verizon',
      deviceId: 'IMEI-1010101010',
      clientDraftId: draftMichael.id,
      agentId: agent.id,
      signedOutById: boStaff.id,
      signedOutAt: signOutDate,
      dueBackAt: dueBackDate,
      status: 'SIGNED_OUT',
    },
  })
  console.log(`  Created step-3 draft: Michael Thompson (5/11 platforms)`)

  // Jennifer Rodriguez — Step 3, ~9/11 platforms done
  const draftJennifer = await prisma.clientDraft.create({
    data: {
      closerId: agent.id,
      status: 'DRAFT',
      step: 3,
      firstName: 'Jennifer',
      lastName: 'Rodriguez',
      email: 'jennifer.r@example.com',
      phone: '(555) 600-0011',
      idDocument: '/uploads/jennifer-rodriguez-id.jpg',
      idNumber: 'DL-99887766',
      idExpiry: new Date('2028-09-10'),
      dateOfBirth: new Date('1994-06-22'),
      address: '1200 Elm Street, Austin, TX 78701',
      citizenship: 'US',
      assignedGmail: 'jennifer.rodriguez.work@gmail.com',
      gmailPassword: 'JRodr#2026!',
      gmailScreenshot: '/uploads/jennifer-gmail-screenshot.jpg',
      betmgmCheckPassed: true,
      betmgmLogin: 'jennifer.rodriguez.work@gmail.com',
      betmgmPassword: 'BetMGM#Jennifer2026',
      betmgmRegScreenshot: '/uploads/jennifer-betmgm-reg.jpg',
      betmgmLoginScreenshot: '/uploads/jennifer-betmgm-login.jpg',
      ssnDocument: '/uploads/jennifer-ssn.jpg',
      ssnNumber: '***-**-2345',
      bankingHistory: 'Wells Fargo checking, 6yr history',
      paypalPreviouslyUsed: true,
      debankedHistory: false,
      hasCriminalRecord: false,
      addressMismatch: false,
      undisclosedInfo: false,
      occupation: 'Graphic Designer',
      annualIncome: '$50,000-$75,000',
      employmentStatus: 'Employed Full-Time',
      maritalStatus: 'Single',
      deviceReservationDate: new Date().toISOString().split('T')[0],
      platformData: [
        { platform: 'PAYPAL', username: 'jennifer.rodriguez.work@gmail.com', accountId: 'PP-2201', screenshot: '/uploads/jennifer-paypal.jpg', status: 'VERIFIED' },
        { platform: 'ONLINE_BANKING', username: 'jennifer.rodriguez.work@gmail.com', accountId: 'CHK-7702', screenshot: '/uploads/jennifer-bank.jpg', bank: 'Wells Fargo', status: 'VERIFIED', routingNumber: '121000248', bankAccountNumber: '5566778899', pin: '2580' },
        { platform: 'EDGEBOOST', username: 'jennifer.rodriguez.work@gmail.com', accountId: 'EB-3301', screenshot: '/uploads/jennifer-edge.jpg', status: 'VERIFIED' },
        { platform: 'DRAFTKINGS', username: 'JRodrDK', accountId: 'DK-9901', screenshot: '/uploads/jennifer-dk.jpg', screenshotPersonalInfo: '/uploads/jennifer-dk-info.jpg', screenshotDeposit: '/uploads/jennifer-dk-deposit.jpg', status: 'VERIFIED' },
        { platform: 'FANDUEL', username: 'JRodrFD', accountId: 'FD-8801', screenshot: '/uploads/jennifer-fd.jpg', screenshotPersonalInfo: '/uploads/jennifer-fd-info.jpg', screenshotDeposit: '/uploads/jennifer-fd-deposit.jpg', status: 'VERIFIED' },
        { platform: 'BETMGM', username: 'jennifer.rodriguez.work@gmail.com', accountId: 'MGM-7701', screenshot: '/uploads/jennifer-mgm.jpg', screenshotPersonalInfo: '/uploads/jennifer-mgm-info.jpg', screenshotDeposit: '/uploads/jennifer-mgm-deposit.jpg', status: 'VERIFIED' },
        { platform: 'CAESARS', username: 'JRodrCZR', accountId: 'CZR-6601', screenshot: '/uploads/jennifer-czr.jpg', screenshotPersonalInfo: '/uploads/jennifer-czr-info.jpg', screenshotDeposit: '/uploads/jennifer-czr-deposit.jpg', status: 'VERIFIED' },
        { platform: 'FANATICS', username: 'JRodrFAN', accountId: 'FAN-5501', screenshot: '/uploads/jennifer-fan.jpg', screenshotPersonalInfo: '/uploads/jennifer-fan-info.jpg', status: 'VERIFIED' },
        { platform: 'BETRIVERS', username: 'JRodrBR', accountId: 'BR-4401', screenshot: '/uploads/jennifer-br.jpg', screenshotPersonalInfo: '/uploads/jennifer-br-info.jpg', screenshotDeposit: '/uploads/jennifer-br-deposit.jpg', status: 'VERIFIED' },
        { platform: 'BET365', username: '', accountId: '', screenshot: '', status: '' },
        { platform: 'ESPNBET', username: '', accountId: '', screenshot: '', status: '' },
      ],
      generatedCredentials: {
        gmailPassword: 'JRodr#2026!',
        betmgmPassword: 'BetMGM#Jennifer2026',
        platformPasswords: {
          sportsbook: 'SBook#Jennifer2026',
          BETMGM: 'BetMGM#Jennifer2026',
          PAYPAL: 'PPal#Jennifer2026',
          ONLINE_BANKING: 'Bank#Jennifer2026',
          EDGEBOOST: 'Edge#Jennifer2026',
        },
        bankPin4: '2580',
        bankPin6: '258000',
      },
    },
  })
  await prisma.phoneAssignment.create({
    data: {
      phoneNumber: '(555) 777-0011',
      carrier: 'AT&T',
      deviceId: 'IMEI-2020202020',
      clientDraftId: draftJennifer.id,
      agentId: agent.id,
      signedOutById: boStaff.id,
      signedOutAt: signOutDate,
      dueBackAt: dueBackDate,
      status: 'SIGNED_OUT',
    },
  })
  console.log(`  Created step-3 draft: Jennifer Rodriguez (9/11 platforms)`)

  // Andrew Park — Step 4, all platforms done, no contract yet
  const draftAndrew = await prisma.clientDraft.create({
    data: {
      closerId: agent.id,
      status: 'DRAFT',
      step: 4,
      firstName: 'Andrew',
      lastName: 'Park',
      email: 'andrew.p@example.com',
      phone: '(555) 600-0012',
      idDocument: '/uploads/andrew-park-id.jpg',
      idNumber: 'DL-12341234',
      idExpiry: new Date('2029-01-20'),
      dateOfBirth: new Date('1991-02-14'),
      address: '890 Pine Street, Seattle, WA 98101',
      citizenship: 'US',
      assignedGmail: 'andrew.park.work@gmail.com',
      gmailPassword: 'APark#2026!',
      gmailScreenshot: '/uploads/andrew-gmail-screenshot.jpg',
      betmgmCheckPassed: true,
      betmgmLogin: 'andrew.park.work@gmail.com',
      betmgmPassword: 'BetMGM#Andrew2026',
      betmgmRegScreenshot: '/uploads/andrew-betmgm-reg.jpg',
      betmgmLoginScreenshot: '/uploads/andrew-betmgm-login.jpg',
      ssnDocument: '/uploads/andrew-ssn.jpg',
      ssnNumber: '***-**-6789',
      bankingHistory: 'US Bank checking + savings, 8yr',
      paypalPreviouslyUsed: false,
      debankedHistory: false,
      hasCriminalRecord: false,
      addressMismatch: false,
      undisclosedInfo: false,
      occupation: 'Data Analyst',
      annualIncome: '$75,000-$100,000',
      employmentStatus: 'Employed Full-Time',
      maritalStatus: 'Single',
      deviceReservationDate: new Date().toISOString().split('T')[0],
      platformData: [
        { platform: 'PAYPAL', username: 'andrew.park.work@gmail.com', accountId: 'PP-1201', screenshot: '/uploads/andrew-paypal.jpg', status: 'VERIFIED' },
        { platform: 'ONLINE_BANKING', username: 'andrew.park.work@gmail.com', accountId: 'CHK-3401', screenshot: '/uploads/andrew-bank.jpg', bank: 'US Bank', status: 'VERIFIED', routingNumber: '091000019', bankAccountNumber: '1122334455', pin: '2580' },
        { platform: 'EDGEBOOST', username: 'andrew.park.work@gmail.com', accountId: 'EB-1101', screenshot: '/uploads/andrew-edge.jpg', status: 'VERIFIED' },
        { platform: 'DRAFTKINGS', username: 'AParkDK', accountId: 'DK-2201', screenshot: '/uploads/andrew-dk.jpg', screenshotPersonalInfo: '/uploads/andrew-dk-info.jpg', screenshotDeposit: '/uploads/andrew-dk-deposit.jpg', status: 'VERIFIED' },
        { platform: 'FANDUEL', username: 'AParkFD', accountId: 'FD-3301', screenshot: '/uploads/andrew-fd.jpg', screenshotPersonalInfo: '/uploads/andrew-fd-info.jpg', screenshotDeposit: '/uploads/andrew-fd-deposit.jpg', status: 'VERIFIED' },
        { platform: 'BETMGM', username: 'andrew.park.work@gmail.com', accountId: 'MGM-4401', screenshot: '/uploads/andrew-mgm.jpg', screenshotPersonalInfo: '/uploads/andrew-mgm-info.jpg', screenshotDeposit: '/uploads/andrew-mgm-deposit.jpg', status: 'VERIFIED' },
        { platform: 'CAESARS', username: 'AParkCZR', accountId: 'CZR-5501', screenshot: '/uploads/andrew-czr.jpg', screenshotPersonalInfo: '/uploads/andrew-czr-info.jpg', screenshotDeposit: '/uploads/andrew-czr-deposit.jpg', status: 'VERIFIED' },
        { platform: 'FANATICS', username: 'AParkFAN', accountId: 'FAN-6601', screenshot: '/uploads/andrew-fan.jpg', screenshotPersonalInfo: '/uploads/andrew-fan-info.jpg', screenshotDeposit: '/uploads/andrew-fan-deposit.jpg', status: 'VERIFIED' },
        { platform: 'BETRIVERS', username: 'AParkBR', accountId: 'BR-7701', screenshot: '/uploads/andrew-br.jpg', screenshotPersonalInfo: '/uploads/andrew-br-info.jpg', screenshotDeposit: '/uploads/andrew-br-deposit.jpg', status: 'VERIFIED' },
        { platform: 'BET365', username: 'APark365', accountId: '365-8801', screenshot: '/uploads/andrew-365.jpg', screenshotPersonalInfo: '/uploads/andrew-365-info.jpg', screenshotDeposit: '/uploads/andrew-365-deposit.jpg', status: 'VERIFIED' },
        { platform: 'ESPNBET', username: 'AParkESPN', accountId: 'ESPN-9901', screenshot: '/uploads/andrew-espn.jpg', screenshotPersonalInfo: '/uploads/andrew-espn-info.jpg', screenshotDeposit: '/uploads/andrew-espn-deposit.jpg', status: 'VERIFIED' },
      ],
      generatedCredentials: {
        gmailPassword: 'APark#2026!',
        betmgmPassword: 'BetMGM#Andrew2026',
        platformPasswords: {
          sportsbook: 'SBook#Andrew2026',
          BETMGM: 'BetMGM#Andrew2026',
          PAYPAL: 'PPal#Andrew2026',
          ONLINE_BANKING: 'Bank#Andrew2026',
          EDGEBOOST: 'Edge#Andrew2026',
        },
        bankPin4: '2580',
        bankPin6: '258000',
      },
    },
  })
  await prisma.phoneAssignment.create({
    data: {
      phoneNumber: '(555) 777-0012',
      carrier: 'T-Mobile',
      deviceId: 'IMEI-3030303030',
      clientDraftId: draftAndrew.id,
      agentId: agent.id,
      signedOutById: boStaff.id,
      signedOutAt: signOutDate,
      dueBackAt: dueBackDate,
      status: 'SIGNED_OUT',
    },
  })
  console.log(`  Created step-4 draft: Andrew Park (11/11 platforms, no contract)`)

  // Lisa Nguyen — Step 4, all platforms done + contract uploaded, ready to submit
  const draftLisa = await prisma.clientDraft.create({
    data: {
      closerId: agent.id,
      status: 'DRAFT',
      step: 4,
      firstName: 'Lisa',
      lastName: 'Nguyen',
      email: 'lisa.n@example.com',
      phone: '(555) 600-0013',
      idDocument: '/uploads/lisa-nguyen-id.jpg',
      idNumber: 'DL-56785678',
      idExpiry: new Date('2028-12-05'),
      dateOfBirth: new Date('1993-09-18'),
      address: '2300 Market Street, Philadelphia, PA 19103',
      citizenship: 'US',
      assignedGmail: 'lisa.nguyen.work@gmail.com',
      gmailPassword: 'LNguy#2026!',
      gmailScreenshot: '/uploads/lisa-gmail-screenshot.jpg',
      betmgmCheckPassed: true,
      betmgmLogin: 'lisa.nguyen.work@gmail.com',
      betmgmPassword: 'BetMGM#Lisa2026',
      betmgmRegScreenshot: '/uploads/lisa-betmgm-reg.jpg',
      betmgmLoginScreenshot: '/uploads/lisa-betmgm-login.jpg',
      ssnDocument: '/uploads/lisa-ssn.jpg',
      ssnNumber: '***-**-4321',
      bankingHistory: 'PNC checking, good standing 5yr',
      paypalPreviouslyUsed: false,
      debankedHistory: false,
      hasCriminalRecord: false,
      addressMismatch: false,
      undisclosedInfo: false,
      occupation: 'Nurse Practitioner',
      annualIncome: '$100,000+',
      employmentStatus: 'Employed Full-Time',
      maritalStatus: 'Married',
      agentConfidenceLevel: 'high',
      deviceReservationDate: new Date().toISOString().split('T')[0],
      platformData: [
        { platform: 'PAYPAL', username: 'lisa.nguyen.work@gmail.com', accountId: 'PP-5501', screenshot: '/uploads/lisa-paypal.jpg', status: 'VERIFIED' },
        { platform: 'ONLINE_BANKING', username: 'lisa.nguyen.work@gmail.com', accountId: 'CHK-6601', screenshot: '/uploads/lisa-bank.jpg', bank: 'PNC', status: 'VERIFIED', routingNumber: '031100089', bankAccountNumber: '9988776655', pin: '2580' },
        { platform: 'EDGEBOOST', username: 'lisa.nguyen.work@gmail.com', accountId: 'EB-7701', screenshot: '/uploads/lisa-edge.jpg', status: 'VERIFIED' },
        { platform: 'DRAFTKINGS', username: 'LNguyDK', accountId: 'DK-1101', screenshot: '/uploads/lisa-dk.jpg', screenshotPersonalInfo: '/uploads/lisa-dk-info.jpg', screenshotDeposit: '/uploads/lisa-dk-deposit.jpg', status: 'VERIFIED' },
        { platform: 'FANDUEL', username: 'LNguyFD', accountId: 'FD-2201', screenshot: '/uploads/lisa-fd.jpg', screenshotPersonalInfo: '/uploads/lisa-fd-info.jpg', screenshotDeposit: '/uploads/lisa-fd-deposit.jpg', status: 'VERIFIED' },
        { platform: 'BETMGM', username: 'lisa.nguyen.work@gmail.com', accountId: 'MGM-3301', screenshot: '/uploads/lisa-mgm.jpg', screenshotPersonalInfo: '/uploads/lisa-mgm-info.jpg', screenshotDeposit: '/uploads/lisa-mgm-deposit.jpg', status: 'VERIFIED' },
        { platform: 'CAESARS', username: 'LNguyCZR', accountId: 'CZR-4401', screenshot: '/uploads/lisa-czr.jpg', screenshotPersonalInfo: '/uploads/lisa-czr-info.jpg', screenshotDeposit: '/uploads/lisa-czr-deposit.jpg', status: 'VERIFIED' },
        { platform: 'FANATICS', username: 'LNguyFAN', accountId: 'FAN-5501', screenshot: '/uploads/lisa-fan.jpg', screenshotPersonalInfo: '/uploads/lisa-fan-info.jpg', screenshotDeposit: '/uploads/lisa-fan-deposit.jpg', status: 'VERIFIED' },
        { platform: 'BETRIVERS', username: 'LNguyBR', accountId: 'BR-6601', screenshot: '/uploads/lisa-br.jpg', screenshotPersonalInfo: '/uploads/lisa-br-info.jpg', screenshotDeposit: '/uploads/lisa-br-deposit.jpg', status: 'VERIFIED' },
        { platform: 'BET365', username: 'LNguy365', accountId: '365-7701', screenshot: '/uploads/lisa-365.jpg', screenshotPersonalInfo: '/uploads/lisa-365-info.jpg', screenshotDeposit: '/uploads/lisa-365-deposit.jpg', status: 'VERIFIED' },
        { platform: 'ESPNBET', username: 'LNguyESPN', accountId: 'ESPN-8801', screenshot: '/uploads/lisa-espn.jpg', screenshotPersonalInfo: '/uploads/lisa-espn-info.jpg', screenshotDeposit: '/uploads/lisa-espn-deposit.jpg', status: 'VERIFIED' },
      ],
      generatedCredentials: {
        gmailPassword: 'LNguy#2026!',
        betmgmPassword: 'BetMGM#Lisa2026',
        platformPasswords: {
          sportsbook: 'SBook#Lisa2026',
          BETMGM: 'BetMGM#Lisa2026',
          PAYPAL: 'PPal#Lisa2026',
          ONLINE_BANKING: 'Bank#Lisa2026',
          EDGEBOOST: 'Edge#Lisa2026',
        },
        bankPin4: '2580',
        bankPin6: '258000',
      },
      contractDocument: '/uploads/lisa-nguyen-contract.pdf',
    },
  })
  await prisma.phoneAssignment.create({
    data: {
      phoneNumber: '(555) 777-0013',
      carrier: 'Verizon',
      deviceId: 'IMEI-4040404040',
      clientDraftId: draftLisa.id,
      agentId: agent.id,
      signedOutById: boStaff.id,
      signedOutAt: signOutDate,
      dueBackAt: dueBackDate,
      status: 'SIGNED_OUT',
    },
  })
  console.log(`  Created step-4 draft: Lisa Nguyen (11/11 platforms + contract, ready to submit)`)

  // ── Sample Todo ──────────────────────────────────────────

  await prisma.todo.deleteMany({ where: { clientDraftId: sampleDraft.id } })
  const todoDueDate = new Date()
  todoDueDate.setDate(todoDueDate.getDate() + 3)
  const sampleTodo = await prisma.todo.create({
    data: {
      title: 'Contact Bank',
      description: 'Contact Bank — Sarah Martinez',
      issueCategory: 'Contact Bank',
      clientDraftId: sampleDraft.id,
      assignedToId: agent.id,
      createdById: boStaff.id,
      dueDate: todoDueDate,
      status: 'PENDING',
    },
  })
  console.log(`  Created sample todo: ${sampleTodo.id} (Contact Bank, assigned to Marcus, due ${todoDueDate.toISOString().split('T')[0]})`)

  // ── Sample Fund Allocations ───────────────────────────────
  // Mix of UNCONFIRMED, CONFIRMED, and DISCREPANCY for testing

  await prisma.fundAllocation.deleteMany({})
  await prisma.fundAllocation.createMany({
    data: [
      {
        amount: 500.00,
        platform: 'DraftKings',
        direction: 'DEPOSIT',
        notes: 'Initial fund deposit for David Wilson accounts',
        recordedById: boStaff.id,
        confirmationStatus: 'CONFIRMED',
        confirmedAt: new Date('2026-02-11T10:00:00'),
        confirmedById: admin.id,
        confirmedAmount: 500.00,
        createdAt: new Date('2026-02-11T08:00:00'),
      },
      {
        amount: 300.00,
        platform: 'FanDuel',
        direction: 'DEPOSIT',
        notes: 'FanDuel deposit for David Wilson',
        recordedById: boStaff.id,
        confirmationStatus: 'CONFIRMED',
        confirmedAt: new Date('2026-02-13T14:00:00'),
        confirmedById: boStaff.id,
        confirmedAmount: 300.00,
        createdAt: new Date('2026-02-13T09:00:00'),
      },
      {
        amount: 200.00,
        platform: 'PayPal',
        direction: 'DEPOSIT',
        notes: 'PayPal transfer for David Wilson',
        recordedById: boStaff.id,
        confirmationStatus: 'DISCREPANCY',
        confirmedAt: new Date('2026-02-15T16:00:00'),
        confirmedById: admin.id,
        confirmedAmount: 185.50,
        discrepancyNotes: 'PayPal fee deducted $14.50',
        createdAt: new Date('2026-02-15T08:00:00'),
      },
      {
        amount: 150.00,
        platform: 'DraftKings',
        direction: 'WITHDRAWAL',
        notes: 'DraftKings withdrawal for David Wilson',
        recordedById: boStaff.id,
        confirmationStatus: 'UNCONFIRMED',
        createdAt: new Date('2026-02-20T10:00:00'),
      },
      {
        amount: 400.00,
        platform: 'BetMGM',
        direction: 'DEPOSIT',
        notes: 'BetMGM deposit for Emily Chen accounts',
        recordedById: boStaff.id,
        confirmationStatus: 'UNCONFIRMED',
        createdAt: new Date('2026-02-25T09:00:00'),
      },
      {
        amount: 250.00,
        platform: 'Online Banking',
        direction: 'DEPOSIT',
        notes: 'Bank transfer for Emily Chen',
        recordedById: boStaff.id,
        confirmationStatus: 'UNCONFIRMED',
        createdAt: new Date('2026-02-27T11:00:00'),
      },
    ],
  })
  console.log('  Created sample fund allocations (2 confirmed, 1 discrepancy, 3 unconfirmed)')

  // ── Event Logs ─────────────────────────────────────────
  // General system events
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
        eventType: 'TODO_ASSIGNED',
        description: 'To-do assigned: "Contact Bank" for Sarah Martinez to Marcus Rivera',
        userId: boStaff.id,
        metadata: {
          todoId: sampleTodo.id,
          clientDraftId: sampleDraft.id,
          clientName: 'Sarah Martinez',
          agentId: agent.id,
          agentName: 'Marcus Rivera',
          issueCategory: 'Contact Bank',
        },
      },
    ],
  })

  // Client-specific event logs (with metadata.clientId for timeline queries)
  // David Wilson — 7 lifecycle events
  await prisma.eventLog.createMany({
    data: [
      {
        eventType: 'CLIENT_DRAFT_CREATED',
        description: 'Client intake started for David Wilson by Marcus Rivera',
        userId: agent.id,
        metadata: { clientId: client1.id, clientName: 'David Wilson', agentName: 'Marcus Rivera' },
        createdAt: new Date('2026-02-05'),
      },
      {
        eventType: 'DEVICE_SIGNED_OUT',
        description: 'Device (555) 888-0001 signed out for David Wilson',
        userId: boStaff.id,
        metadata: { clientId: client1.id, clientName: 'David Wilson', phoneNumber: '(555) 888-0001', carrier: 'Verizon' },
        createdAt: new Date('2026-02-06'),
      },
      {
        eventType: 'DEVICE_RETURNED',
        description: 'Device (555) 888-0001 returned for David Wilson',
        userId: boStaff.id,
        metadata: { clientId: client1.id, clientName: 'David Wilson', phoneNumber: '(555) 888-0001' },
        createdAt: new Date('2026-02-08'),
      },
      {
        eventType: 'CLIENT_DRAFT_SUBMITTED',
        description: 'Client intake submitted for David Wilson',
        userId: agent.id,
        metadata: { clientId: client1.id, clientName: 'David Wilson' },
        createdAt: new Date('2026-02-09'),
      },
      {
        eventType: 'CLIENT_APPROVED',
        description: 'Client David Wilson approved',
        userId: boStaff.id,
        metadata: { clientId: client1.id, clientName: 'David Wilson' },
        createdAt: new Date('2026-02-10'),
      },
      {
        eventType: 'BONUS_POOL_CREATED',
        description: 'Bonus pool ($400) created for David Wilson',
        userId: admin.id,
        metadata: { clientId: client1.id, clientName: 'David Wilson', totalAmount: 400 },
        createdAt: new Date('2026-02-10T01:00:00'),
      },
      {
        eventType: 'BONUS_POOL_DISTRIBUTED',
        description: 'Bonus pool distributed for David Wilson — $200 direct + 4 star slices',
        userId: agent.id,
        metadata: { clientId: client1.id, clientName: 'David Wilson', distributedSlices: 4 },
        createdAt: new Date('2026-02-10T02:00:00'),
      },
    ],
  })

  // Emily Chen — 6 lifecycle events
  await prisma.eventLog.createMany({
    data: [
      {
        eventType: 'CLIENT_DRAFT_CREATED',
        description: 'Client intake started for Emily Chen by Jamie Torres',
        userId: approvedUser.id,
        metadata: { clientId: client2.id, clientName: 'Emily Chen', agentName: 'Jamie Torres' },
        createdAt: new Date('2026-02-08'),
      },
      {
        eventType: 'DEVICE_SIGNED_OUT',
        description: 'Device (555) 888-0002 signed out for Emily Chen',
        userId: boStaff.id,
        metadata: { clientId: client2.id, clientName: 'Emily Chen', phoneNumber: '(555) 888-0002', carrier: 'T-Mobile' },
        createdAt: new Date('2026-02-09'),
      },
      {
        eventType: 'DEVICE_RETURNED',
        description: 'Device (555) 888-0002 returned for Emily Chen',
        userId: boStaff.id,
        metadata: { clientId: client2.id, clientName: 'Emily Chen', phoneNumber: '(555) 888-0002' },
        createdAt: new Date('2026-02-11'),
      },
      {
        eventType: 'CLIENT_DRAFT_SUBMITTED',
        description: 'Client intake submitted for Emily Chen',
        userId: approvedUser.id,
        metadata: { clientId: client2.id, clientName: 'Emily Chen' },
        createdAt: new Date('2026-02-11T01:00:00'),
      },
      {
        eventType: 'CLIENT_APPROVED',
        description: 'Client Emily Chen approved',
        userId: boStaff.id,
        metadata: { clientId: client2.id, clientName: 'Emily Chen' },
        createdAt: new Date('2026-02-12'),
      },
      {
        eventType: 'BONUS_POOL_DISTRIBUTED',
        description: 'Bonus pool distributed for Emily Chen — $200 direct + 4 star slices',
        userId: approvedUser.id,
        metadata: { clientId: client2.id, clientName: 'Emily Chen', distributedSlices: 4 },
        createdAt: new Date('2026-02-12T01:00:00'),
      },
    ],
  })

  // Robert Kim — 3 lifecycle events (pending, no approval yet)
  await prisma.eventLog.createMany({
    data: [
      {
        eventType: 'CLIENT_DRAFT_CREATED',
        description: 'Client intake started for Robert Kim by Marcus Rivera',
        userId: agent.id,
        metadata: { clientId: client3.id, clientName: 'Robert Kim', agentName: 'Marcus Rivera' },
        createdAt: new Date('2026-02-20'),
      },
      {
        eventType: 'DEVICE_SIGNED_OUT',
        description: 'Device (555) 888-0003 signed out for Robert Kim',
        userId: boStaff.id,
        metadata: { clientId: client3.id, clientName: 'Robert Kim', phoneNumber: '(555) 888-0003', carrier: 'AT&T' },
        createdAt: new Date('2026-02-21'),
      },
      {
        eventType: 'CLIENT_DRAFT_SUBMITTED',
        description: 'Client intake submitted for Robert Kim',
        userId: agent.id,
        metadata: { clientId: client3.id, clientName: 'Robert Kim' },
        createdAt: new Date('2026-02-25'),
      },
    ],
  })
  console.log('  Created event logs (general + client-specific with clientId)')

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
