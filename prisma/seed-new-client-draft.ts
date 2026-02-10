/**
 * Test seed — creates a client in READY_FOR_APPROVAL status
 * so the backoffice approval flow can be tested independently.
 *
 * Run:  npx tsx prisma/seed-new-client-draft.ts
 *
 * Creates:
 *   1 client (Test Draft) assigned to agent@test.com in PENDING status
 *   1 client (Test ReadyApproval) assigned to agent@test.com in READY_FOR_APPROVAL status
 *   ClientPlatform records for both
 *
 * NOTE: Requires seed-demo.ts to have been run first (needs the users).
 */

import 'dotenv/config'
import {
  PrismaClient,
  IntakeStatus,
  PlatformType,
  PlatformStatus,
  EventType,
} from './generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const ALL_PLATFORMS: PlatformType[] = [
  PlatformType.DRAFTKINGS,
  PlatformType.FANDUEL,
  PlatformType.BETMGM,
  PlatformType.CAESARS,
  PlatformType.FANATICS,
  PlatformType.BALLYBET,
  PlatformType.BETRIVERS,
  PlatformType.BET365,
  PlatformType.BANK,
  PlatformType.PAYPAL,
  PlatformType.EDGEBOOST,
]

async function main() {
  // Find agent@test.com (John Smith, the rookie agent)
  const agent = await prisma.user.findUnique({
    where: { email: 'agent@test.com' },
  })
  if (!agent) {
    throw new Error('agent@test.com not found — run seed-demo.ts first')
  }

  console.log(`Found agent: ${agent.name} (${agent.id})`)

  // ─── Client 1: PENDING (simulating Phase 1 submitted, Phase 2 not yet done) ───
  const draftClient = await prisma.client.create({
    data: {
      firstName: 'Test',
      lastName: 'Draft',
      email: 'testdraft@example.com',
      phone: '(555) 999-0001',
      gmailAccount: 'testdraft@gmail.com',
      gmailPassword: 'testpass123',
      prequalCompleted: true,
      intakeStatus: IntakeStatus.PENDING,
      agentId: agent.id,
      state: 'TX',
      city: 'Austin',
      zipCode: '78701',
      country: 'US',
      questionnaire: JSON.stringify({
        middleName: 'Lee',
        dateOfBirth: '1990-05-15',
        idExpiry: '2028-01-01',
        idVerified: true,
      }),
    },
  })

  // Create platform records for draft client
  await prisma.clientPlatform.createMany({
    data: ALL_PLATFORMS.map((platformType) => ({
      clientId: draftClient.id,
      platformType,
      status:
        platformType === PlatformType.BETMGM
          ? PlatformStatus.VERIFIED
          : PlatformStatus.NOT_STARTED,
    })),
  })

  console.log(`✅ Created PENDING client: ${draftClient.firstName} ${draftClient.lastName} (${draftClient.id})`)

  // ─── Client 2: READY_FOR_APPROVAL (simulating a client that has been through the whole pipeline) ───
  const readyClient = await prisma.client.create({
    data: {
      firstName: 'Test',
      lastName: 'ReadyApproval',
      email: 'testready@example.com',
      phone: '(555) 999-0002',
      gmailAccount: 'testready@gmail.com',
      gmailPassword: 'testpass123',
      prequalCompleted: true,
      intakeStatus: IntakeStatus.READY_FOR_APPROVAL,
      agentId: agent.id,
      address: '789 Test Street',
      state: 'TX',
      city: 'Dallas',
      zipCode: '75201',
      country: 'US',
      questionnaire: JSON.stringify({
        middleName: '',
        dateOfBirth: '1988-11-20',
        idExpiry: '2027-06-15',
        idVerified: true,
        compliance: {
          hasCriminalRecord: 'no',
          hasPayPal: 'yes',
          hasBettingHistory: 'no',
          hasBankingHistory: 'yes',
          riskLevel: 'low',
          canReadEnglish: 'yes',
          ssn: '***-**-1234',
          bankName: 'Chase',
        },
      }),
    },
  })

  // Create platform records for ready client (all verified)
  await prisma.clientPlatform.createMany({
    data: ALL_PLATFORMS.map((platformType) => ({
      clientId: readyClient.id,
      platformType,
      status: PlatformStatus.VERIFIED,
    })),
  })

  // Create event log for the status changes
  await prisma.eventLog.create({
    data: {
      eventType: EventType.STATUS_CHANGE,
      description: `Status changed to READY_FOR_APPROVAL`,
      clientId: readyClient.id,
      userId: agent.id,
      oldValue: 'IN_EXECUTION',
      newValue: 'READY_FOR_APPROVAL',
    },
  })

  console.log(`✅ Created READY_FOR_APPROVAL client: ${readyClient.firstName} ${readyClient.lastName} (${readyClient.id})`)

  console.log('')
  console.log('Summary:')
  console.log(`  PENDING client (Test Draft): ${draftClient.id}`)
  console.log(`  READY_FOR_APPROVAL client (Test ReadyApproval): ${readyClient.id}`)
  console.log('')
  console.log('To test:')
  console.log('  1. Log in as admin@test.com / password123')
  console.log('  2. Go to Sales Interaction page')
  console.log('  3. "Test ReadyApproval" should show an Approve button')
  console.log('  4. "Test Draft" should show an Assign Phone button (stuck in PENDING)')
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
