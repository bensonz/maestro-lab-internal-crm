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
  expectedIncome: number
  pendingTasks: number
}

export interface MaintenanceClient {
  id: string
  name: string
  taskCategory: 'platform_verification' | 'high_priority'
  taskDescription: string
  daysRemaining: number
  overduePercent: number
}

export interface TeamSupportItem {
  id: string
  agentName: string
  agentPhone: string
  hint: string
  potentialEarning: number
}

export interface AgentProfile {
  name: string
  starLevel: number
  totalClients: number
  activeClients: number
}

export interface DailyGoalData {
  potentialNew: number
  overduePercent: number
  bonusAmount: number
  effectiveBonus: number
  completedTasks: number
  totalTasks: number
  currentStreak: number
}
