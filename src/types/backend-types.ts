// ============================================================
// Types originally defined in backend data/service layers,
// needed by UI components. Standalone definitions (no backend deps).
// ============================================================

import type { PlatformType, AllocationType, AllocationStatus, LeadershipTier } from '@/types'

// --- From backend/data/agent.ts ---

export interface PriorityAction {
  type: 'overdue' | 'due-today' | 'needs-info' | 'deadline-approaching'
  title: string
  clientName: string | null
  clientId: string | null
  link: string
  createdAt: Date
}

// --- From backend/data/operations.ts ---

export type IntakeStatusType =
  | 'needs_info'
  | 'pending_platform'
  | 'ready'
  | 'followup'

export type InProgressSubStage =
  | 'step-1'
  | 'step-2'
  | 'step-3'
  | 'step-4'
  | 'pending-approval'

export type ExceptionType =
  | 'deadline-approaching'
  | 'overdue'
  | 'platform-rejection'
  | 'needs-more-info'
  | 'extension-pending'
  | 'execution-delayed'

export interface ExceptionState {
  type: ExceptionType
  label: string
  platformName?: string
}

export interface IntakeClient {
  id: string
  name: string
  status: string
  statusType: IntakeStatusType
  statusColor: string
  agentId: string
  agentName: string
  days: number
  daysLabel: string
  canApprove: boolean
  canAssignPhone: boolean
  pendingPlatform?: string
  subStage: InProgressSubStage | 'verification-needed'
  executionDeadline: Date | null
  deadlineExtensions: number
  pendingExtensionRequest: {
    id: string
    requestedDays: number
    reason: string
  } | null
  platformProgress: { verified: number; total: number }
  exceptionStates: ExceptionState[]
  rejectedPlatforms: string[]
  /** For step-3 clients with active device sign-out: the PhoneAssignment ID */
  activeAssignmentId?: string | null
  /** For step-4 clients with returned device: the RETURNED PhoneAssignment ID (for undo/re-issue) */
  returnedAssignmentId?: string | null
  /** Phone number assigned to this client (for badge hover) */
  assignedPhone?: string | null
  /** Carrier of assigned phone */
  assignedCarrier?: string | null
  /** Number of unique addresses discovered across platform screenshots */
  addressCount?: number
  /** Whether both debit cards (Bank + Edgeboost) have been uploaded */
  hasDebitCards?: boolean
}

export interface PostApprovalClient {
  id: string
  name: string
  agentId: string
  agentName: string
  approvedAt: Date | null
  daysSinceApproval: number
  limitedPlatforms: { platformType: PlatformType; name: string }[]
  pendingVerificationTodos: number
}

export interface VerificationTask {
  id: string
  clientRecordId: string
  clientName: string
  platformType: PlatformType | null
  platformLabel: string
  task: string
  agentId: string | null
  agentName: string
  deadline: Date | null
  daysUntilDue: number | null
  deadlineLabel: string
  clientDeadline: Date | null
  status: 'Pending' | 'Done'
  screenshots: string[]
  /** Previously assigned phone number (for re-assignment pre-fill) */
  assignedPhone?: string | null
  /** Previously assigned carrier (for re-assignment pre-fill) */
  assignedCarrier?: string | null
}

export interface SettlementClient {
  id: string
  name: string
  totalDeposited: number
  totalWithdrawn: number
  netBalance: number
  platforms: {
    name: string
    abbrev: string
    category: 'sports' | 'financial' | 'other'
    deposited: number
    withdrawn: number
  }[]
  recentTransactions: {
    id: string
    date: string
    type: 'deposit' | 'withdrawal'
    amount: number
    platform: string
    status: string
    settlementStatus: string
    reviewedBy: string | null
    reviewedAt: string | null
    reviewNotes: string | null
  }[]
  settlementCounts: {
    pendingReview: number
    confirmed: number
    rejected: number
  }
}

// --- From backend/data/hierarchy.ts ---

export interface HierarchyAgent {
  id: string
  name: string
  email: string
  avatar: string | null
  tier: string
  starLevel: number
  isActive: boolean
  role: string
  totalClients: number
  approvedClients: number
  successRate: number
}

export interface HierarchyNode extends HierarchyAgent {
  subordinates: HierarchyNode[]
}

export interface TeamRollup {
  totalAgents: number
  activeAgents: number
  totalClients: number
  approvedClients: number
  teamSuccessRate: number
  tierBreakdown: Record<string, number>
}

