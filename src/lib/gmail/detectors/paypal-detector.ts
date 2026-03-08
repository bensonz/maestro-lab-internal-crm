import type { EmailDetector, ParsedEmail, EmailDetection } from '../types'

const PAYPAL_PATTERNS = [
  /\btransfer\s+(?:confirmed?|completed?|sent|received)\b/i,
  /\bpayment\s+(?:received|sent|completed)\b/i,
  /\bmoney\s+(?:received|sent|transferred)\b/i,
  /\byou(?:'ve)?\s+(?:sent|received)\s+(?:a\s+)?payment\b/i,
]

const AMOUNT_PATTERN = /\$\s*([\d,]+\.?\d*)/

export const paypalDetector: EmailDetector = {
  name: 'PayPal Detector',

  detect(email: ParsedEmail): EmailDetection | null {
    const fromLower = email.from.toLowerCase()
    if (!fromLower.includes('paypal')) return null

    const combined = `${email.subject} ${email.snippet} ${email.body}`
    const matched = PAYPAL_PATTERNS.filter((p) => p.test(combined))
    if (matched.length === 0) return null

    const amountMatch = combined.match(AMOUNT_PATTERN)
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null

    // Determine direction from context
    const sentPatterns = /\byou\s+sent\b|\bpayment\s+sent\b|\btransfer\s+sent\b/i
    const receivedPatterns = /\byou\s+received\b|\bpayment\s+received\b|\bmoney\s+received\b/i
    const isSent = sentPatterns.test(combined)
    const isReceived = receivedPatterns.test(combined)

    return {
      type: 'PAYPAL_TRANSFER',
      confidence: Math.min(0.6 + matched.length * 0.1, 1),
      data: {
        platform: 'PayPal',
        amount,
        direction: isSent ? 'WITHDRAWAL' : isReceived ? 'DEPOSIT' : 'UNKNOWN',
      },
    }
  },
}
