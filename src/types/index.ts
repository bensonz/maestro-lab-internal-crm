// ============================================================
// Standalone type definitions (no Prisma dependency)
// Re-exports Prisma enums as const objects for runtime + type usage
// ============================================================

// --- Phase 1 Enums ---

export const UserRole = {
  AGENT: 'AGENT',
  BACKOFFICE: 'BACKOFFICE',
  ADMIN: 'ADMIN',
  FINANCE: 'FINANCE',
} as const
export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const ApplicationStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const
export type ApplicationStatus =
  (typeof ApplicationStatus)[keyof typeof ApplicationStatus]

export const EventType = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  APPLICATION_SUBMITTED: 'APPLICATION_SUBMITTED',
  APPLICATION_APPROVED: 'APPLICATION_APPROVED',
  APPLICATION_REJECTED: 'APPLICATION_REJECTED',
  APPROVAL: 'APPROVAL',
  REJECTION: 'REJECTION',
  PHONE_ISSUED: 'PHONE_ISSUED',
  PHONE_RETURNED: 'PHONE_RETURNED',
  KPI_IMPACT: 'KPI_IMPACT',
  DEADLINE_MISSED: 'DEADLINE_MISSED',
  COMMENT: 'COMMENT',
  PLATFORM_UPLOAD: 'PLATFORM_UPLOAD',
  TODO_COMPLETED: 'TODO_COMPLETED',
  STATUS_CHANGE: 'STATUS_CHANGE',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  CLIENT_APPROVED: 'CLIENT_APPROVED',
  BONUS_POOL_CREATED: 'BONUS_POOL_CREATED',
  BONUS_POOL_DISTRIBUTED: 'BONUS_POOL_DISTRIBUTED',
  STAR_LEVEL_CHANGED: 'STAR_LEVEL_CHANGED',
  LEADERSHIP_PROMOTED: 'LEADERSHIP_PROMOTED',
  ALLOCATION_PAID: 'ALLOCATION_PAID',
  QUARTERLY_SETTLEMENT_CREATED: 'QUARTERLY_SETTLEMENT_CREATED',
  CLIENT_DRAFT_CREATED: 'CLIENT_DRAFT_CREATED',
  CLIENT_DRAFT_SUBMITTED: 'CLIENT_DRAFT_SUBMITTED',
} as const
export type EventType = (typeof EventType)[keyof typeof EventType]

// --- Client Draft Enums ---

export const ClientDraftStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
} as const
export type ClientDraftStatus =
  (typeof ClientDraftStatus)[keyof typeof ClientDraftStatus]

// --- Commission System Enums ---

export const ClientStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CLOSED: 'CLOSED',
} as const
export type ClientStatus = (typeof ClientStatus)[keyof typeof ClientStatus]

export const BonusPoolStatus = {
  PENDING: 'PENDING',
  DISTRIBUTED: 'DISTRIBUTED',
} as const
export type BonusPoolStatus =
  (typeof BonusPoolStatus)[keyof typeof BonusPoolStatus]

export const AllocationStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
} as const
export type AllocationStatus =
  (typeof AllocationStatus)[keyof typeof AllocationStatus]

export const AllocationType = {
  DIRECT: 'DIRECT',
  STAR_SLICE: 'STAR_SLICE',
  BACKFILL: 'BACKFILL',
} as const
export type AllocationType =
  (typeof AllocationType)[keyof typeof AllocationType]

export const LeadershipTier = {
  NONE: 'NONE',
  ED: 'ED',
  SED: 'SED',
  MD: 'MD',
  CMO: 'CMO',
} as const
export type LeadershipTier =
  (typeof LeadershipTier)[keyof typeof LeadershipTier]

export const QuarterlySettlementStatus = {
  DRAFT: 'DRAFT',
  APPROVED: 'APPROVED',
  PAID: 'PAID',
} as const
export type QuarterlySettlementStatus =
  (typeof QuarterlySettlementStatus)[keyof typeof QuarterlySettlementStatus]

// --- Legacy enums kept for UI component compatibility ---

export const IntakeStatus = {
  PENDING: 'PENDING',
  PHONE_ISSUED: 'PHONE_ISSUED',
  IN_EXECUTION: 'IN_EXECUTION',
  NEEDS_MORE_INFO: 'NEEDS_MORE_INFO',
  PENDING_EXTERNAL: 'PENDING_EXTERNAL',
  EXECUTION_DELAYED: 'EXECUTION_DELAYED',
  INACTIVE: 'INACTIVE',
  READY_FOR_APPROVAL: 'READY_FOR_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PARTNERSHIP_ENDED: 'PARTNERSHIP_ENDED',
} as const
export type IntakeStatus = (typeof IntakeStatus)[keyof typeof IntakeStatus]

export const PlatformType = {
  DRAFTKINGS: 'DRAFTKINGS',
  FANDUEL: 'FANDUEL',
  BETMGM: 'BETMGM',
  CAESARS: 'CAESARS',
  FANATICS: 'FANATICS',
  BALLYBET: 'BALLYBET',
  BETRIVERS: 'BETRIVERS',
  BET365: 'BET365',
  BANK: 'BANK',
  PAYPAL: 'PAYPAL',
  EDGEBOOST: 'EDGEBOOST',
} as const
export type PlatformType = (typeof PlatformType)[keyof typeof PlatformType]

