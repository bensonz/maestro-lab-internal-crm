import { auth } from '@/backend/auth'
import { redirect } from 'next/navigation'
import { getAgentEarnings } from '@/backend/data/agent'
import { getAgentKPIs } from '@/backend/services/agent-kpis'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DollarSign,
  Calendar,
  Wallet,
  Users,
} from 'lucide-react'
import { PerformancePanel } from './_components/performance-panel'

export default async function EarningsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [earnings, kpis] = await Promise.all([
    getAgentEarnings(session.user.id),
    getAgentKPIs(session.user.id),
  ])

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          My Earnings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your commissions, payouts, and performance metrics
        </p>
      </div>

      {/* Top KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Earned */}
        <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-chart-4/40 hover:shadow-lg hover:shadow-chart-4/10 card-interactive">
          <div className="absolute inset-0 bg-gradient-to-br from-chart-4/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Earned
            </CardTitle>
            <div className="rounded-lg bg-chart-4/10 p-2.5 ring-1 ring-chart-4/20 transition-all group-hover:bg-chart-4/15 group-hover:ring-chart-4/30">
              <DollarSign className="h-4 w-4 text-chart-4" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight font-mono text-foreground" data-testid="total-earned">
              ${earnings.totalEarnings.toLocaleString()}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Lifetime paid earnings</p>
          </CardContent>
        </Card>

        {/* This Month */}
        <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 card-interactive">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
            <div className="rounded-lg bg-primary/10 p-2.5 ring-1 ring-primary/20 transition-all group-hover:bg-primary/15 group-hover:ring-primary/30">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight font-mono text-foreground" data-testid="this-month-earned">
              ${earnings.thisMonth.toLocaleString()}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Current month total</p>
          </CardContent>
        </Card>

        {/* Pending Payout */}
        <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/10 card-interactive">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Payout
            </CardTitle>
            <div className="rounded-lg bg-accent/10 p-2.5 ring-1 ring-accent/20 transition-all group-hover:bg-accent/15 group-hover:ring-accent/30">
              <Wallet className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight font-mono text-foreground" data-testid="pending-payout">
              ${earnings.pendingPayout.toLocaleString()}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        {/* Approved Clients */}
        <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-chart-5/40 hover:shadow-lg hover:shadow-chart-5/10 card-interactive">
          <div className="absolute inset-0 bg-gradient-to-br from-chart-5/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved Clients
            </CardTitle>
            <div className="rounded-lg bg-chart-5/10 p-2.5 ring-1 ring-chart-5/20 transition-all group-hover:bg-chart-5/15 group-hover:ring-chart-5/30">
              <Users className="h-4 w-4 text-chart-5" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tracking-tight text-foreground" data-testid="approved-clients">
              {kpis.approvedClients}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              of {kpis.totalClients} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — Earnings Table (2/3) */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {earnings.recentTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8" data-testid="earnings-empty">
                  No earnings recorded yet. Earnings are generated when clients are approved.
                </p>
              ) : (
                <div className="overflow-x-auto" data-testid="earnings-table">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
                        <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</th>
                        <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
                        <th className="pb-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                        <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {earnings.recentTransactions.map((tx) => (
                        <tr key={tx.id} data-testid={`earning-row-${tx.id}`}>
                          <td className="py-3 pr-4">
                            <span className="text-sm font-medium text-foreground">{tx.client}</span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-sm text-muted-foreground">{tx.description}</span>
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <span className="text-sm font-semibold font-mono text-chart-4">
                              +${tx.amount.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <Badge
                              variant="outline"
                              className={
                                tx.status === 'Paid'
                                  ? 'bg-chart-4/10 text-chart-4 border-chart-4/30'
                                  : 'bg-accent/10 text-accent border-accent/30'
                              }
                            >
                              {tx.status}
                            </Badge>
                          </td>
                          <td className="py-3 text-right">
                            <span className="text-sm text-muted-foreground">{tx.date}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — Performance Panel (1/3) */}
        <div>
          <PerformancePanel kpis={kpis} />
        </div>
      </div>
    </div>
  )
}
