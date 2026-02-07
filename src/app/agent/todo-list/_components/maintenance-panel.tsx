'use client'

import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  ShieldAlert,
  TrendingDown,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { MaintenanceClient } from './types'

// Client Card

function ClientCard({ client }: { client: MaintenanceClient }) {
  const isOverdue = client.overdueDays > 0
  const isHighRisk = client.bonusRiskPercent >= 50

  return (
    <div
      className={cn(
        'rounded-md border bg-muted/10 p-3',
        isOverdue ? 'border-destructive/30' : 'border-border/30',
      )}
      data-testid={`maintenance-client-${client.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {client.name}
            </span>
            <Badge
              variant="outline"
              className={cn(
                'h-4 px-1.5 text-[9px]',
                client.status === 'active'
                  ? 'border-success/40 text-success'
                  : client.status === 'verification'
                    ? 'border-warning/40 text-warning'
                    : 'border-border text-muted-foreground',
              )}
            >
              {client.statusLabel}
            </Badge>
          </div>
          <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
            {client.taskDescription}
          </p>
        </div>

        {isOverdue ? (
          <Badge className="h-5 flex-shrink-0 border-destructive/30 bg-destructive/15 font-mono text-[10px] text-destructive">
            <Clock className="mr-1 h-3 w-3" />
            {client.overdueDays}d overdue
          </Badge>
        ) : (
          <Badge className="h-5 flex-shrink-0 bg-muted font-mono text-[10px] text-muted-foreground">
            <Clock className="mr-1 h-3 w-3" />
            Due {client.dueDate}
          </Badge>
        )}
      </div>

      {/* Risk metrics */}
      <div className="mt-2.5 flex items-center gap-3 border-t border-border/20 pt-2">
        <div className="flex items-center gap-1.5">
          <ShieldAlert
            className={cn(
              'h-3 w-3',
              isHighRisk ? 'text-destructive' : 'text-warning',
            )}
          />
          <span
            className={cn(
              'font-mono text-[10px] font-medium',
              isHighRisk ? 'text-destructive' : 'text-warning',
            )}
          >
            {client.bonusRiskPercent}% risk
          </span>
        </div>
        <span className="text-muted-foreground/20">&middot;</span>
        <div className="flex items-center gap-1.5">
          <TrendingDown
            className={cn(
              'h-3 w-3',
              client.atRiskAmount > 0
                ? 'text-destructive'
                : 'text-muted-foreground',
            )}
          />
          <span
            className={cn(
              'font-mono text-[10px] font-medium',
              client.atRiskAmount > 0
                ? 'text-destructive'
                : 'text-muted-foreground',
            )}
          >
            ${client.atRiskAmount} at risk
          </span>
        </div>
      </div>
    </div>
  )
}

// Maintenance Panel

interface MaintenancePanelProps {
  clients: MaintenanceClient[]
  totalOverdue: number
  totalAtRisk: number
}

export function MaintenancePanel({
  clients,
  totalOverdue,
  totalAtRisk,
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
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Maintenance Track
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Existing Client Verification
              </p>
            </div>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {clients.length} client{clients.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Alert summary */}
        {totalOverdue > 0 ? (
          <div className="mt-2.5 flex items-center gap-2 rounded-md border border-destructive/15 bg-destructive/5 px-3 py-1.5">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-destructive" />
            <span className="text-[11px] text-destructive">
              <span className="font-semibold">{totalOverdue} overdue</span>{' '}
              &mdash; 15% bonus penalty per week
            </span>
            <span className="ml-auto font-mono text-[11px] font-semibold text-destructive">
              ${totalAtRisk}
            </span>
          </div>
        ) : (
          <div className="mt-2.5 flex items-center gap-2 rounded-md border border-success/15 bg-success/5 px-3 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-success" />
            <span className="text-[11px] font-medium text-success">
              All maintenance on track &mdash; no penalties
            </span>
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {clients.length > 0 ? (
          clients.map((c) => <ClientCard key={c.id} client={c} />)
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
