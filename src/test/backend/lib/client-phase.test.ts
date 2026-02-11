import { describe, it, expect } from 'vitest'
import { getClientPhase, PHASE_COUNT, PHASE_SHORT_LABELS } from '@/lib/client-phase'
import { IntakeStatus } from '@/types'

describe('getClientPhase', () => {
  describe('PENDING status', () => {
    it('returns phase 1 when prequal not completed', () => {
      expect(
        getClientPhase({
          intakeStatus: IntakeStatus.PENDING,
          prequalCompleted: false,
          betmgmVerified: false,
        })
      ).toBe(1)
    })

    it('returns phase 1 when prequal completed but BetMGM not verified', () => {
      expect(
        getClientPhase({
          intakeStatus: IntakeStatus.PENDING,
          prequalCompleted: true,
          betmgmVerified: false,
        })
      ).toBe(1)
    })

    it('returns phase 2 when prequal completed and BetMGM verified', () => {
      expect(
        getClientPhase({
          intakeStatus: IntakeStatus.PENDING,
          prequalCompleted: true,
          betmgmVerified: true,
        })
      ).toBe(2)
    })
  })

  describe('PREQUAL_REVIEW status', () => {
    it('returns phase 1 when prequal completed but BetMGM not verified', () => {
      expect(
        getClientPhase({
          intakeStatus: IntakeStatus.PREQUAL_REVIEW,
          prequalCompleted: true,
          betmgmVerified: false,
        })
      ).toBe(1)
    })

    it('returns phase 1 when prequal not completed', () => {
      expect(
        getClientPhase({
          intakeStatus: IntakeStatus.PREQUAL_REVIEW,
          prequalCompleted: false,
          betmgmVerified: false,
        })
      ).toBe(1)
    })

    it('returns phase 2 when prequal completed and BetMGM verified', () => {
      expect(
        getClientPhase({
          intakeStatus: IntakeStatus.PREQUAL_REVIEW,
          prequalCompleted: true,
          betmgmVerified: true,
        })
      ).toBe(2)
    })
  })

  describe('PREQUAL_APPROVED status', () => {
    it('returns phase 2 regardless of other flags', () => {
      expect(
        getClientPhase({
          intakeStatus: IntakeStatus.PREQUAL_APPROVED,
          prequalCompleted: false,
          betmgmVerified: false,
        })
      ).toBe(2)
    })
  })

  describe('Phase 3 statuses', () => {
    it('returns phase 3 for PHONE_ISSUED', () => {
      expect(
        getClientPhase({
          intakeStatus: IntakeStatus.PHONE_ISSUED,
          prequalCompleted: true,
          betmgmVerified: true,
        })
      ).toBe(3)
    })

    it('returns phase 3 for IN_EXECUTION', () => {
      expect(
        getClientPhase({
          intakeStatus: IntakeStatus.IN_EXECUTION,
          prequalCompleted: true,
          betmgmVerified: true,
        })
      ).toBe(3)
    })
  })

  describe('Phase 4 status', () => {
    it('returns phase 4 for READY_FOR_APPROVAL', () => {
      expect(
        getClientPhase({
          intakeStatus: IntakeStatus.READY_FOR_APPROVAL,
          prequalCompleted: true,
          betmgmVerified: true,
        })
      ).toBe(4)
    })
  })

  describe('Terminal/unknown statuses', () => {
    it('returns null for APPROVED', () => {
      expect(
        getClientPhase({
          intakeStatus: IntakeStatus.APPROVED,
          prequalCompleted: true,
          betmgmVerified: true,
        })
      ).toBeNull()
    })

    it('returns null for REJECTED', () => {
      expect(
        getClientPhase({
          intakeStatus: IntakeStatus.REJECTED,
          prequalCompleted: true,
          betmgmVerified: true,
        })
      ).toBeNull()
    })

    it('returns null for PARTNERSHIP_ENDED', () => {
      expect(
        getClientPhase({
          intakeStatus: IntakeStatus.PARTNERSHIP_ENDED,
          prequalCompleted: true,
          betmgmVerified: true,
        })
      ).toBeNull()
    })
  })
})

describe('Phase constants', () => {
  it('has 4 phases', () => {
    expect(PHASE_COUNT).toBe(4)
  })

  it('has labels for all 4 phases', () => {
    expect(Object.keys(PHASE_SHORT_LABELS)).toHaveLength(4)
    expect(PHASE_SHORT_LABELS[1]).toBe('Pre-Qualification')
    expect(PHASE_SHORT_LABELS[2]).toBe('Application in Progress')
    expect(PHASE_SHORT_LABELS[3]).toBe('In Processing')
    expect(PHASE_SHORT_LABELS[4]).toBe('Pending Approval')
  })
})
