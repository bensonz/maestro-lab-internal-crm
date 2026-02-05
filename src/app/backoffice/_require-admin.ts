import { redirect } from 'next/navigation'
import { auth } from '@/backend/auth'

const ADMIN_ROLES = ['BACKOFFICE', 'ADMIN', 'FINANCE'] as const

/**
 * Requires the user to be authenticated with an admin role (BACKOFFICE, ADMIN, or FINANCE).
 * Redirects to /login if not authenticated, or /agent if wrong role.
 * Returns the session user if authorized.
 */
export async function requireAdmin() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  if (!ADMIN_ROLES.includes(session.user.role as typeof ADMIN_ROLES[number])) {
    redirect('/agent')
  }

  return session.user
}
