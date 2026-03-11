import type {
  ActionHubKPIs,
  RundownBlock,
  OverdueDevice,
  DeviceReservation,
  ActionHubTodo,
  FundAllocationEntry,
  FundClearingUrgency,
  TodoTimelineEntry,
  MotivationData,
  ProcessedEmailEntry,
  DiscrepancyEntry,
  TraderReportData,
} from '@/types/backend-types'

export type {
  ActionHubKPIs,
  RundownBlock,
  OverdueDevice,
  DeviceReservation,
  ActionHubTodo,
  FundAllocationEntry,
  FundClearingUrgency,
  TodoTimelineEntry,
  MotivationData,
  ProcessedEmailEntry,
  DiscrepancyEntry,
  TraderReportData,
}

export interface ActionHubViewProps {
  userName: string
  userRole: string
  kpis: ActionHubKPIs
  motivation: MotivationData
  dailyRundown: RundownBlock[]
  // Panel 1: Fund Record
  todayAllocations: FundAllocationEntry[]
  yesterdayAllocCount: number
  // Panel 2: Device Management
  overdueDevices: OverdueDevice[]
  deviceReservations: DeviceReservation[]
  // Panel 3: Clearing Status (verification)
  verificationAllocations: FundAllocationEntry[]
  lastGmailSync: Date | null
  // Panel 3 legacy (header/trader report still uses these)
  unconfirmedAllocations: FundAllocationEntry[]
  discrepancyAllocations: DiscrepancyEntry[]
  // Panel 4: Fund Insights
  processedEmails: ProcessedEmailEntry[]
  gmailMatchedCount: number
  // Panel 5: Agent Contact
  allTodos: ActionHubTodo[]
  // Activity Feed
  timeline: TodoTimelineEntry[]
  // Trader Report Page 2
  traderReportData: TraderReportData | null
}
