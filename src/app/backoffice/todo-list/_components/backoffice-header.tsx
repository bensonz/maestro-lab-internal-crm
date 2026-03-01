'use client'

import { Badge } from '@/components/ui/badge'
import { ListChecks, Smartphone, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ActionHubKPIs } from './types'

interface BackofficeHeaderProps {
  userName: string
  userRole: string
  kpis: ActionHubKPIs
}

export function BackofficeHeader({
  userName,
  userRole,
  kpis,
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
        className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
        data-testid="action-hub-stats"
      >
        {/* Pending Todos */}
        <div
          className={cn(
            'rounded-md border px-3 py-2.5 transition-colors',
            kpis.overdueTodos > 0
              ? 'border-destructive/30 bg-destructive/5'
              : 'border-border',
          )}
          data-testid="stat-pending-todos"
        >
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Pending Todos
          </p>
          <div className="mt-1 flex items-center gap-2">
            <ListChecks
              className={cn(
                'h-4 w-4',
                kpis.overdueTodos > 0 ? 'text-destructive' : 'text-primary',
              )}
            />
            <span
              className={cn(
                'font-mono text-lg font-semibold',
                kpis.overdueTodos > 0 ? 'text-destructive' : 'text-primary',
              )}
            >
              {kpis.pendingTodos}
            </span>
            {kpis.overdueTodos > 0 && (
              <span className="text-xs text-destructive">
                ({kpis.overdueTodos} overdue)
              </span>
            )}
          </div>
        </div>

        {/* Overdue Devices */}
        <div
          className={cn(
            'rounded-md border px-3 py-2.5 transition-colors',
            kpis.overdueDevices > 0
              ? 'border-warning/30 bg-warning/5'
              : 'border-border',
          )}
          data-testid="stat-overdue-devices"
        >
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Overdue Devices
          </p>
          <div className="mt-1 flex items-center gap-2">
            <Smartphone
              className={cn(
                'h-4 w-4',
                kpis.overdueDevices > 0
                  ? 'text-warning'
                  : 'text-muted-foreground',
              )}
            />
            <span
              className={cn(
                'font-mono text-lg font-semibold',
                kpis.overdueDevices > 0
                  ? 'text-warning'
                  : 'text-muted-foreground',
              )}
            >
              {kpis.overdueDevices}
            </span>
          </div>
        </div>

        {/* Fund Allocations Today */}
        <div
          className="rounded-md border border-border px-3 py-2.5"
          data-testid="stat-fund-allocations"
        >
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Allocations Today
          </p>
          <div className="mt-1 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-success" />
            <span className="font-mono text-lg font-semibold text-success">
              {kpis.todayAllocations}
            </span>
          </div>
        </div>

        {/* Ready to Approve */}
        <div
          className={cn(
            'rounded-md border px-3 py-2.5 transition-colors',
            kpis.readyToApprove > 0
              ? 'border-primary/30 bg-primary/5'
              : 'border-border',
          )}
          data-testid="stat-ready-to-approve"
        >
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Ready to Approve
          </p>
          <div className="mt-1 flex items-center gap-2">
            <CheckCircle2
              className={cn(
                'h-4 w-4',
                kpis.readyToApprove > 0
                  ? 'text-primary'
                  : 'text-muted-foreground',
              )}
            />
            <span
              className={cn(
                'font-mono text-lg font-semibold',
                kpis.readyToApprove > 0
                  ? 'text-primary'
                  : 'text-muted-foreground',
              )}
            >
              {kpis.readyToApprove}
            </span>
          </div>
        </div>

        {/* Unconfirmed Allocations */}
        <div
          className={cn(
            'rounded-md border px-3 py-2.5 transition-colors',
            kpis.unconfirmedAllocations > 0
              ? 'border-warning/30 bg-warning/5'
              : 'border-border',
          )}
          data-testid="stat-unconfirmed-allocs"
        >
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Unconfirmed Funds
          </p>
          <div className="mt-1 flex items-center gap-2">
            <AlertCircle
              className={cn(
                'h-4 w-4',
                kpis.unconfirmedAllocations > 0
                  ? 'text-warning'
                  : 'text-muted-foreground',
              )}
            />
            <span
              className={cn(
                'font-mono text-lg font-semibold',
                kpis.unconfirmedAllocations > 0
                  ? 'text-warning'
                  : 'text-muted-foreground',
              )}
            >
              {kpis.unconfirmedAllocations}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
