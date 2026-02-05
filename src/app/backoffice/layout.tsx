import { redirect } from 'next/navigation'
import { auth } from '@/backend/auth'
import { BackofficeNav } from '@/components/backoffice/backoffice-nav'

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-slate-950">
      <BackofficeNav user={session.user} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
