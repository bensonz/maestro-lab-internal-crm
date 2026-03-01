import type { EmailDetector, ParsedEmail, EmailDetection } from '../types'

const DEPOSIT_PATTERNS = [
  /\bdeposit\s+(?:confirmed?|successful|completed|processed)\b/i,
  /\bfunds?\s+(?:received|added|credited)\b/i,
  /\byour\s+deposit\s+of\b/i,
  /\b(?:successfully|has been)\s+deposited\b/i,
]

const WITHDRAWAL_PATTERNS = [
  /\bwithdrawal\s+(?:confirmed?|successful|completed|processed)\b/i,
  /\bfunds?\s+(?:sent|withdrawn|debited)\b/i,
  /\byour\s+withdrawal\s+of\b/i,
  /\b(?:successfully|has been)\s+withdrawn\b/i,
  /\bpayout\s+(?:confirmed?|processed|completed)\b/i,
]

const AMOUNT_PATTERN = /\$\s*([\d,]+\.?\d*)/

function extractAmount(text: string): number | null {
  const match = text.match(AMOUNT_PATTERN)
  if (!match) return null
  const cleaned = match[1].replace(/,/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

const FUND_PLATFORM_SENDERS = [
  'draftkings',
  'fanduel',
  'betmgm',
  'caesars',
  'pointsbet',
  'espnbet',
  'fanatics',
  'bet365',
  'chase',
  'bankofamerica',
  'wellsfargo',
  'capitalone',
  'edgeboost',
]

export const fundDetector: EmailDetector = {
  name: 'Fund Movement Detector',

  detect(email: ParsedEmail): EmailDetection | null {
    const fromLower = email.from.toLowerCase()
    const isPlatform = FUND_PLATFORM_SENDERS.some((s) => fromLower.includes(s))
    if (!isPlatform) return null

    const combined = `${email.subject} ${email.snippet} ${email.body}`

    const depositMatches = DEPOSIT_PATTERNS.filter((p) => p.test(combined))
    const withdrawalMatches = WITHDRAWAL_PATTERNS.filter((p) => p.test(combined))

    if (depositMatches.length === 0 && withdrawalMatches.length === 0) return null

    const isDeposit = depositMatches.length >= withdrawalMatches.length
    const amount = extractAmount(combined)
    const platform = FUND_PLATFORM_SENDERS.find((s) => fromLower.includes(s)) ?? 'unknown'

    return {
      type: isDeposit ? 'FUND_DEPOSIT' : 'FUND_WITHDRAWAL',
      confidence: Math.min(0.6 + (isDeposit ? depositMatches : withdrawalMatches).length * 0.1, 1),
      data: {
        platform,
        amount,
        direction: isDeposit ? 'DEPOSIT' : 'WITHDRAWAL',
      },
    }
  },
}
