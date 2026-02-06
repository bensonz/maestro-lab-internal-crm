import { auth } from '@/backend/auth'
import { redirect } from 'next/navigation'
import { getAgentClients, getAgentClientStats } from '@/backend/data/agent'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { ClientsView } from './_components/clients-view'

export default async function MyClientsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [clients, stats] = await Promise.all([
    getAgentClients(session.user.id),
    getAgentClientStats(session.user.id),
  ])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border/50 bg-card/30 px-6 py-5 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              My Clients
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage and track all your client applications
            </p>
          </div>
          <Link href="/agent/new-client">
            <Button className="btn-glow group h-11 rounded-xl bg-primary px-5 text-primary-foreground font-medium shadow-lg shadow-primary/25 transition-all duration-300 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30">
              <Plus className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
              New Client
            </Button>
          </Link>
        </div>
      </div>

      {/* Content: sidebar + grid */}
      <ClientsView clients={clients} stats={stats} />
    </div>
  )
}
