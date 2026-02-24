'use client'

import { Badge } from '@/components/ui/badge'
import { CheckCircle2, ArrowRightLeft, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FundAlert, ActionHubStats } from './types'

interface FundAlertsListProps {
  alerts: FundAlert[]
  stats: ActionHubStats
}

const issueBadge: Record<string, { label: string; className: string }> = {
  shortfall: {
    label: 'Shortfall',
    className: 'bg-destructive/20 text-destructive',
  },
  surplus: {
    label: 'Surplus',
    className: 'bg-warning/20 text-warning',
  },
  paypal_frequent: {
    label: 'PayPal',
    className: 'bg-primary/20 text-primary',
  },
}

export function FundAlertsList({ alerts, stats }: FundAlertsListProps) {
  return (
    <div data-testid="fund-alerts-list">
      {/* Quick stats */}
      <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <ArrowRightLeft className="h-3 w-3" />
          {stats.transfersToday} transfers today
        </span>
        <span className="flex items-center gap-1">
          <Receipt className="h-3 w-3" />
          {stats.pendingSettlements} pending settlements
        </span>
      </div>

      {alerts.length === 0 ? (
        <div
          className="flex items-center gap-2 rounded-md border border-success/20 bg-success/5 px-3 py-4"
          data-testid="fund-alerts-empty"
        >
          <CheckCircle2 className="h-5 w-5 text-success" />
          <p className="text-sm text-muted-foreground">
            All accounts balanced
          </p>
        </div>
      ) : (
        <div
          className="max-h-[200px] space-y-1 overflow-y-auto"
          data-testid="fund-alerts-scroll"
        >
          {alerts.map((alert, i) => {
            const badge = issueBadge[alert.issue]
            return (
              <div
                key={`${alert.clientId}-${alert.platformType}-${i}`}
                className={cn(
                  'flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/30',
                  alert.issue === 'shortfall' &&
                    'border-l-2 border-l-destructive',
                  alert.issue === 'surplus' &&
                    'border-l-2 border-l-warning',
                )}
                data-testid={`fund-alert-${alert.clientId}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {alert.clientName}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {alert.description}
                  </p>
                </div>
                {badge && (
                  <Badge className={cn('ml-2 flex-shrink-0 text-[10px]', badge.className)}>
                    {badge.label}
                  </Badge>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
