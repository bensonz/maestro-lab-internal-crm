import { auth } from '@/backend/auth'
import { redirect } from 'next/navigation'
import {
  getAgentDashboardStats,
  getAgentTodaysTasks,
  getAgentClients,
} from '@/backend/data/agent'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Users,
  DollarSign,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Hourglass,
  ListTodo,
  PlayCircle,
} from 'lucide-react'

export default async function AgentDashboard() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [stats, todaysTasks, allClients] = await Promise.all([
    getAgentDashboardStats(session.user.id),
    getAgentTodaysTasks(session.user.id),
    getAgentClients(session.user.id),
  ])

  const recentClients = allClients.slice(0, 6)

  return (
    <div className="min-h-screen p-6 lg:p-8 space-y-8">
      {/* Client Status */}
      <section>
        <h3
          className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground"
          data-testid="section-client-status"
        >
          Client Status
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* In Progress */}
          <Card
            className="border-l-2 border-l-primary border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-l-primary hover:shadow-lg hover:shadow-primary/10"
            data-testid="status-in-progress"
          >
            <CardContent className="flex items-center gap-4 py-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <PlayCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Application In Progress
                </p>
                <p className="text-3xl font-mono font-bold text-primary">
                  {stats.inProgressCount}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Pending Approval */}
          <Card
            className="border-l-2 border-l-warning border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-l-warning hover:shadow-lg hover:shadow-warning/10"
            data-testid="status-pending-approval"
          >
            <CardContent className="flex items-center gap-4 py-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning">
                <Hourglass className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Pending Approval
                </p>
                <p className="text-3xl font-mono font-bold text-warning">
                  {stats.pendingApprovalCount}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Active / Approved */}
          <Card
            className="border-l-2 border-l-success border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-l-success hover:shadow-lg hover:shadow-success/10"
            data-testid="status-approved"
          >
            <CardContent className="flex items-center gap-4 py-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-success/20 text-success">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-3xl font-mono font-bold text-success">
                  {stats.approvedCount}
                </p>
                {stats.lastApprovedAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Last updated: {stats.lastApprovedAt}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Financial Overview */}
      <section>
        <h3
          className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground"
          data-testid="section-financial-overview"
        >
          Financial Overview
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Total Clients / Revenue proxy */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg">
            <CardContent className="py-5">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <p className="mb-1 text-sm text-muted-foreground">
                Total Clients
              </p>
              <p className="text-2xl font-mono font-bold text-foreground">
                {stats.totalClients}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="font-medium text-primary">
                  {stats.activeClients} active
                </span>
              </p>
            </CardContent>
          </Card>

          {/* Completed This Month */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg">
            <CardContent className="py-5">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/20 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <p className="mb-1 text-sm text-muted-foreground">
                Completed This Month
              </p>
              <p className="text-2xl font-mono font-bold text-foreground">
                {stats.completedThisMonth}
              </p>
            </CardContent>
          </Card>

          {/* Earnings */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg">
            <CardContent className="py-5">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/20 text-success">
                  <DollarSign className="h-5 w-5" />
                </div>
                {stats.earningsChange !== 0 && (
                  <span className="text-xs font-mono font-medium text-success">
                    +{stats.earningsChange}%
                  </span>
                )}
              </div>
              <p className="mb-1 text-sm text-muted-foreground">
                Accumulated Earnings
              </p>
              <p className="text-2xl font-mono font-bold text-foreground">
                ${stats.earnings.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Today's Tasks */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3
            className="text-sm font-medium uppercase tracking-wider text-muted-foreground"
            data-testid="section-todays-tasks"
          >
            Today&apos;s Tasks
          </h3>
          {todaysTasks.length > 0 && (
            <span className="text-xs font-mono text-warning">
              {todaysTasks.length} pending
            </span>
          )}
        </div>

        {todaysTasks.length === 0 ? (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">
                No tasks due today
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="space-y-3 py-4">
              {todaysTasks.map((task) => (
                <Link
                  key={task.id}
                  href={
                    task.clientId
                      ? `/agent/clients/${task.clientId}`
                      : '/agent/todo-list'
                  }
                >
                  <div
                    className={`flex items-center justify-between rounded-lg border p-3 transition-all hover:bg-muted/30 ${
                      task.isOverdue
                        ? 'border-warning/30 bg-warning/5'
                        : 'border-border bg-muted/30'
                    }`}
                    data-testid={`task-${task.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {task.title}
                        </p>
                        {task.isOverdue && (
                          <span className="shrink-0 rounded bg-warning/20 px-1.5 py-0.5 font-mono text-[10px] uppercase text-warning">
                            Urgent
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {task.description}
                        </p>
                      )}
                      {task.clientName && (
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">
                          Client: {task.clientName}
                        </p>
                      )}
                    </div>
                    <ArrowUpRight className="ml-4 h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {/* To-Dos (Recent Clients) */}
      {recentClients.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3
              className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground"
              data-testid="section-todos"
            >
              <ListTodo className="h-4 w-4" />
              To-Dos
            </h3>
            <Link
              href="/agent/clients"
              className="text-xs font-mono text-primary transition-colors hover:text-primary/80"
            >
              View All →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recentClients.map((client) => {
              const isHighPriority =
                client.intakeStatus === 'NEEDS_MORE_INFO' ||
                client.intakeStatus === 'PENDING_EXTERNAL'
              return (
                <Link key={client.id} href={`/agent/clients/${client.id}`}>
                  <Card
                    className={`group h-full cursor-pointer border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 ${
                      isHighPriority ? 'border-l-2 border-l-destructive' : ''
                    }`}
                    data-testid={`client-card-${client.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="truncate text-base font-medium text-foreground transition-colors group-hover:text-primary">
                            {client.name}
                          </CardTitle>
                          {client.nextTask && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              Next: {client.nextTask}
                            </p>
                          )}
                        </div>
                        <Badge
                          className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-medium ${client.statusColor}`}
                        >
                          {client.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-3">
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Step {client.step} of {client.totalSteps}
                          </span>
                          <span className="font-mono text-primary">
                            {client.progress}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-primary to-primary/70 transition-all duration-500"
                            style={{ width: `${client.progress}%` }}
                          />
                        </div>
                      </div>
                      {client.lastUpdated && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
                          <Clock className="h-3 w-3" />
                          <span>Updated {client.lastUpdated}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Agent Info Footer */}
      <section className="border-t border-border pt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">
            Total Clients: {stats.totalClients}
          </span>
          <span>·</span>
          <span>{stats.pendingTasks} pending tasks</span>
        </div>
      </section>
    </div>
  )
}