export const PlatformStatus = {
  NOT_STARTED: 'NOT_STARTED',
  PENDING_UPLOAD: 'PENDING_UPLOAD',
  PENDING_REVIEW: 'PENDING_REVIEW',
  NEEDS_MORE_INFO: 'NEEDS_MORE_INFO',
  PENDING_EXTERNAL: 'PENDING_EXTERNAL',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  LIMITED: 'LIMITED',
} as const
export type PlatformStatus =
  (typeof PlatformStatus)[keyof typeof PlatformStatus]

export const ToDoType = {
  EXECUTION: 'EXECUTION',
  UPLOAD_SCREENSHOT: 'UPLOAD_SCREENSHOT',
  PROVIDE_INFO: 'PROVIDE_INFO',
  PAYMENT: 'PAYMENT',
  PHONE_SIGNOUT: 'PHONE_SIGNOUT',
  PHONE_RETURN: 'PHONE_RETURN',
  VERIFICATION: 'VERIFICATION',
  BACKOFFICE_CUSTOM: 'BACKOFFICE_CUSTOM',
} as const
export type ToDoType = (typeof ToDoType)[keyof typeof ToDoType]

export const ToDoStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
} as const
export type ToDoStatus = (typeof ToDoStatus)[keyof typeof ToDoStatus]

export const ExtensionRequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const
export type ExtensionRequestStatus =
  (typeof ExtensionRequestStatus)[keyof typeof ExtensionRequestStatus]

export const TransactionType = {
  DEPOSIT: 'DEPOSIT',
  WITHDRAWAL: 'WITHDRAWAL',
  INTERNAL_TRANSFER: 'INTERNAL_TRANSFER',
  COMMISSION_PAYOUT: 'COMMISSION_PAYOUT',
  FEE: 'FEE',
  ADJUSTMENT: 'ADJUSTMENT',
} as const
export type TransactionType =
  (typeof TransactionType)[keyof typeof TransactionType]

export const SettlementStatus = {
  PENDING_REVIEW: 'PENDING_REVIEW',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
} as const
export type SettlementStatus =
  (typeof SettlementStatus)[keyof typeof SettlementStatus]

export const DailyCheckType = {
  PNL_RECONCILIATION: 'PNL_RECONCILIATION',
  FUND_REVIEW: 'FUND_REVIEW',
} as const
export type DailyCheckType =
  (typeof DailyCheckType)[keyof typeof DailyCheckType]

// --- Phase 1 Model interfaces ---

export interface User {
  id: string
  email: string
  passwordHash: string | null
  name: string
  role: UserRole
  phone: string | null
  avatar: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  supervisorId: string | null
  tier: string
  starLevel: number
  leadershipTier: LeadershipTier
  gender: string | null
  dateOfBirth: Date | null
  idNumber: string | null
  idExpiry: Date | null
  idDocument: string | null
  ssn: string | null
  citizenship: string | null
  personalEmail: string | null
  personalPhone: string | null
  companyPhone: string | null
  carrier: string | null
  zelle: string | null
  address: string | null
  loginAccount: string | null
}

export interface AgentApplication {
  id: string
  status: ApplicationStatus
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  gender: string | null
  dateOfBirth: Date | null
  citizenship: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  country: string | null
  idDocument: string | null
  idNumber: string | null
  idExpiry: Date | null
  zelle: string | null
  referredByName: string | null
  reviewedById: string | null
  reviewedAt: Date | null
  reviewNotes: string | null
  resultUserId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface EventLog {
  id: string
  eventType: EventType
  description: string
  userId: string | null
  metadata: Record<string, unknown> | null
  createdAt: Date
}

// --- UI-specific types ---

export interface NavItem {
  title: string
  href: string
  icon?: string
  badge?: number
  disabled?: boolean
}

// --- Legacy model interfaces kept for UI compat ---

export interface Client {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  idNumber: string | null
  idDocument: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  country: string | null
  questionnaire: string | null
  applicationNotes: string | null
  intakeStatus: IntakeStatus
  statusChangedAt: Date
  complianceReview: string | null
  complianceStatus: string | null
  backgroundCheck: boolean
  executionDeadline: Date | null
  deadlineExtensions: number
  agentId: string
  partnerId: string | null
  closedAt: Date | null
  closureReason: string | null
  closureProof: string[]
  closedById: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ClientPlatform {
  id: string
  clientId: string
  platformType: PlatformType
  status: PlatformStatus
  username: string | null
  accountId: string | null
  screenshots: string[]
  reviewNotes: string | null
  reviewedBy: string | null
  reviewedAt: Date | null
  externalId: string | null
  externalStatus: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ToDo {
  id: string
  title: string
  description: string | null
  type: ToDoType
  status: ToDoStatus
  priority: number
  dueDate: Date | null
  completedAt: Date | null
  stepNumber: number | null
  platformType: PlatformType | null
  extensionsUsed: number
  maxExtensions: number
  screenshots: string[]
  clientId: string | null
  assignedToId: string | null
  createdById: string
  metadata: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  link: string | null
  eventLogId: string | null
  clientId: string | null
  isRead: boolean
  readAt: Date | null
  createdAt: Date
}

export interface PhoneAssignment {
  id: string
  phoneNumber: string
  deviceId: string | null
  clientId: string | null
  agentId: string
  issuedById: string | null
  issuedAt: Date | null
  signedOutAt: Date | null
  returnedAt: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ClientWithRelations {
  id: string
  firstName: string
  lastName: string
  email: string | null
  intakeStatus: string
  agent: {
    id: string
    name: string
  }
  platforms: {
    platformType: string
    status: string
  }[]
  toDos: {
    id: string
    status: string
  }[]
  _count?: {
    toDos: number
    platforms: number
  }
}
