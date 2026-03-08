import type { EmailDetector, ParsedEmail, EmailDetection } from '../types'

const BONUS_PATTERNS = [
  /\bdeposit\s+match\b/i,
  /\bbonus\s+(?:available|credited|activated|earned)\b/i,
  /\bmatch(?:ing)?\s+bonus\b/i,
  /\bfree\s+(?:bet|play|credit)\b/i,
  /\bpromotion(?:al)?\s+(?:credit|offer|bonus)\b/i,
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

const AMOUNT_PATTERN = /\$\s*([\d,]+\.?\d*)/

export const bonusDetector: EmailDetector = {
  name: 'Bonus Detector',

  detect(email: ParsedEmail): EmailDetection | null {
    const fromLower = email.from.toLowerCase()
    const isSportsbook = SPORTSBOOK_SENDERS.some((s) => fromLower.includes(s))
    if (!isSportsbook) return null

    const combined = `${email.subject} ${email.snippet} ${email.body}`
    const matched = BONUS_PATTERNS.filter((p) => p.test(combined))
    if (matched.length === 0) return null

    const amountMatch = combined.match(AMOUNT_PATTERN)
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null

    return {
      type: 'DEPOSIT_MATCH_BONUS',
      confidence: Math.min(0.5 + matched.length * 0.15, 1),
      data: {
        platform: SPORTSBOOK_SENDERS.find((s) => fromLower.includes(s)) ?? 'unknown',
        amount,
        matchedPatterns: matched.map((p) => p.source),
      },
    }
  },
}
