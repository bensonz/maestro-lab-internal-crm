import type {
  ActionHubStats,
  PnlStatus,
  FundAlert,
  PendingAction,
  PendingActionType,
  EnhancedAgentTasks,
  EnhancedTask,
  ActiveAgent,
} from '@/types/backend-types'

export type {
  ActionHubStats,
  PnlStatus,
  FundAlert,
  PendingAction,
  PendingActionType,
  EnhancedAgentTasks,
  EnhancedTask,
  ActiveAgent,
}

export interface ActionHubViewProps {
  stats: ActionHubStats
  pnlStatus: PnlStatus
  fundAlerts: FundAlert[]
  pendingActions: PendingAction[]
  agentTasks: EnhancedAgentTasks[]
  activeAgents: ActiveAgent[]
  userName: string
  userRole: string
}
