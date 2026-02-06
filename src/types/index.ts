// Re-export Prisma types
export type {
  User,
  Client,
  ClientPlatform,
  ToDo,
  EventLog,
  PhoneAssignment,
  AgentMetrics,
  Earning,
  FundAllocation,
} from '@prisma/generated/browser'

export {
  UserRole,
  IntakeStatus,
  PlatformType,
  PlatformStatus,
  ToDoType,
  ToDoStatus,
  EventType,
} from '@prisma/generated/browser'

// UI-specific types
export interface NavItem {
  title: string
  href: string
  icon?: string
  badge?: number
  disabled?: boolean
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
