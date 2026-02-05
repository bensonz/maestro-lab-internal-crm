import { redirect } from 'next/navigation'
import { auth } from '@/backend/auth'

export default async function Home() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Redirect based on role
  const role = session.user.role
  if (role === 'BACKOFFICE' || role === 'ADMIN' || role === 'FINANCE') {
    redirect('/backoffice')
  }

  redirect('/agent')
}