// --- From backend/data/action-hub.ts ---

export interface ActionHubKPIs {
  pendingTodos: number
  overdueTodos: number
  overdueDevices: number
  todayAllocations: number
  readyToApprove: number
  unconfirmedAllocations: number
}

export interface RundownBlock {
  label: string
  phase: string
  items: RundownItem[]
}

export interface RundownItem {
  label: string
  description?: string
  count?: number
  link?: string
  done?: boolean
}

export interface OverdueDevice {
  assignmentId: string
  phoneNumber: string
  agentId: string
  agentName: string
  clientName: string
  dueBackAt: Date
  daysOverdue: number
}

export interface ActionHubTodo {
  id: string
  title: string
  issueCategory: string
  clientName: string
  agentId: string
  agentName: string
  dueDate: Date
  daysUntilDue: number
  overdue: boolean
  clientRecordId: string
  source: string
}

export interface FundAllocationEntry {
  id: string
  amount: number
  platform: string
  direction: string
  notes: string | null
  recordedBy: string
  createdAt: Date
  confirmationStatus: string
  confirmedAmount: number | null
  confirmedAt: Date | null
  confirmedBy: string | null
}

export interface ActiveAgent {
  id: string
  name: string
}

// --- From backend/services/agent-kpis.ts ---

export interface AgentKPIs {
  totalClients: number
  approvedClients: number
  rejectedClients: number
  inProgressClients: number
  delayedClients: number
  successRate: number
  delayRate: number
  extensionRate: number
  avgDaysToInitiate: number | null
  avgDaysToConvert: number | null
  pendingTodos: number
  overdueTodos: number
}

// --- From backend/data/backoffice.ts ---

export interface AgentDetailData {
  id: string
  name: string
  gender: string
  age: number
  idNumber: string
  idExpiry: string
  ssn: string
  citizenship: string
  startDate: string
  tier: string
  stars: number
  companyPhone: string
  carrier: string
  companyEmail: string
  personalEmail: string
  personalPhone: string
  zelle: string
  address: string
  loginAccount: string
  loginEmail: string
  totalClients: number
  totalEarned: number
  thisMonthEarned: number
  newClientsThisMonth: number
  newClientsGrowth: number
  avgDaysToInitiate: number
  avgDaysToConvert: number
  successRate: number
  referralRate: number
  extensionRate: number
  resubmissionRate: number
  avgAccountsPerClient: number
  clientsInProgress: number
  avgDailyTodos: number
  delayRate: number
  monthlyClients: { month: string; count: number }[]
  supervisor: { id: string; name: string } | null
  directReports: { id: string; name: string }[]
  timeline: {
    date: string
    event: string
    type: 'info' | 'success' | 'warning'
    actor: string | null
  }[]
  idDocumentUrl: string | undefined
}

export interface LifecycleStats {
  total: number
  inProgress: number
  pendingReview: number
  verification: number
}

// --- From app/actions/todos.ts ---

export interface AIDetection {
  path: string
  contentType: string
  confidence: number
  extracted: Record<string, string>
}

// --- Client Draft Types ---

export interface ClientRecordSummary {
  id: string
  firstName: string | null
  lastName: string | null
  step: number
  updatedAt: Date
  status: string
}

export type RiskLevel = 'low' | 'medium' | 'high'

export interface RiskAssessment {
  level: RiskLevel
  score: number
  flags: {
    idExpiryRisk: 'high' | 'moderate' | 'none'
    paypalPreviouslyUsed: boolean
    multipleAddresses: boolean
    debankedHistory: boolean
    criminalRecord: boolean
    missingIdCount: number
    householdAwareness: string
    familyTechSupport: string
    financialAutonomy: string
    betmgmEmailMismatch: boolean
    bankPinOverride: boolean
    bankNameOverride: boolean
    bankPhoneEmailNotConfirmed: boolean
    credentialMismatches: Record<string, { username: boolean; password: boolean }>
    discoveredAddressCount: number
  }
}

