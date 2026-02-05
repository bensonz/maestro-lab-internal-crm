import { auth } from '@/backend/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, DollarSign, CheckCircle2, Clock, TrendingUp, ArrowUpRight } from 'lucide-react'

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
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s what&apos;s happening with your clients today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
        {/* Total Clients */}
        <Card className="group relative overflow-hidden border-border/50 bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Clients</CardTitle>
            <div className="rounded-lg bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.totalClients}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="text-primary">{stats.activeClients} active</span> in progress
            </p>
          </CardContent>
        </Card>

        {/* Completed This Month */}
        <Card className="group relative overflow-hidden border-border/50 bg-card transition-all duration-300 hover:border-chart-4/30 hover:shadow-lg hover:shadow-chart-4/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            <div className="rounded-lg bg-chart-4/10 p-2 transition-colors group-hover:bg-chart-4/20">
              <CheckCircle2 className="h-4 w-4 text-chart-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.completedThisMonth}</div>
            <p className="mt-1 text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card className="group relative overflow-hidden border-border/50 bg-card transition-all duration-300 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Tasks</CardTitle>
            <div className="rounded-lg bg-accent/10 p-2 transition-colors group-hover:bg-accent/20">
              <Clock className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.pendingTasks}</div>
            <p className="mt-1 text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        {/* Earnings */}
        <Card className="group relative overflow-hidden border-border/50 bg-card transition-all duration-300 hover:border-chart-2/30 hover:shadow-lg hover:shadow-chart-2/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Earnings</CardTitle>
            <div className="rounded-lg bg-chart-2/10 p-2 transition-colors group-hover:bg-chart-2/20">
              <DollarSign className="h-4 w-4 text-chart-2" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              ${stats.earnings.toLocaleString()}
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs">
              <TrendingUp className="h-3 w-3 text-chart-4" />
              <span className="text-chart-4">+{stats.earningsChange}%</span>
              <span className="text-muted-foreground">from last month</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href="/agent/new-client"
            className="group flex items-center justify-between rounded-xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:bg-primary/5"
          >
            <div>
              <h3 className="font-semibold text-foreground">New Client</h3>
              <p className="text-sm text-muted-foreground">Start a new application</p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
          </a>

          <a
            href="/agent/clients"
            className="group flex items-center justify-between rounded-xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:bg-primary/5"
          >
            <div>
              <h3 className="font-semibold text-foreground">View Clients</h3>
              <p className="text-sm text-muted-foreground">Manage your portfolio</p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
          </a>

          <a
            href="/agent/todo-list"
            className="group flex items-center justify-between rounded-xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-accent/30 hover:bg-accent/5"
          >
            <div>
              <h3 className="font-semibold text-foreground">Tasks</h3>
              <p className="text-sm text-muted-foreground">{stats.pendingTasks} pending items</p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
          </a>
        </div>
      </div>
    </div>
  )
}
