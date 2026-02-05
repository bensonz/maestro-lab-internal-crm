import { redirect } from 'next/navigation'
import { auth } from '@/backend/auth'

/**
 * Requires the user to be authenticated with AGENT role.
 * Redirects to /login if not authenticated, or /backoffice if wrong role.
 * Returns the session user if authorized.
 */
export async function requireAgent() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.role !== 'AGENT') {
    redirect('/backoffice')
  }

  return session.user
}
