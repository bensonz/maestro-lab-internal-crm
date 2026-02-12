'use client'

import { ShieldCheck, Clock, AlertTriangle, TrendingDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { MaintenanceClient } from './types'

// Client Card

function ClientCard({ client }: { client: MaintenanceClient }) {
  const isOverdue = client.daysRemaining < 0
  const absDays = Math.abs(client.daysRemaining)
  const deadline = client.taskCategory === 'platform_verification' ? 3 : 2

  return (
    <div
      className={cn(
        'rounded-md border bg-muted/10 px-3 py-2.5',
        isOverdue ? 'border-destructive/30' : 'border-border/30',
      )}
      data-testid={`maintenance-client-${client.id}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {client.name}
            </span>
            <Badge
              variant="outline"
              className={cn(
                'h-4 px-1.5 text-[9px]',
                client.taskCategory === 'high_priority'
                  ? 'border-destructive/40 text-destructive'
                  : 'border-warning/40 text-warning',
              )}
            >
              {client.taskCategory === 'high_priority'
                ? `High Priority (${deadline}d)`
                : `Verification (${deadline}d)`}
            </Badge>
          </div>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {client.taskDescription}
            {client.overduePercent > 0 && (
              <span className="text-destructive"> &middot; -{client.overduePercent}% bonus</span>
            )}
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          {isOverdue ? (
            <>
              <p className="font-mono text-sm font-bold text-destructive">
                {absDays}d
              </p>
              <p className="text-[9px] text-destructive">overdue</p>
            </>
          ) : (
            <>
              <p className="font-mono text-sm font-bold text-muted-foreground">
                {client.daysRemaining}d
              </p>
              <p className="text-[9px] text-muted-foreground">left</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Maintenance Panel

interface MaintenancePanelProps {
  clients: MaintenanceClient[]
  totalOverduePercent: number
}

export function MaintenancePanel({
  clients,
  totalOverduePercent,
}: MaintenancePanelProps) {
  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card"
      data-testid="maintenance-panel"
    >
      {/* Header */}
      <div className="border-b border-border/40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              Maintenance Track
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted-foreground">
              {clients.length} task{clients.length !== 1 ? 's' : ''}
            </span>
            <span
              className={cn(
                'font-mono text-xs font-semibold',
                totalOverduePercent > 0 ? 'text-destructive' : 'text-success',
              )}
            >
              overdue {totalOverduePercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Cards — sorted by days remaining (most urgent first) */}
      <div className="max-h-[260px] space-y-2 overflow-y-auto p-3">
        {clients.length > 0 ? (
          [...clients]
            .sort((a, b) => a.daysRemaining - b.daysRemaining)
            .map((c) => <ClientCard key={c.id} client={c} />)
        ) : (
          <div className="py-8 text-center">
            <ShieldCheck className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">
              No maintenance tasks
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
