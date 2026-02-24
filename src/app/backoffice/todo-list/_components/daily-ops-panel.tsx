'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity } from 'lucide-react'
import { PnlCheckCard } from './pnl-check-card'
import { FundAlertsList } from './fund-alerts-list'
import type { PnlStatus, FundAlert, ActionHubStats } from './types'

interface DailyOpsPanelProps {
  pnlStatus: PnlStatus
  fundAlerts: FundAlert[]
  stats: ActionHubStats
}

export function DailyOpsPanel({
  pnlStatus,
  fundAlerts,
  stats,
}: DailyOpsPanelProps) {
  return (
    <Card data-testid="daily-ops-panel">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4 text-primary" />
          Daily Operations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <PnlCheckCard pnlStatus={pnlStatus} />
        <FundAlertsList alerts={fundAlerts} stats={stats} />
      </CardContent>
    </Card>
  )
}
