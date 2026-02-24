import { redirect } from 'next/navigation'
import { auth } from '@/backend/auth'

export async function requireAdmin() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const role = (session.user as { role?: string }).role
  if (role !== 'ADMIN' && role !== 'BACKOFFICE') {
    redirect('/agent')
  }

  return {
    id: session.user.id,
    name: session.user.name ?? '',
    email: session.user.email ?? '',
    role: role as string,
  }
}
