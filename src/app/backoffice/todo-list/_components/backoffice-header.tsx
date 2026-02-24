'use client'

import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertTriangle, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ActionHubStats, PnlStatus } from './types'

interface BackofficeHeaderProps {
  userName: string
  userRole: string
  stats: ActionHubStats
  pnlStatus: PnlStatus
}

export function BackofficeHeader({
  userName,
  userRole,
  stats,
  pnlStatus,
}: BackofficeHeaderProps) {
  return (
    <div data-testid="action-hub-header">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Action Hub</h1>
        <Badge variant="outline" className="text-xs">
          {userRole}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Welcome back, {userName}
      </p>

      <div
        className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3"
        data-testid="action-hub-stats"
      >
        {/* P&L Status */}
        <div
          className={cn(
            'rounded-md border px-3 py-2.5 transition-colors',
            pnlStatus.completed
              ? 'border-success/30 bg-success/5'
              : 'border-warning/30 bg-warning/5',
          )}
          data-testid="stat-pnl-status"
        >
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            P&L Status
          </p>
          <div className="mt-1 flex items-center gap-2">
            {pnlStatus.completed ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="font-mono text-lg font-semibold text-success">
                  Done
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="font-mono text-lg font-semibold text-warning">
                  Pending
                </span>
              </>
            )}
          </div>
        </div>

        {/* Pending Actions */}
        <div
          className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2.5"
          data-testid="stat-pending-actions"
        >
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Pending Actions
          </p>
          <div className="mt-1 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-mono text-lg font-semibold text-primary">
              {stats.pendingActions}
            </span>
          </div>
        </div>

        {/* Overdue Tasks */}
        <div
          className={cn(
            'rounded-md border px-3 py-2.5',
            stats.overdueCount > 0
              ? 'border-destructive/30 bg-destructive/5'
              : 'border-border',
          )}
          data-testid="stat-overdue-tasks"
        >
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Overdue Tasks
          </p>
          <div className="mt-1 flex items-center gap-2">
            <AlertTriangle
              className={cn(
                'h-4 w-4',
                stats.overdueCount > 0
                  ? 'text-destructive'
                  : 'text-muted-foreground',
              )}
            />
            <span
              className={cn(
                'font-mono text-lg font-semibold',
                stats.overdueCount > 0
                  ? 'text-destructive'
                  : 'text-muted-foreground',
              )}
            >
              {stats.overdueCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
