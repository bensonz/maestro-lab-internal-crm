import type { RiskAssessment, RiskLevel } from '@/types/backend-types'

interface RiskFlags {
  idExpiringSoon?: boolean
  paypalPreviouslyUsed?: boolean
  addressMismatch?: boolean
  debankedHistory?: boolean
  criminalRecord?: boolean
  undisclosedInfo?: boolean
}

export function calculateRiskScore(flags: RiskFlags): RiskAssessment {
  let score = 0

  const idExpiringSoon = flags.idExpiringSoon ?? false
  const paypalPreviouslyUsed = flags.paypalPreviouslyUsed ?? false
  const addressMismatch = flags.addressMismatch ?? false
  const debankedHistory = flags.debankedHistory ?? false
  const criminalRecord = flags.criminalRecord ?? false
  const undisclosedInfo = flags.undisclosedInfo ?? false

  if (idExpiringSoon) score += 10
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
      idExpiringSoon,
      paypalPreviouslyUsed,
      addressMismatch,
      debankedHistory,
      criminalRecord,
      undisclosedInfo,
    },
  }
}
