import { auth } from '@/backend/auth'
import { redirect } from 'next/navigation'
import { getAgentClients, getAgentClientStats } from '@/backend/data/agent'
import { ClientsView } from './_components/clients-view'

export default async function MyClientsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [clients, stats] = await Promise.all([
    getAgentClients(session.user.id),
    getAgentClientStats(session.user.id),
  ])

  return (
    <div className="flex h-[calc(100vh-4rem)] animate-fade-in">
      {/* Content: sidebar + main area */}
      <ClientsView clients={clients} stats={stats} />
    </div>
  )
}
