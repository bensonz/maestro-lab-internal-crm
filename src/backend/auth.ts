import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma/client'
import { authConfig } from './auth.config'

/**
 * Full auth configuration with Prisma-backed authorize.
 * This file is used by server components, server actions, and API routes.
 * Do NOT import this in proxy.ts (middleware) — use auth.config.ts instead.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.passwordHash || !user.isActive) {
          return null
        }

        const isValid = bcrypt.compareSync(
          credentials.password as string,
          user.passwordHash
        )

        if (!isValid) {
          return null
        }

        // Log login event
        await prisma.eventLog.create({
          data: {
            eventType: 'LOGIN',
            description: `User logged in: ${user.email}`,
            userId: user.id,
          },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
})

// Type augmentation for next-auth
declare module 'next-auth' {
  interface User {
    role: string
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
    }
  }
}
