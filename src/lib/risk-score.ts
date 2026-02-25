import type { RiskAssessment, RiskLevel } from '@/types/backend-types'

interface RiskFlags {
  idExpiryDaysRemaining?: number | null
  paypalPreviouslyUsed?: boolean
  multipleAddresses?: boolean
  debankedHistory?: boolean
  criminalRecord?: boolean
  missingIdCount?: number
  householdAwareness?: string
  familyTechSupport?: string
  financialAutonomy?: string
  bankPinOverride?: boolean
  bankNameOverride?: boolean
  bankPhoneEmailNotConfirmed?: boolean
}

const HOUSEHOLD_AWARENESS_SCORES: Record<string, number> = {
  supportive: 0,
  aware_neutral: -3,
  not_aware: -8,
  not_applicable: 0,
}

const FAMILY_TECH_SUPPORT_SCORES: Record<string, number> = {
  willing_to_help: 0,
  available_uninvolved: -5,
  no: -10,
  prefer_not_to_involve: -15,
}

const FINANCIAL_AUTONOMY_SCORES: Record<string, number> = {
  fully_independent: 0,
  shared_with_spouse: -5,
  dependent_on_others: -15,
}

/**
 * Negative scoring: starts at 0, each risk factor subtracts points.
 * Lower (more negative) = worse client.
 *
 * Scoring:
 *   Missing IDs: 0 missing = +10 bonus, each missing = -10
 *   ID expiry: <75 days = -20, 75-99 days = -10
 *   PayPal previously used: -10
 *   Multiple addresses: informational only (0)
 *   De-banked history: -30
 *   Criminal record: -30
 *   Household awareness: 0 to -8 (small impact)
 *   Family tech support: 0 to -15
 *   Financial autonomy: 0 to -15
 *   Digital comfort: informational only (0)
 *
 * Thresholds: 0 to +10 low, -1 to -29 medium, -30 or below high
 * Max best: +10 (no flags, no missing IDs, best answers)
 * Max worst: -158 (all flags active, 3 missing IDs, high ID expiry, worst answers)
 */
export function calculateRiskScore(flags: RiskFlags): RiskAssessment {
  let score = 0

  const days = flags.idExpiryDaysRemaining ?? null
  const paypalPreviouslyUsed = flags.paypalPreviouslyUsed ?? false
  const multipleAddresses = flags.multipleAddresses ?? false
  const debankedHistory = flags.debankedHistory ?? false
  const criminalRecord = flags.criminalRecord ?? false
  const missingIdCount = flags.missingIdCount ?? 0
  const householdAwareness = flags.householdAwareness ?? ''
  const familyTechSupport = flags.familyTechSupport ?? ''
  const financialAutonomy = flags.financialAutonomy ?? ''
  const bankPinOverride = flags.bankPinOverride ?? false
  const bankNameOverride = flags.bankNameOverride ?? false
  const bankPhoneEmailNotConfirmed = flags.bankPhoneEmailNotConfirmed ?? false

  // Missing IDs: 0 missing = +10 bonus, each missing type = -10
  if (missingIdCount === 0) {
    score += 10
  } else {
    score -= missingIdCount * 10
  }

  // 2-tier ID expiry: <75 = high (-20), 75-99 = moderate (-10), >=100 or null = none
  let idExpiryRisk: 'high' | 'moderate' | 'none' = 'none'
  if (days !== null) {
    if (days < 75) {
      idExpiryRisk = 'high'
      score -= 20
    } else if (days < 100) {
      idExpiryRisk = 'moderate'
      score -= 10
    }
  }

  if (paypalPreviouslyUsed) score -= 10
  // multipleAddresses is informational only — no score impact
  if (debankedHistory) score -= 30
  if (criminalRecord) score -= 30

  // Background assessment questions
  score += HOUSEHOLD_AWARENESS_SCORES[householdAwareness] ?? 0
  score += FAMILY_TECH_SUPPORT_SCORES[familyTechSupport] ?? 0
  score += FINANCIAL_AUTONOMY_SCORES[financialAutonomy] ?? 0
  // digitalComfort is informational only — no score impact

  let level: RiskLevel
  if (score <= -30) {
    level = 'high'
  } else if (score < 0) {
    level = 'medium'
  } else {
    level = 'low'
  }

  return {
    level,
    score,
    flags: {
      idExpiryRisk,
      paypalPreviouslyUsed,
      multipleAddresses,
      debankedHistory,
      criminalRecord,
      missingIdCount,
      householdAwareness,
      familyTechSupport,
      financialAutonomy,
      bankPinOverride,
      bankNameOverride,
      bankPhoneEmailNotConfirmed,
    },
  }
}
