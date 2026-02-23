import { redirect } from 'next/navigation'
import { auth } from '@/backend/auth'

export async function requireAgent() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  return {
    id: session.user.id,
    name: session.user.name ?? '',
    email: session.user.email ?? '',
    role: (session.user as { role?: string }).role ?? 'AGENT',
  }
}
