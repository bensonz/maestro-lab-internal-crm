'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Wallet,
  TrendingUp,
  Clock,
  DollarSign,
  Calendar,
  Users,
  CheckCircle2,
  Banknote,
  UserPlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PerformancePanel } from './performance-panel'
import type { AgentKPIs } from '@/backend/services/agent-kpis'

type TimeFilter = 'all' | 'this_month' | 'last_month'

interface Transaction {
  id: string
  client: string
  description: string
  amount: number
  status: string
  date: string
  rawDate: string
}

interface EarningsData {
  totalEarnings: number
  pendingPayout: number
  thisMonth: number
  recentTransactions: Transaction[]
}

interface EarningsViewProps {
  earnings: EarningsData
  kpis: AgentKPIs
}

function getMonthBounds(offset: number) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1)
  return { start, end }
}

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function EarningsView({ earnings, kpis }: EarningsViewProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')

  const filteredTransactions = useMemo(() => {
    if (timeFilter === 'all') return earnings.recentTransactions

    const offset = timeFilter === 'this_month' ? 0 : -1
    const { start, end } = getMonthBounds(offset)

    return earnings.recentTransactions.filter((tx) => {
      const d = new Date(tx.rawDate)
      return d >= start && d < end
    })
  }, [earnings.recentTransactions, timeFilter])

  return (
    <div className="space-y-4 p-6 animate-fade-in">
      {/* Header + Time Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">My Earnings</h1>
          <p className="text-xs text-muted-foreground">
            Commissions, payouts & performance
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
          {(
            [
              { key: 'all', label: 'All Time' },
              { key: 'this_month', label: 'This Month' },
              { key: 'last_month', label: 'Last Month' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTimeFilter(key)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                timeFilter === key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Wallet Summary Strip */}
      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Available */}
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/20">
                  <Wallet className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Available
                  </p>
                  <p
                    className="font-mono text-lg font-bold text-success"
                    data-testid="total-earned"
                  >
                    ${earnings.totalEarnings.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="h-10 w-px bg-border" />

              {/* Total Earned */}
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">
                    This Month
                  </p>
                  <p
                    className="font-mono text-base font-semibold"
                    data-testid="this-month-earned"
                  >
                    ${earnings.thisMonth.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Pending */}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">
                    Pending
                  </p>
                  <p
                    className="font-mono text-base font-semibold text-warning"
                    data-testid="pending-payout"
                  >
                    ${earnings.pendingPayout.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Approved Clients */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-chart-5" />
              <div className="text-right">
                <p className="text-[10px] uppercase text-muted-foreground">
                  Approved
                </p>
                <p
                  className="font-mono text-base font-semibold"
                  data-testid="approved-clients"
                >
                  {kpis.approvedClients}
                  <span className="text-xs font-normal text-muted-foreground">
                    /{kpis.totalClients}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two columns: Breakdown Table (left 2/3) + Performance (right 1/3) */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Earnings Breakdown Table */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-border/50 px-3 py-2.5">
                <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Earnings Breakdown
                </h3>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px]"
                >
                  {filteredTransactions.length} records
                </Badge>
              </div>

              {filteredTransactions.length === 0 ? (
                <p
                  className="py-10 text-center text-sm text-muted-foreground"
                  data-testid="earnings-empty"
                >
                  No earnings recorded yet. Earnings are generated when clients
                  are approved.
                </p>
              ) : (
                <div className="overflow-x-auto" data-testid="earnings-table">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/30">
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Client
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Description
                        </th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Amount
                        </th>
                        <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Status
                        </th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {filteredTransactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className="transition-colors hover:bg-muted/30"
                          data-testid={`earning-row-${tx.id}`}
                        >
                          <td className="px-3 py-2.5">
                            <span className="text-sm font-medium text-foreground">
                              {tx.client}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs text-muted-foreground">
                              {tx.description}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="font-mono text-sm font-semibold text-success">
                              +${tx.amount.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px]',
                                tx.status === 'Paid'
                                  ? 'bg-success/10 text-success border-success/30'
                                  : 'bg-warning/10 text-warning border-warning/30',
                              )}
                            >
                              {tx.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="font-mono text-xs text-muted-foreground">
                              {tx.date}
                            </span>
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

        {/* Performance Metrics (right) */}
        <div>
          <PerformancePanel kpis={kpis} />
        </div>
      </div>

      {/* Activity Timeline */}
      {filteredTransactions.length > 0 && (
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-3">
            <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Activity Timeline
            </h3>
            <div className="space-y-2.5">
              {filteredTransactions.slice(0, 6).map((tx, idx) => {
                const isPaid = tx.status === 'Paid'
                return (
                  <div key={tx.id} className="flex gap-3">
                    {/* Timeline connector */}
                    <div className="relative flex flex-col items-center">
                      <div
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-full',
                          isPaid ? 'bg-success/20' : 'bg-warning/20',
                        )}
                      >
                        {isPaid ? (
                          <Banknote className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <UserPlus className="h-3.5 w-3.5 text-warning" />
                        )}
                      </div>
                      {idx < Math.min(filteredTransactions.length, 6) - 1 && (
                        <div className="mt-1 w-px flex-1 bg-border" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 pb-1">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{tx.client}</span>
                        {' — '}
                        <span className="font-mono text-success">
                          +${tx.amount.toLocaleString()}
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {tx.description} · {formatRelativeDate(tx.rawDate)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
