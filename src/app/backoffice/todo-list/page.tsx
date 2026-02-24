import {
  MOCK_ACTION_HUB_STATS,
  MOCK_PNL_STATUS,
  MOCK_FUND_ALERTS,
  MOCK_PENDING_ACTIONS,
  MOCK_AGENT_TASKS,
  MOCK_ACTIVE_AGENTS,
  MOCK_BACKOFFICE_SESSION,
} from '@/lib/mock-data'
import { ActionHubView } from './_components/action-hub-view'

export default function BackofficeActionHubPage() {
  const session = MOCK_BACKOFFICE_SESSION

  return (
    <ActionHubView
      stats={MOCK_ACTION_HUB_STATS}
      pnlStatus={MOCK_PNL_STATUS}
      fundAlerts={MOCK_FUND_ALERTS}
      pendingActions={MOCK_PENDING_ACTIONS}
      agentTasks={MOCK_AGENT_TASKS}
      activeAgents={MOCK_ACTIVE_AGENTS}
      userName={session.user.name}
      userRole={session.user.role}
    />
  )
}
