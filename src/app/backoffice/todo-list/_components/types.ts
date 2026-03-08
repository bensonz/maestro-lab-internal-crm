import type {
  ActionHubKPIs,
  RundownBlock,
  OverdueDevice,
  ActionHubTodo,
  FundAllocationEntry,
  TodoTimelineEntry,
} from '@/types/backend-types'

export type {
  ActionHubKPIs,
  RundownBlock,
  OverdueDevice,
  ActionHubTodo,
  FundAllocationEntry,
  TodoTimelineEntry,
}

export interface ActionHubViewProps {
  userName: string
  userRole: string
  kpis: ActionHubKPIs
  dailyRundown: RundownBlock[]
  overdueDevices: OverdueDevice[]
  pendingTodos: ActionHubTodo[]
  todayAllocations: FundAllocationEntry[]
  yesterdayAllocCount: number
  timeline: TodoTimelineEntry[]
}
