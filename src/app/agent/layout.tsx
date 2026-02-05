import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/backend/auth'
import { AgentSidebar } from '@/components/agent-sidebar'

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-slate-950">
      <AgentSidebar user={session.user} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
