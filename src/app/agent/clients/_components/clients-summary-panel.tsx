'use client'

import {
  Users,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Ban,
  Hourglass,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type StatusFilter =
  | 'inProgress'
  | 'needsInfo'
  | 'pendingApproval'
  | 'approved'
  | 'rejected'
  | 'aborted'

interface ClientsSummaryPanelProps {
  stats: {
    total: number
    inProgress: number
    pendingApproval: number
    verificationNeeded: number
    approved: number
    rejected: number
    aborted: number
  }
  activeFilter: StatusFilter | null
  onFilterChange: (filter: StatusFilter | null) => void
}

const statusRows: {
  key: StatusFilter
  label: string
  icon: React.ElementType
  colorClass: string
  activeClass: string
  statKey: keyof ClientsSummaryPanelProps['stats']
}[] = [
  {
    key: 'inProgress',
    label: 'In Progress',
    icon: Clock,
    colorClass: 'text-primary',
    activeClass: 'bg-primary/10 text-primary',
    statKey: 'inProgress',
  },
  {
    key: 'pendingApproval',
    label: 'Pending Approval',
    icon: Hourglass,
    colorClass: 'text-warning',
    activeClass: 'bg-warning/10 text-warning',
    statKey: 'pendingApproval',
  },
  {
    key: 'needsInfo',
    label: 'Verification Needed',
    icon: AlertCircle,
    colorClass: 'text-destructive',
    activeClass: 'bg-destructive/10 text-destructive',
    statKey: 'verificationNeeded',
  },
  {
    key: 'approved',
    label: 'Approved',
    icon: CheckCircle2,
    colorClass: 'text-success',
    activeClass: 'bg-success/10 text-success',
    statKey: 'approved',
  },
  {
    key: 'rejected',
    label: 'Rejected',
    icon: XCircle,
    colorClass: 'text-destructive',
    activeClass: 'bg-destructive/10 text-destructive',
    statKey: 'rejected',
  },
  {
    key: 'aborted',
    label: 'Aborted',
    icon: Ban,
    colorClass: 'text-muted-foreground',
    activeClass: 'bg-muted/50 text-foreground',
    statKey: 'aborted',
  },
]

export function ClientsSummaryPanel({
  stats,
  activeFilter,
  onFilterChange,
}: ClientsSummaryPanelProps) {
  const totalResolved = stats.approved + stats.rejected + stats.aborted
  const successRate =
    totalResolved > 0 ? Math.round((stats.approved / totalResolved) * 100) : 0
  const failureRate =
    totalResolved > 0
      ? Math.round(
          ((stats.rejected + stats.aborted) / totalResolved) * 100,
        )
      : 0

  return (
    <div
      className="hidden w-56 min-w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex"
      data-testid="clients-summary-panel"
    >
      {/* Header */}
      <div className="border-b border-sidebar-border p-4">
        <h2 className="text-lg font-semibold">My Clients</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Manage applications
        </p>
      </div>

      {/* Summary status list */}
      <div className="space-y-1 border-b border-sidebar-border p-3">
        <p className="px-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          Summary
        </p>

        {/* Total row */}
        <button
          onClick={() => onFilterChange(null)}
          className={cn(
            'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
            activeFilter === null
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          )}
          data-testid="filter-total"
        >
          <div className="flex items-center gap-2">
            <Users
              className={cn(
                'h-4 w-4',
                activeFilter === null ? 'text-primary' : 'text-primary',
              )}
            />
            <span className="text-xs">Total Clients</span>
          </div>
          <span
            className={cn(
              'rounded px-1.5 py-0.5 font-mono text-sm font-semibold',
              activeFilter === null ? 'bg-primary/20 text-primary' : 'bg-muted',
            )}
          >
            {stats.total}
          </span>
        </button>

        {statusRows.map((row) => {
          const Icon = row.icon
          const count = stats[row.statKey]
          const isActive = activeFilter === row.key

          return (
            <button
              key={row.key}
              onClick={() => onFilterChange(isActive ? null : row.key)}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? row.activeClass
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
              data-testid={`filter-${row.key}`}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={cn('h-4 w-4', isActive ? '' : row.colorClass)}
                />
                <span className="text-xs">{row.label}</span>
              </div>
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 font-mono text-sm font-semibold',
                  isActive ? `${row.activeClass.split(' ')[0]}/20` : 'bg-muted',
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Performance Rates */}
      <div className="space-y-3 p-3">
        <p className="px-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          Performance
        </p>

        <Card className="border-border/50 bg-card/80">
          <CardContent className="space-y-2 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Success Rate
              </span>
              <span className="font-mono text-sm font-semibold text-success">
                {successRate}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Failure Rate
              </span>
              <span className="font-mono text-sm font-semibold text-destructive">
                {failureRate}%
              </span>
            </div>
          </CardContent>
        </Card>

        <p className="px-1 text-[10px] text-muted-foreground/60">
          Based on completed applications
        </p>
      </div>
    </div>
  )
}