export interface PlatformEntry {
  platform: string
  username: string
  accountId: string
  screenshot: string
  status: string
  pin?: string
  pinSuggested?: string
  pinSuggested6?: string
  bank?: string
  bankAutoDetected?: string
  bankPhoneEmailConfirmed?: boolean
  screenshot2?: string
  paypalBalanceDetected?: boolean
  /** Bank routing number (Online Banking only) */
  routingNumber?: string
  /** Bank account number (Online Banking only) */
  bankAccountNumber?: string
  /** Array of screenshot URLs/paths for multi-upload support */
  screenshots?: string[]
  /** Address detected from OCR on this platform's screenshots */
  detectedAddress?: string
  /** Personal info page screenshot (sportsbook only) */
  screenshotPersonalInfo?: string
  /** Ready-to-deposit page screenshot (sportsbook only) */
  screenshotDeposit?: string
  /** True when screenshotDeposit is present — platform is deposit-ready */
  depositDetected?: boolean
  /** Agent confirmed deposit page is accessible (sportsbook only) */
  depositPageVerified?: boolean
  /** Agent confirmed address matches a benchmark address (sportsbook only) */
  addressMatchesBenchmark?: boolean
}

// --- Discovered Address Types ---

export interface DiscoveredAddress {
  /** The full address string */
  address: string
  /** Source platform: 'ID' | 'BETMGM' | 'PAYPAL' | etc. */
  source: string
  /** Whether the agent has confirmed this address */
  confirmedByAgent?: boolean
}

// --- Todo Review Types ---

export interface PoolAllocationSummary {
  agentName: string
  type: 'DIRECT' | 'STAR_SLICE' | 'BACKFILL'
  amount: number
  slices: number
}

export interface ApprovedClientEntry {
  id: string
  clientName: string
  agentId: string
  agentName: string
  approvedAt: Date
  poolSummary: {
    totalAmount: number
    directAmount: number
    starPoolAmount: number
    distributedSlices: number
    recycledSlices: number
    allocations: PoolAllocationSummary[]
  } | null
}

export interface CompletedTodoEntry {
  id: string
  clientName: string
  agentId: string
  agentName: string
  issueCategory: string
  title: string
  completedAt: Date
  completedByName: string
  clientRecordId: string
  createdByName: string
}

export interface TodoTimelineEntry {
  id: string
  date: string
  time: string
  createdAt: Date
  event: string
  type: 'info' | 'success' | 'warning'
  actor: string | null
  action: 'assigned' | 'completed' | 'reverted' | 'device_out' | 'device_returned' | 'device_reissued' | 'client_approved' | 'client_reverted'
}

// --- Commission System Types ---

export interface AllocationLine {
  id: string
  agentId: string
  agentName: string
  agentStarLevel: number
  type: AllocationType
  slices: number
  amount: number
  status: AllocationStatus
  paidAt: Date | null
  createdAt: Date
  clientName: string | null
  closerName: string | null
}

export interface BonusPoolData {
  id: string
  clientRecordId: string
  clientName: string
  closerId: string
  closerName: string
  closerStarLevel: number
  totalAmount: number
  directAmount: number
  starPoolAmount: number
  distributedSlices: number
  recycledSlices: number
  status: string
  distributedAt: Date | null
  allocations: AllocationLine[]
}

export interface CommissionOverviewData {
  totalPools: number
  totalDistributed: number
  totalPending: number
  totalRecycled: number
  pools: BonusPoolData[]
}

export interface AgentEarningsData {
  agentId: string
  agentName: string
  starLevel: number
  leadershipTier: LeadershipTier
  totalEarned: number
  pendingAmount: number
  paidAmount: number
  directBonuses: number
  starSliceBonuses: number
  backfillBonuses: number
  allocations: AllocationLine[]
}

export interface AgentLeaderboardEntry {
  agentId: string
  agentName: string
  starLevel: number
  approvedClients: number
  totalEarned: number
}

// --- Device / Phone Assignment Types ---

export interface DeviceRequestItem {
  clientRecordId: string
  clientName: string
  agentId: string
  agentName: string
  reservationDate: string
  draftStep: number
  daysSinceRequest: number
}

export interface ActiveDeviceSignOut {
  assignmentId: string
  phoneNumber: string
  carrier: string | null
  deviceId: string | null
  clientName: string
  clientRecordId: string
  agentId: string
  agentName: string
  signedOutAt: Date
  dueBackAt: Date
  hoursRemaining: number
  isOverdue: boolean
  signedOutByName: string
  notes: string | null
}

export interface QuarterlySettlementData {
  id: string
  leaderId: string
  leaderName: string
  leaderTier: LeadershipTier
  year: number
  quarter: number
  teamRevenue: number
  commissionPercent: number
  commissionAmount: number
  teamSize: number
  status: string
}
