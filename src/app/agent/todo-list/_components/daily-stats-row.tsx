'use client'

import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DailyStatsRowProps {
  /** Total potential earnings from new + maintenance tasks today */
  potentialEarnings: number
  /** Already confirmed/earned today */
  confirmedEarnings: number
  /** Number of overdue tasks */
  overdueCount: number
  /** Dollar amount at risk from overdue tasks */
  overdueRiskAmount: number
  /** Maintenance tasks completed out of total */
  maintenanceCompleted: number
  maintenanceTotal: number
  /** Tasks completed / total */
  tasksCompleted: number
  tasksTotal: number
}

export function DailyStatsRow({
  potentialEarnings,
  confirmedEarnings,
  overdueCount,
  maintenanceCompleted,
  maintenanceTotal,
  tasksCompleted,
  tasksTotal,
}: DailyStatsRowProps) {
  const taskPercent = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0
  const maintenancePercent = maintenanceTotal > 0
    ? Math.round((maintenanceCompleted / maintenanceTotal) * 100)
    : 100 // No maintenance tasks = 100% complete

  return (
    <div className="grid grid-cols-4 gap-3" data-testid="daily-stats-row">
      {/* Potential */}
      <div className="rounded-md border border-border/40 bg-muted/15 px-3 py-2.5">
        <p className="mb-1 text-[9px] font-medium uppercase tracking-widest text-muted-foreground">
          Potential
        </p>
        <p className="font-mono text-base font-semibold text-foreground">
          ${potentialEarnings.toLocaleString()}
        </p>
      </div>

      {/* Confirmed */}
      <div className="rounded-md border border-success/15 bg-success/5 px-3 py-2.5">
        <p className="mb-1 text-[9px] font-medium uppercase tracking-widest text-muted-foreground">
          Confirmed
        </p>
        <p className="font-mono text-base font-semibold text-success">
          ${confirmedEarnings.toLocaleString()}
        </p>
      </div>

      {/* Overdue + Maintenance Completion */}
      <div
        className={cn(
          'rounded-md border px-3 py-2.5',
          overdueCount > 0
            ? 'border-destructive/20 bg-destructive/5'
            : 'border-border/40 bg-muted/15',
        )}
      >
        <p className="mb-1 text-[9px] font-medium uppercase tracking-widest text-muted-foreground">
          Overdue
        </p>
        <div className="flex items-center gap-1.5">
          {overdueCount > 0 && (
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          )}
          <p
            className={cn(
              'font-mono text-base font-semibold',
              overdueCount > 0 ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {overdueCount}
          </p>
        </div>

        {/* Maintenance Track Completion — affects bonus payout */}
        <div className="mt-1.5 space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Maintenance</span>
            <span
              className={cn(
                'font-mono font-medium',
                maintenancePercent >= 100
                  ? 'text-success'
                  : maintenancePercent >= 80
                    ? 'text-warning'
                    : 'text-destructive',
              )}
            >
              {maintenancePercent}%
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-muted/40">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                maintenancePercent >= 100
                  ? 'bg-success'
                  : maintenancePercent >= 80
                    ? 'bg-warning'
                    : 'bg-destructive',
              )}
              style={{ width: `${Math.min(maintenancePercent, 100)}%` }}
            />
          </div>
          <p className="font-mono text-[9px] text-muted-foreground">
            ${(maintenancePercent * 100).toLocaleString()} of $10,000 bonus
          </p>
        </div>
      </div>

      {/* Tasks */}
      <div className="rounded-md border border-border/40 bg-muted/15 px-3 py-2.5">
        <p className="mb-1 text-[9px] font-medium uppercase tracking-widest text-muted-foreground">
          Tasks
        </p>
        <div className="flex items-center gap-1.5">
          <CheckCircle2
            className={cn(
              'h-3.5 w-3.5',
              taskPercent >= 50 ? 'text-success' : 'text-muted-foreground',
            )}
          />
          <p className="font-mono text-base font-semibold text-foreground">
            {tasksCompleted}
            <span className="text-muted-foreground">/{tasksTotal}</span>
          </p>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted/40">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              taskPercent >= 50 ? 'bg-success' : 'bg-primary/60',
            )}
            style={{ width: `${taskPercent}%` }}
          />
        </div>
      </div>
    </div>
  )
}
