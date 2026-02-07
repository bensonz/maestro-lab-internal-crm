import { IntakeStatus } from '@/types'

export interface AgentClient {
  id: string
  name: string
  intakeStatus: IntakeStatus
  status: string
  statusColor: string
  nextTask: string | null
  step: number
  totalSteps: number
  progress: number
  lastUpdated: string
  updatedAt: string
  deadline: string | null
}
