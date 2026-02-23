import type { RiskAssessment, RiskLevel } from '@/types/backend-types'

interface RiskFlags {
  idExpiryDaysRemaining?: number | null
  paypalPreviouslyUsed?: boolean
  addressMismatch?: boolean
  debankedHistory?: boolean
  criminalRecord?: boolean
  undisclosedInfo?: boolean
}

export function calculateRiskScore(flags: RiskFlags): RiskAssessment {
  let score = 0

  const days = flags.idExpiryDaysRemaining ?? null
  const paypalPreviouslyUsed = flags.paypalPreviouslyUsed ?? false
  const addressMismatch = flags.addressMismatch ?? false
  const debankedHistory = flags.debankedHistory ?? false
  const criminalRecord = flags.criminalRecord ?? false
  const undisclosedInfo = flags.undisclosedInfo ?? false

  // 2-tier ID expiry: <75 = high (20pts), 75-99 = moderate (10pts), >=100 or null = none
  let idExpiryRisk: 'high' | 'moderate' | 'none' = 'none'
  if (days !== null) {
    if (days < 75) {
      idExpiryRisk = 'high'
      score += 20
    } else if (days < 100) {
      idExpiryRisk = 'moderate'
      score += 10
    }
  }

  if (paypalPreviouslyUsed) score += 10
  // addressMismatch is informational only — no score impact
  if (debankedHistory) score += 30
  if (criminalRecord) score += 30
  if (undisclosedInfo) score += 20

  let level: RiskLevel
  if (score >= 50) {
    level = 'high'
  } else if (score >= 30) {
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
      addressMismatch,
      debankedHistory,
      criminalRecord,
      undisclosedInfo,
    },
  }
}
