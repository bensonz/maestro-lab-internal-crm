import type { EmailDetector, ParsedEmail, EmailDetection } from '../types'

const VIP_PATTERNS = [
  /\bvip\b/i,
  /\belevated\s+status\b/i,
  /\bpriority\s+(?:account|member|player)\b/i,
  /\bexclusive\s+(?:offer|access|reward)\b/i,
  /\bloyalty\s+tier\b/i,
]

const SPORTSBOOK_SENDERS = [
  'draftkings',
  'fanduel',
  'betmgm',
  'caesars',
  'pointsbet',
  'espnbet',
  'fanatics',
  'bet365',
]

export const vipDetector: EmailDetector = {
  name: 'VIP Detector',

  detect(email: ParsedEmail): EmailDetection | null {
    const fromLower = email.from.toLowerCase()
    const isSportsbook = SPORTSBOOK_SENDERS.some((s) => fromLower.includes(s))
    if (!isSportsbook) return null

    const combined = `${email.subject} ${email.snippet} ${email.body}`
    const matched = VIP_PATTERNS.filter((p) => p.test(combined))
    if (matched.length === 0) return null

    return {
      type: 'VIP_REPLY',
      confidence: Math.min(0.5 + matched.length * 0.15, 1),
      data: {
        platform: SPORTSBOOK_SENDERS.find((s) => fromLower.includes(s)) ?? 'unknown',
        matchedPatterns: matched.map((p) => p.source),
      },
    }
  },
}
