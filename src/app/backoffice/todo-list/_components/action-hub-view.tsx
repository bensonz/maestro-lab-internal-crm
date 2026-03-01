'use client'

import { BackofficeHeader } from './backoffice-header'
import { DailyRundown } from './daily-rundown'
import { OverdueDevicesPanel } from './overdue-devices-panel'
import { PendingTodosPanel } from './pending-todos-panel'
import { FundAllocationsPanel } from './fund-allocations-panel'
import { ActivityFeed } from './activity-feed'
import type { ActionHubViewProps } from './types'

export function ActionHubView({
  userName,
  userRole,
  kpis,
  dailyRundown,
  overdueDevices,
  pendingTodos,
  todayAllocations,
  yesterdayAllocCount,
  timeline,
}: ActionHubViewProps) {
  return (
    <div
      className="mx-auto max-w-[1400px] animate-fade-in space-y-4 p-6"
      data-testid="action-hub-view"
    >
      <BackofficeHeader
        userName={userName}
        userRole={userRole}
        kpis={kpis}
      />

      <DailyRundown blocks={dailyRundown} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <OverdueDevicesPanel devices={overdueDevices} />
        <PendingTodosPanel todos={pendingTodos} />
      </div>

      <FundAllocationsPanel
        allocations={todayAllocations}
        yesterdayCount={yesterdayAllocCount}
      />

      <ActivityFeed entries={timeline} />
    </div>
  )
}
