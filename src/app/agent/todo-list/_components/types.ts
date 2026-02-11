// Shared types for Agent To-Do System

export type TimeRange = '1day' | '3days' | '7days'

export type TaskType =
  | 'PayPal'
  | 'Edgeboost'
  | 'Bank Setup'
  | 'Platform'
  | 'Document'
  | 'Verification'

export interface Todo {
  id: string
  title: string
  description: string
  client: string
  clientId: string
  taskType: TaskType | string
  priority: 'high' | 'medium' | 'low'
  completed: boolean
  dueHours: number
  triggerType: 'Rule' | 'Backoffice'
  triggerSource: string
  linkedStep: number
  createdAt: string
  extensionsUsed: number
  maxExtensions: number
  instructions: {
    mustDo: string[]
    mustNotDo: string[]
    successCriteria: string
    screenshotGuidance?: {
      page: string
      section: string
      example: string
    }
  }
}

export interface GrowthClient {
  id: string
  name: string
  stage: string
  stageLabel: string
  daysInPipeline: number
  directEarning: number
  starEarning: number
  downlineEarning: number
  upstreamShare: number
  recycledAmount: number
  finalTake: number
  poolPerLead: number
  pendingTasks: number
}

export interface MaintenanceClient {
  id: string
  name: string
  status: string
  statusLabel: string
  taskDescription: string
  overdueDays: number
  bonusRiskPercent: number
  atRiskAmount: number
  dueDate: string
}

export interface AgentProfile {
  name: string
  starLevel: number
  totalClients: number
  activeClients: number
}

export interface DailyGoalData {
  earnedToday: number
  dailyTarget: number
  potentialNew: number
  potentialMaintenance: number
  confirmedDirect: number
  confirmedStar: number
  confirmedDownline: number
  overdueCount: number
  overdueRiskAmount: number
  completedTasks: number
  totalTasks: number
  currentStreak: number
}

// New types for redesigned hub

export interface TeamMember {
  id: string
  name: string
  currentStep: string
  totalSteps: number
  completedSteps: number
  isOneStepAway: boolean
  totalClients: number
}

export interface TeamRanking {
  percentile: number
  myRank: number
  totalMembers: number
  speed: number
  stability: number
  influence: number
}
