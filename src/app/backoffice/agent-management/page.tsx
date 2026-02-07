import {
  getAllAgents,
  getAllUsers,
  getAgentStats,
} from '@/backend/data/backoffice'
import { auth } from '@/backend/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExportCSVButton } from '@/components/export-csv-button'
import { AgentList } from './_components/agent-list'
import { CreateUserDialog } from './_components/create-user-dialog'

export default async function AgentManagementPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [agents, users, stats] = await Promise.all([
    getAllAgents(),
    getAllUsers(),
    getAgentStats(),
  ])

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Agent Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor agent performance and manage your team
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportCSVButton
            href="/api/export/agents"
            data-testid="export-agents-csv"
          />
          <CreateUserDialog currentUserRole={session.user.role} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Stats */}
        <div className="space-y-4">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Agents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-foreground">
                {stats.totalAgents}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Initiated Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-chart-4">
                {stats.initiatedApps}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                New Clients (Month)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-foreground">
                {stats.newClientsMonth}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Avg. Days to Open
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight font-mono text-foreground">
                {stats.avgDaysToOpen !== null ? stats.avgDaysToOpen : '—'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agent Directory & User Management */}
        <AgentList
          agents={agents}
          users={users}
          currentUserRole={session.user.role}
          currentUserId={session.user.id}
        />
      </div>
    </div>
  )
}
