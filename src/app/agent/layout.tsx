import { AgentSidebar } from '@/components/agent-sidebar'
import { requireAgent } from './_require-agent'

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAgent()

  return (
    <div className="flex h-screen bg-slate-950">
      <AgentSidebar user={user} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
