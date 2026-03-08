import type { EmailDetector, ParsedEmail, EmailDetection } from '../types'

const VERIFICATION_PATTERNS = [
  /\bverif(?:y|ication)\s+(?:your|account|identity)\b/i,
  /\baction\s+(?:needed|required)\b/i,
  /\bconfirm\s+(?:your|account)\b/i,
  /\bidentity\s+verification\b/i,
  /\bdocument\s+(?:upload|required|needed)\b/i,
  /\baccount\s+(?:locked|restricted|limited)\b/i,
]

const PLATFORM_SENDERS = [
  'draftkings',
  'fanduel',
  'betmgm',
  'caesars',
  'pointsbet',
  'espnbet',
  'fanatics',
  'bet365',
  'paypal',
  'chase',
  'bankofamerica',
  'wellsfargo',
  'capitalone',
]

export const verificationDetector: EmailDetector = {
  name: 'Verification Detector',

  detect(email: ParsedEmail): EmailDetection | null {
    const fromLower = email.from.toLowerCase()
    const isPlatform = PLATFORM_SENDERS.some((s) => fromLower.includes(s))
    if (!isPlatform) return null

    const combined = `${email.subject} ${email.snippet} ${email.body}`
    const matched = VERIFICATION_PATTERNS.filter((p) => p.test(combined))
    if (matched.length === 0) return null

    return {
      type: 'ACCOUNT_VERIFICATION',
      confidence: Math.min(0.5 + matched.length * 0.15, 1),
      data: {
        platform: PLATFORM_SENDERS.find((s) => fromLower.includes(s)) ?? 'unknown',
        matchedPatterns: matched.map((p) => p.source),
      },
    }
  },
}
