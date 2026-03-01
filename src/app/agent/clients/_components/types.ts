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
  // Approved client extras
  phone: string | null
  age: number | null
  state: string | null
  zelle: string | null
  /** Duration from draft creation (scan ID) to submission, e.g. "3d11h" */
  intakeDuration: string | null
  /** Start date formatted, e.g. "Feb 26" */
  startDate: string | null
}

export interface AgentDraft {
  id: string
  name: string
  step: number
  /** Draft status: 'DRAFT' or 'SUBMITTED' */
  status: string
  /** Completed inner-steps for the current step */
  innerStepCompleted: number
  /** Total inner-steps for the current step (step 1: 3, step 2: 4, step 3: 11, step 4: 11) */
  innerStepTotal: number
  updatedAt: string
  lastUpdated: string
}
