import { IntakeStatus } from '@/types'

export const PHASE_COUNT = 4

export const PHASE_SHORT_LABELS: Record<number, string> = {
  1: 'Pre-Qualification',
  2: 'Application in Progress',
  3: 'In Processing',
  4: 'Pending Approval',
}

/**
 * Determine which phase a client is in based on their intake status
 * and pre-qualification state.
 *
 * Phase 1: ID & Account Collection (PENDING + not prequal-completed, or PREQUAL_REVIEW)
 * Phase 2: Background & Risk Questionnaire (PREQUAL_APPROVED, or legacy PENDING + prequal + BetMGM verified)
 * Phase 3: Financial & Sportsbook Setup (PHONE_ISSUED or IN_EXECUTION)
 * Phase 4: Contract & Submission (READY_FOR_APPROVAL)
 */
export function getClientPhase({
  intakeStatus,
  prequalCompleted,
  betmgmVerified,
}: {
  intakeStatus: string
  prequalCompleted: boolean
  betmgmVerified: boolean
}): number | null {
  switch (intakeStatus) {
    case IntakeStatus.PENDING:
      if (!prequalCompleted) return 1
      if (betmgmVerified) return 2
      // prequal completed but BetMGM not yet verified — still phase 1
      return 1
    case IntakeStatus.PREQUAL_REVIEW:
      // Pre-qualification submitted, awaiting backoffice review — still Phase 1
      return 1
    case IntakeStatus.PREQUAL_APPROVED:
      // Pre-qualification approved, agent can fill Phase 2
      return 2
    case IntakeStatus.PHONE_ISSUED:
    case IntakeStatus.IN_EXECUTION:
      return 3
    case IntakeStatus.READY_FOR_APPROVAL:
      return 4
    default:
      return null
  }
}
