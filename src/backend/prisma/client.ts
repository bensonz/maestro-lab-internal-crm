import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL
  if (!url) {
    // When DATABASE_URL is not set, return a proxy that throws at query time
    return new Proxy({} as PrismaClient, {
      get(_target, prop) {
        if (prop === 'then' || prop === Symbol.toPrimitive || prop === Symbol.toStringTag) {
          return undefined
        }
        return new Proxy({} as Record<string, unknown>, {
          get(_t, method) {
            return () => {
              throw new Error(
                `Database not available. Cannot call prisma.${String(prop)}.${String(method)}()`,
              )
            }
          },
        })
      },
    })
  }

  const pool = new pg.Pool({ connectionString: url })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
