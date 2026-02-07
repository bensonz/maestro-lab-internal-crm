'use client'

import {
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Hourglass,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatusFilter =
  | 'inProgress'
  | 'needsInfo'
  | 'pendingApproval'
  | 'approved'
  | 'rejected'

interface ClientsSummaryPanelProps {
  stats: {
    total: number
    inProgress: number
    pendingApproval: number
    verificationNeeded: number
    approved: number
    rejected: number
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
    activeClass: 'bg-primary/20 text-primary ring-1 ring-primary/30',
    statKey: 'inProgress',
  },
  {
    key: 'needsInfo',
    label: 'Needs Info',
    icon: AlertCircle,
    colorClass: 'text-orange-400',
    activeClass: 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30',
    statKey: 'verificationNeeded',
  },
  {
    key: 'pendingApproval',
    label: 'Pending Approval',
    icon: Hourglass,
    colorClass: 'text-accent',
    activeClass: 'bg-accent/20 text-accent ring-1 ring-accent/30',
    statKey: 'pendingApproval',
  },
  {
    key: 'approved',
    label: 'Approved',
    icon: CheckCircle2,
    colorClass: 'text-chart-4',
    activeClass: 'bg-chart-4/20 text-chart-4 ring-1 ring-chart-4/30',
    statKey: 'approved',
  },
  {
    key: 'rejected',
    label: 'Rejected',
    icon: XCircle,
    colorClass: 'text-destructive',
    activeClass:
      'bg-destructive/20 text-destructive ring-1 ring-destructive/30',
    statKey: 'rejected',
  },
]

export function ClientsSummaryPanel({
  stats,
  activeFilter,
  onFilterChange,
}: ClientsSummaryPanelProps) {
  const totalResolved = stats.approved + stats.rejected
  const successRate =
    totalResolved > 0 ? Math.round((stats.approved / totalResolved) * 100) : 0
  const failureRate = totalResolved > 0 ? 100 - successRate : 0

  return (
    <div className="w-56 shrink-0 border-r border-border/50 bg-card/50 flex flex-col">
      <div className="p-4 border-b border-border/30">
        <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Status Overview
        </h3>
      </div>

      <div className="flex-1 p-2 space-y-1">
        {statusRows.map((row) => {
          const Icon = row.icon
          const count = stats[row.statKey]
          const isActive = activeFilter === row.key

          return (
            <button
              key={row.key}
              onClick={() => onFilterChange(isActive ? null : row.key)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? row.activeClass
                  : 'text-foreground hover:bg-muted/50',
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={cn('h-4 w-4', isActive ? '' : row.colorClass)}
                />
                <span className="font-medium">{row.label}</span>
              </div>
              <span
                className={cn(
                  'font-mono text-sm',
                  isActive ? '' : 'text-muted-foreground',
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="border-t border-border/30 p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Success Rate</span>
          <span className="font-semibold text-chart-4">{successRate}%</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Failure Rate</span>
          <span className="font-semibold text-destructive">{failureRate}%</span>
        </div>
      </div>
    </div>
  )
}
