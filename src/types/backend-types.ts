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
  clientId: string | null
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

export interface ActionHubStats {
  pnlCompleted: boolean
  pendingActions: number
  overdueCount: number
  fundAlertsCount: number
  pendingSettlements: number
  transfersToday: number
}

export interface PnlStatus {
  completed: boolean
  completedBy: string | null
  completedAtFormatted: string | null
}

export interface FundAlert {
  clientId: string
  clientName: string
  issue: 'shortfall' | 'surplus' | 'paypal_frequent'
  platformType: string
  balance: number
  description: string
}

export type PendingActionType =
  | 'screenshot_review'
  | 'extension_request'
  | 'client_approval'
  | 'settlement_review'

export interface PendingAction {
  id: string
  type: PendingActionType
  title: string
  clientName: string
  agentName: string
  urgency: 'critical' | 'high' | 'normal'
  createdAt: Date
  ageFormatted: string
  link: string
}

export interface EnhancedTask {
  id: string
  title: string
  client: string
  clientId: string | null
  category: string
  type: string
  status: string
  dueIn: string
  dueDate: Date | null
  overdue: boolean
}

export interface EnhancedAgentTasks {
  agentId: string
  agentName: string
  tasks: EnhancedTask[]
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

export interface ClientDraftSummary {
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
    addressMismatch: boolean
    debankedHistory: boolean
    criminalRecord: boolean
    undisclosedInfo: boolean
  }
}

export interface PlatformEntry {
  platform: string
  username: string
  accountId: string
  screenshot: string
  status: string
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
}

export interface BonusPoolData {
  id: string
  clientId: string
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
