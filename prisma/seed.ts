import 'dotenv/config'
import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const hashPassword = (password: string) => bcrypt.hashSync(password, 10)

async function main() {
  console.log('Seeding database (users only)...')

  // Create users with hashed passwords
  const agentUser = await prisma.user.create({
    data: {
      email: 'agent@test.com',
      passwordHash: hashPassword('password123'),
      name: 'John Doe',
      role: UserRole.AGENT,
      phone: '(555) 200-0001',
    },
  })

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      passwordHash: hashPassword('password123'),
      name: 'Admin User',
      role: UserRole.BACKOFFICE,
      phone: '(555) 100-0001',
    },
  })

  const gmUser = await prisma.user.create({
    data: {
      email: 'gm@test.com',
      passwordHash: hashPassword('password123'),
      name: 'General Manager',
      role: UserRole.ADMIN,
      phone: '(555) 100-0002',
    },
  })

  // Create agent metrics (empty)
  await prisma.agentMetrics.create({
    data: {
      agentId: agentUser.id,
      totalClients: 0,
      approvedClients: 0,
      rejectedClients: 0,
      delayCount: 0,
      extensionCount: 0,
      successRate: 0,
      delayRate: 0,
    },
  })

  console.log('Seeding complete!')
  console.log(`
Test accounts:
  Agent:      agent@test.com / password123
  Backoffice: admin@test.com / password123
  GM:         gm@test.com / password123
  `)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
