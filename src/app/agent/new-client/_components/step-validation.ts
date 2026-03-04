import { STEP3_SPORTS_PLATFORMS, FINANCIAL_PLATFORMS } from '@/lib/platforms'
import type { PlatformEntry } from '@/types/backend-types'

/* ─── Per-step required field validation ─────────────────────────────── */

export interface StepValidationResult {
  complete: boolean
  missingFields: string[]
}

/**
 * Check if a given step has all required fields completed.
 * Returns which fields are missing (empty array = step is complete).
 */
export function isStepComplete(
  step: number,
  formData: Record<string, unknown>,
): StepValidationResult {
  const missing: string[] = []

  switch (step) {
    case 1: {
      if (!formData.firstName) missing.push('First Name')
      if (!formData.lastName) missing.push('Last Name')
      if (!formData.idDocument) missing.push('ID Document')
      if (!formData.assignedGmail) missing.push('Assigned Gmail')
      if (!formData.gmailScreenshot) missing.push('Gmail Screenshot')
      if (!formData.betmgmRegScreenshot) missing.push('BetMGM Registration Screenshot')
      if (!formData.betmgmLoginScreenshot) missing.push('BetMGM Login Screenshot')
      // If lives at different address, currentAddress is required
      if (formData.livesAtDifferentAddress && !formData.currentAddress) {
        missing.push('Current Address')
      }
      break
    }
    case 2: {
      // SSN: need document or number
      if (!formData.ssnDocument && !formData.ssnNumber) missing.push('SSN (document or number)')
      // Criminal record must be explicitly answered (boolean)
      if (formData.hasCriminalRecord === undefined || formData.hasCriminalRecord === null) {
        missing.push('Criminal Record status')
      }
      if (!formData.bankingHistory) missing.push('Banking History')
      if (!formData.householdAwareness) missing.push('Household Awareness')
      if (!formData.familyTechSupport) missing.push('Family Tech Support')
      if (!formData.financialAutonomy) missing.push('Financial Autonomy')
      if (!formData.digitalComfort) missing.push('Digital Comfort')
      if (!formData.deviceReservationDate) missing.push('Device Reservation Date')
      break
    }
    case 3: {
      // Sportsbooks: each needs 3 screenshots (BetMGM excluded — handled in Step 1)
      const platformData = (formData.platformData as PlatformEntry[]) || []
      for (const p of STEP3_SPORTS_PLATFORMS) {
        const entry = platformData.find((e) => e.platform === p)
        if (!entry) {
          missing.push(`${p}: all 3 images`)
          continue
        }
        const imageCount = [
          entry.screenshot,
          entry.screenshotPersonalInfo,
          entry.screenshotDeposit,
        ].filter(Boolean).length
        if (imageCount < 3) {
          missing.push(`${p}: ${3 - imageCount} image(s) missing`)
        }
      }
      // Financial platforms: need screenshot or username
      for (const p of FINANCIAL_PLATFORMS) {
        const entry = platformData.find((e) => e.platform === p)
        if (!entry || (!entry.screenshot && !entry.username)) {
          missing.push(`${p}: screenshot or username`)
        }
      }
      break
    }
    case 4: {
      if (!formData.contractDocument) missing.push('Contract Document')
      if (!formData.agentConfidenceLevel) missing.push('Agent Confidence Level')
      break
    }
  }

  return { complete: missing.length === 0, missingFields: missing }
}

/**
 * Determine the highest step a user can navigate to.
 * Step N+1 is reachable only if step N is complete.
 * Step 1 is always reachable.
 */
export function getMaxReachableStep(formData: Record<string, unknown>): number {
  for (let step = 1; step <= 3; step++) {
    const { complete } = isStepComplete(step, formData)
    if (!complete) return step
  }
  return 4
}

/**
 * Check if navigating to a target step is allowed.
 * Backward navigation is always allowed.
 * Forward navigation requires all intermediate steps to be complete.
 */
export function canNavigateToStep(
  currentStep: number,
  targetStep: number,
  formData: Record<string, unknown>,
): { allowed: boolean; missingFields: string[] } {
  // Backward — always allowed
  if (targetStep <= currentStep) {
    return { allowed: true, missingFields: [] }
  }

  // Forward — validate current step
  const { complete, missingFields } = isStepComplete(currentStep, formData)
  if (!complete) {
    return { allowed: false, missingFields }
  }

  // Also check intermediate steps
  for (let s = currentStep + 1; s < targetStep; s++) {
    const intermediate = isStepComplete(s, formData)
    if (!intermediate.complete) {
      return { allowed: false, missingFields: intermediate.missingFields }
    }
  }

  return { allowed: true, missingFields: [] }
}
