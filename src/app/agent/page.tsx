import { auth } from '@/backend/auth'
import { redirect } from 'next/navigation'
import {
  getAgentDashboardStats,
  getAgentTodaysTasks,
  getAgentClients,
} from '@/backend/data/agent'
import { getAgentKPIs } from '@/backend/services/agent-kpis'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Users,
  DollarSign,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  AlertTriangle,
  Hourglass,
  ListTodo,
  Target,
  Timer,
  TrendingDown,
  Percent,
} from 'lucide-react'

export default async function AgentDashboard() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userName = session.user.name || 'Agent'
  const firstName = userName.split(' ')[0]

  const [stats, todaysTasks, allClients, kpis] = await Promise.all([
    getAgentDashboardStats(session.user.id),
    getAgentTodaysTasks(session.user.id),
    getAgentClients(session.user.id),
    getAgentKPIs(session.user.id),
  ])

  const recentClients = allClients.slice(0, 6)

  return (
    <div className="min-h-screen p-6 lg:p-8">
      {/* Header Section */}
      <div className="mb-8 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-chart-3/20 ring-1 ring-primary/20">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Welcome back, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Here&apos;s what&apos;s happening with your clients today.
            </p>
          </div>
        </div>
      </div>

      {/* Client Status Breakdown */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3 stagger-children">
        <Card className="group border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 card-interactive">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="rounded-xl bg-primary/10 p-3 ring-1 ring-primary/20">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                In Progress
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {stats.inProgressCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-warning/40 hover:shadow-lg hover:shadow-warning/10 card-interactive">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="rounded-xl bg-warning/10 p-3 ring-1 ring-warning/20">
              <Hourglass className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Pending Approval
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {stats.pendingApprovalCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-success/40 hover:shadow-lg hover:shadow-success/10 card-interactive">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="rounded-xl bg-success/10 p-3 ring-1 ring-success/20">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Approved
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {stats.approvedCount}
              </p>
              {stats.lastApprovedAt && (
                <p className="text-xs text-muted-foreground">
                  Last: {stats.lastApprovedAt}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Metrics */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
        <Card
          className="group border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-success/40 hover:shadow-lg hover:shadow-success/10 card-interactive"
          data-testid="kpi-success-rate"
        >
          <CardContent className="flex items-center gap-4 py-5">
            <div
              className={`rounded-xl p-3 ring-1 ${
                kpis.successRate >= 80
                  ? 'bg-success/10 ring-success/20'
                  : kpis.successRate >= 60
                    ? 'bg-warning/10 ring-warning/20'
                    : 'bg-destructive/10 ring-destructive/20'
              }`}
            >
              <Target
                className={`h-5 w-5 ${
                  kpis.successRate >= 80
                    ? 'text-success'
                    : kpis.successRate >= 60
                      ? 'text-warning'
                      : 'text-destructive'
                }`}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Success Rate
              </p>
              <p className="text-2xl font-bold tracking-tight font-mono text-foreground">
                {kpis.successRate}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="group border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 card-interactive"
          data-testid="kpi-avg-days-convert"
        >
          <CardContent className="flex items-center gap-4 py-5">
            <div className="rounded-xl bg-primary/10 p-3 ring-1 ring-primary/20">
              <Timer className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Avg Days to Convert
              </p>
              <p className="text-2xl font-bold tracking-tight font-mono text-foreground">
                {kpis.avgDaysToConvert !== null
                  ? `${kpis.avgDaysToConvert} days`
                  : '—'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="group border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-warning/40 hover:shadow-lg hover:shadow-warning/10 card-interactive"
          data-testid="kpi-delay-rate"
        >
          <CardContent className="flex items-center gap-4 py-5">
            <div
              className={`rounded-xl p-3 ring-1 ${
                kpis.delayRate <= 10
                  ? 'bg-success/10 ring-success/20'
                  : kpis.delayRate <= 20
                    ? 'bg-warning/10 ring-warning/20'
                    : 'bg-destructive/10 ring-destructive/20'
              }`}
            >
              <TrendingDown
                className={`h-5 w-5 ${
                  kpis.delayRate <= 10
                    ? 'text-success'
                    : kpis.delayRate <= 20
                      ? 'text-warning'
                      : 'text-destructive'
                }`}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Delay Rate
              </p>
              <p className="text-2xl font-bold tracking-tight font-mono text-foreground">
                {kpis.delayRate}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="group border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-chart-5/40 hover:shadow-lg hover:shadow-chart-5/10 card-interactive"
          data-testid="kpi-extension-rate"
        >
          <CardContent className="flex items-center gap-4 py-5">
            <div className="rounded-xl bg-chart-5/10 p-3 ring-1 ring-chart-5/20">
              <Percent className="h-5 w-5 text-chart-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Extension Rate
              </p>
              <p className="text-2xl font-bold tracking-tight font-mono text-foreground">
                {kpis.extensionRate}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
        {/* Total Clients */}
        <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 card-interactive">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Clients
            </CardTitle>
            <div className="rounded-lg bg-primary/10 p-2.5 ring-1 ring-primary/20 transition-all group-hover:bg-primary/15 group-hover:ring-primary/30">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {stats.totalClients}
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-primary font-medium">
                {stats.activeClients} active
              </span>
              <span className="text-muted-foreground">in progress</span>
            </p>
          </CardContent>
        </Card>

        {/* Completed This Month */}
        <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-success/40 hover:shadow-lg hover:shadow-success/10 card-interactive">
          <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
            <div className="rounded-lg bg-success/10 p-2.5 ring-1 ring-success/20 transition-all group-hover:bg-success/15 group-hover:ring-success/30">
              <CheckCircle2 className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {stats.completedThisMonth}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-warning/40 hover:shadow-lg hover:shadow-warning/10 card-interactive">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Tasks
            </CardTitle>
            <div className="rounded-lg bg-warning/10 p-2.5 ring-1 ring-warning/20 transition-all group-hover:bg-warning/15 group-hover:ring-warning/30">
              <Clock className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {stats.pendingTasks}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        {/* Earnings */}
        <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-chart-5/40 hover:shadow-lg hover:shadow-chart-5/10 card-interactive">
          <div className="absolute inset-0 bg-gradient-to-br from-chart-5/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Earnings
            </CardTitle>
            <div className="rounded-lg bg-chart-5/10 p-2.5 ring-1 ring-chart-5/20 transition-all group-hover:bg-chart-5/15 group-hover:ring-chart-5/30">
              <DollarSign className="h-4 w-4 text-chart-5" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight text-foreground">
              ${stats.earnings.toLocaleString()}
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm">
              <TrendingUp className="h-3.5 w-3.5 text-success" />
              <span className="font-medium text-success">
                +{stats.earningsChange}%
              </span>
              <span className="text-muted-foreground">from last month</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Tasks */}
      <div
        className="mb-8 animate-fade-in-up"
        style={{ animationDelay: '0.2s' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">
              Today&apos;s Tasks
            </h2>
          </div>
          {todaysTasks.length > 0 && (
            <Badge
              variant="outline"
              className="bg-warning/10 text-warning border-warning/30"
            >
              {todaysTasks.length} pending
            </Badge>
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
          <div className="space-y-2">
            {todaysTasks.map((task) => (
              <Link
                key={task.id}
                href={
                  task.clientId
                    ? `/agent/clients/${task.clientId}`
                    : '/agent/todo-list'
                }
              >
                <Card className="group border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 card-interactive cursor-pointer">
                  <CardContent className="flex items-center gap-4 py-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {task.title}
                        </p>
                        {task.isOverdue && (
                          <Badge
                            variant="outline"
                            className="shrink-0 bg-destructive/10 text-destructive border-destructive/30 text-xs"
                          >
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Urgent
                          </Badge>
                        )}
                      </div>
                      {task.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground truncate">
                          {task.description}
                        </p>
                      )}
                      {task.clientName && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {task.clientName}
                        </p>
                      )}
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div
        className="mb-8 animate-fade-in-up"
        style={{ animationDelay: '0.25s' }}
      >
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/agent/new-client"
            className="group flex items-center justify-between rounded-xl border border-border/50 bg-card/60 p-5 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:bg-card/90 hover:shadow-lg hover:shadow-primary/10"
          >
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                New Client
              </h3>
              <p className="text-sm text-muted-foreground">
                Start a new application
              </p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2 ring-1 ring-primary/20 transition-all group-hover:bg-primary/20 group-hover:ring-primary/30">
              <ArrowUpRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>

          <Link
            href="/agent/clients"
            className="group flex items-center justify-between rounded-xl border border-border/50 bg-card/60 p-5 backdrop-blur-sm transition-all duration-300 hover:border-chart-3/40 hover:bg-card/90 hover:shadow-lg hover:shadow-chart-3/10"
          >
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-chart-3 transition-colors">
                View Clients
              </h3>
              <p className="text-sm text-muted-foreground">
                Manage your portfolio
              </p>
            </div>
            <div className="rounded-lg bg-chart-3/10 p-2 ring-1 ring-chart-3/20 transition-all group-hover:bg-chart-3/20 group-hover:ring-chart-3/30">
              <ArrowUpRight className="h-4 w-4 text-chart-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>

          <Link
            href="/agent/todo-list"
            className="group flex items-center justify-between rounded-xl border border-border/50 bg-card/60 p-5 backdrop-blur-sm transition-all duration-300 hover:border-warning/40 hover:bg-card/90 hover:shadow-lg hover:shadow-warning/10"
          >
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-warning transition-colors">
                Tasks
              </h3>
              <p className="text-sm text-muted-foreground">
                {stats.pendingTasks} pending items
              </p>
            </div>
            <div className="rounded-lg bg-warning/10 p-2 ring-1 ring-warning/20 transition-all group-hover:bg-warning/20 group-hover:ring-warning/30">
              <ArrowUpRight className="h-4 w-4 text-warning transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Clients */}
      {recentClients.length > 0 && (
        <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Recent Clients
            </h2>
            <Link
              href="/agent/clients"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              View All →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 stagger-children">
            {recentClients.map((client) => (
              <Link key={client.id} href={`/agent/clients/${client.id}`}>
                <Card className="group h-full border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 card-interactive cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-base font-semibold text-foreground">
                          {client.name}
                        </CardTitle>
                        {client.nextTask && (
                          <p className="mt-1 truncate text-xs text-muted-foreground">
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
                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-muted-foreground">
                          Step {client.step} of {client.totalSteps}
                        </span>
                        <span className="font-semibold text-foreground">
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
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
