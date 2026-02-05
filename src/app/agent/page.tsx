import { auth } from '@/backend/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  DollarSign,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react'

export default async function AgentDashboard() {
  const session = await auth()
  const userName = session?.user?.name || 'Agent'
  const firstName = userName.split(' ')[0]

  // Mock stats for now - these would come from database
  const stats = {
    totalClients: 24,
    activeClients: 8,
    completedThisMonth: 12,
    pendingTasks: 5,
    earnings: 4250,
    earningsChange: 12.5,
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      {/* Header Section */}
      <div className="mb-8 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-chart-3/20 ring-1 ring-primary/20">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Welcome back, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Here&apos;s what&apos;s happening with your clients today.
            </p>
          </div>
        </div>
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
              <span className="text-primary font-medium">{stats.activeClients} active</span>
              <span className="text-muted-foreground">in progress</span>
            </p>
          </CardContent>
        </Card>

        {/* Completed This Month */}
        <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-chart-4/40 hover:shadow-lg hover:shadow-chart-4/10 card-interactive">
          <div className="absolute inset-0 bg-gradient-to-br from-chart-4/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
            <div className="rounded-lg bg-chart-4/10 p-2.5 ring-1 ring-chart-4/20 transition-all group-hover:bg-chart-4/15 group-hover:ring-chart-4/30">
              <CheckCircle2 className="h-4 w-4 text-chart-4" />
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
        <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/10 card-interactive">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Tasks
            </CardTitle>
            <div className="rounded-lg bg-accent/10 p-2.5 ring-1 ring-accent/20 transition-all group-hover:bg-accent/15 group-hover:ring-accent/30">
              <Clock className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {stats.pendingTasks}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Require attention</p>
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
              <TrendingUp className="h-3.5 w-3.5 text-chart-4" />
              <span className="font-medium text-chart-4">+{stats.earningsChange}%</span>
              <span className="text-muted-foreground">from last month</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
        <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href="/agent/new-client"
            className="group flex items-center justify-between rounded-xl border border-border/50 bg-card/60 p-5 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:bg-card/90 hover:shadow-lg hover:shadow-primary/10"
          >
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                New Client
              </h3>
              <p className="text-sm text-muted-foreground">Start a new application</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2 ring-1 ring-primary/20 transition-all group-hover:bg-primary/20 group-hover:ring-primary/30">
              <ArrowUpRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </a>

          <a
            href="/agent/clients"
            className="group flex items-center justify-between rounded-xl border border-border/50 bg-card/60 p-5 backdrop-blur-sm transition-all duration-300 hover:border-chart-3/40 hover:bg-card/90 hover:shadow-lg hover:shadow-chart-3/10"
          >
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-chart-3 transition-colors">
                View Clients
              </h3>
              <p className="text-sm text-muted-foreground">Manage your portfolio</p>
            </div>
            <div className="rounded-lg bg-chart-3/10 p-2 ring-1 ring-chart-3/20 transition-all group-hover:bg-chart-3/20 group-hover:ring-chart-3/30">
              <ArrowUpRight className="h-4 w-4 text-chart-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </a>

          <a
            href="/agent/todo-list"
            className="group flex items-center justify-between rounded-xl border border-border/50 bg-card/60 p-5 backdrop-blur-sm transition-all duration-300 hover:border-accent/40 hover:bg-card/90 hover:shadow-lg hover:shadow-accent/10"
          >
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">
                Tasks
              </h3>
              <p className="text-sm text-muted-foreground">
                {stats.pendingTasks} pending items
              </p>
            </div>
            <div className="rounded-lg bg-accent/10 p-2 ring-1 ring-accent/20 transition-all group-hover:bg-accent/20 group-hover:ring-accent/30">
              <ArrowUpRight className="h-4 w-4 text-accent transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
