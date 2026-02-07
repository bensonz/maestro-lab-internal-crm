import Credentials from 'next-auth/providers/credentials'
import type { NextAuthConfig } from 'next-auth'

/**
 * Edge-safe auth configuration.
 * This file must NOT import Prisma or any Node.js-only modules.
 * Used by proxy.ts (middleware) which runs in Vercel's Edge Runtime.
 *
 * The full auth.ts file imports this config and adds Prisma-based
 * authorize logic for server-side use.
 */
export const authConfig: NextAuthConfig = {
  providers: [
    // Credentials provider declared here for the middleware to recognize it,
    // but the actual authorize function is in auth.ts (needs Prisma/bcrypt).
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role
        token.id = (user as { id?: string }).id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}
