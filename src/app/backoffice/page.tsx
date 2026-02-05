import {
  getDashboardStats,
  getPendingActionCounts,
  getRecentActivity,
  getPlatformOverview,
} from '@/backend/data/backoffice'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  UserCheck,
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  LayoutDashboard,
  Layers,
} from 'lucide-react'

export default async function BackofficeOverviewPage() {
  const [stats, pendingActions, recentActivity, platformOverview] = await Promise.all([
    getDashboardStats(),
    getPendingActionCounts(),
    getRecentActivity(),
    getPlatformOverview(),
  ])

  return (
    <div className="min-h-screen p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-accent/20 to-chart-3/20 ring-1 ring-accent/20">
            <LayoutDashboard className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Overview
            </h1>
            <p className="text-sm text-muted-foreground">
              Welcome to the Back Office Management Console
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {/* Total Clients */}
        <Card className="group border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 card-interactive">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-lg p-2.5 ring-1 bg-primary/10 ring-primary/20 transition-all group-hover:bg-primary/15">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-foreground">{stats.totalClients}</p>
              <p className="text-sm text-muted-foreground">Total Clients</p>
            </div>
          </CardContent>
        </Card>

        {/* Active Agents */}
        <Card className="group border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-chart-4/40 hover:shadow-lg hover:shadow-chart-4/10 card-interactive">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-lg p-2.5 ring-1 bg-chart-4/10 ring-chart-4/20 transition-all group-hover:bg-chart-4/15">
                <UserCheck className="h-5 w-5 text-chart-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-foreground">{stats.activeAgents}</p>
              <p className="text-sm text-muted-foreground">Active Agents</p>
            </div>
          </CardContent>
        </Card>

        {/* Total Funds Managed */}
        <Card className="group border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-chart-5/40 hover:shadow-lg hover:shadow-chart-5/10 card-interactive">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-lg p-2.5 ring-1 bg-chart-5/10 ring-chart-5/20 transition-all group-hover:bg-chart-5/15">
                <DollarSign className="h-5 w-5 text-chart-5" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-foreground">{stats.totalFundsManaged}</p>
              <p className="text-sm text-muted-foreground">Total Funds Managed</p>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card className="group border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/10 card-interactive">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-lg p-2.5 ring-1 bg-accent/10 ring-accent/20 transition-all group-hover:bg-accent/15">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-foreground">{stats.monthlyRevenue}</p>
              <p className="text-sm text-muted-foreground">Monthly Revenue</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Actions */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 ring-1 ring-accent/20">
                <AlertTriangle className="h-4 w-4 text-accent" />
              </div>
              Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 ring-1 ring-border/30 transition-colors hover:bg-muted/50">
              <span className="text-sm text-foreground">Pending Intake Approvals</span>
              <Badge variant="outline" className="border-accent/30 bg-accent/10 text-accent">
                {pendingActions.pendingIntake}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 ring-1 ring-border/30 transition-colors hover:bg-muted/50">
              <span className="text-sm text-foreground">Pending Verifications</span>
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                {pendingActions.pendingVerification}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 ring-1 ring-border/30 transition-colors hover:bg-muted/50">
              <span className="text-sm text-foreground">Pending Settlements</span>
              <Badge variant="outline" className="border-chart-3/30 bg-chart-3/10 text-chart-3">
                {pendingActions.pendingSettlement}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 ring-1 ring-border/30 transition-colors hover:bg-muted/50">
              <span className="text-sm text-foreground">Overdue Tasks</span>
              <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">
                {pendingActions.overdueTasks}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm lg:col-span-2 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No recent activity</p>
            ) : (
              recentActivity.map((activity, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 ring-1 ring-border/30 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.client ? `${activity.client} • ` : ''}Agent: {activity.agent}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform Overview */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-5/10 ring-1 ring-chart-5/20">
              <Layers className="h-4 w-4 text-chart-5" />
            </div>
            Platform Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {platformOverview.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No platform data available</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {platformOverview.map((platform) => (
                <div
                  key={platform.name}
                  className="p-4 rounded-xl bg-muted/30 ring-1 ring-border/30 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🏆</span>
                    <span className="font-medium text-foreground">{platform.name}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Active Clients</span>
                      <span className="text-sm font-medium text-foreground">{platform.clients}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Balance</span>
                      <span className="text-sm font-medium text-chart-4">${platform.balance.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
