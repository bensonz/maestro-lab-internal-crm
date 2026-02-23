'use client'

import { BackofficeHeader } from './backoffice-header'
import { DailyOpsPanel } from './daily-ops-panel'
import { ActionQueuePanel } from './action-queue-panel'
import { AgentTaskOverview } from './agent-task-overview'
import type { ActionHubViewProps } from './types'

export function ActionHubView({
  stats,
  pnlStatus,
  fundAlerts,
  pendingActions,
  agentTasks,
  activeAgents,
  userName,
  userRole,
}: ActionHubViewProps) {
  return (
    <div
      className="mx-auto max-w-[1400px] animate-fade-in space-y-4 p-6"
      data-testid="action-hub-view"
    >
      <BackofficeHeader
        userName={userName}
        userRole={userRole}
        stats={stats}
        pnlStatus={pnlStatus}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DailyOpsPanel
          pnlStatus={pnlStatus}
          fundAlerts={fundAlerts}
          stats={stats}
        />
        <ActionQueuePanel actions={pendingActions} />
      </div>

      <AgentTaskOverview agentTasks={agentTasks} activeAgents={activeAgents} />
    </div>
  )
}
