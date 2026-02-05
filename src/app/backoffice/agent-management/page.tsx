import { getAllAgents, getAgentStats } from '@/backend/data/backoffice'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AgentList } from './_components/agent-list'

export default async function AgentManagementPage() {
  const [agents, stats] = await Promise.all([
    getAllAgents(),
    getAgentStats(),
  ])

  return (
    <div className="p-6 text-white">
      <h1 className="mb-6 text-2xl font-bold">Agent Management</h1>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Stats */}
        <div className="space-y-4">
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Total Agents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.totalAgents}</div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Initiated Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-500">{stats.initiatedApps}</div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">New Clients (Month)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.newClientsMonth}</div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Avg. Days to Open</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.avgDaysToOpen || '—'}</div>
            </CardContent>
          </Card>
        </div>

        {/* Agent Directory */}
        <AgentList agents={agents} />
      </div>
    </div>
  )
}
