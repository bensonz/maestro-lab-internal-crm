import { auth } from '@/backend/auth'
import { redirect } from 'next/navigation'
import { getAgentClients, getAgentClientStats } from '@/backend/data/agent'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function MyClientsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [clients, stats] = await Promise.all([
    getAgentClients(session.user.id),
    getAgentClientStats(session.user.id),
  ])

  return (
    <div className="p-6 text-white">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Clients</h1>
          <p className="text-slate-400">Manage and track all your client applications</p>
        </div>
        <Link href="/agent/new-client">
          <Button className="bg-emerald-600 hover:bg-emerald-700">+ New Client</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-6 flex flex-wrap gap-4 text-sm">
        <span>Total: <strong>{stats.total}</strong></span>
        <span>In Progress: <strong className="text-blue-400">{stats.inProgress}</strong></span>
        <span>Pending Approval: <strong className="text-yellow-400">{stats.pendingApproval}</strong></span>
        <span>Verification Needed: <strong className="text-orange-400">{stats.verificationNeeded}</strong></span>
        <span>Approved: <strong className="text-emerald-400">{stats.approved}</strong></span>
        <span>Rejected: <strong className="text-red-400">{stats.rejected}</strong></span>
      </div>

      {/* Client Cards */}
      {clients.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-slate-400 mb-4">No clients yet</p>
            <Link href="/agent/new-client">
              <Button className="bg-emerald-600 hover:bg-emerald-700">Add Your First Client</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="border-slate-800 bg-slate-900">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium text-white">
                    {client.name}
                  </CardTitle>
                  <Badge className={client.statusColor}>{client.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {client.nextTask && (
                  <p className="mb-2 text-sm text-slate-400">
                    Next: {client.nextTask}
                  </p>
                )}
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Step {client.step} of {client.totalSteps}</span>
                    <span>{client.progress}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800">
                    <div
                      className="h-1.5 rounded-full bg-emerald-500"
                      style={{ width: `${client.progress}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Last Updated: {client.lastUpdated}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
