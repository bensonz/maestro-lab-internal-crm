import type { ParsedEmail, EmailDetection } from '../types'
import { vipDetector } from './vip-detector'
import { verificationDetector } from './verification-detector'
import { fundDetector } from './fund-detector'
import { bonusDetector } from './bonus-detector'
import { paypalDetector } from './paypal-detector'

/**
 * All registered email detectors, in priority order.
 * First match with highest confidence wins.
 */
const detectors = [
  fundDetector,
  paypalDetector,
  verificationDetector,
  vipDetector,
  bonusDetector,
]

/**
 * Run an email through all detectors and return the best match.
 */
export function detectEmail(email: ParsedEmail): EmailDetection {
  let best: EmailDetection | null = null

  for (const detector of detectors) {
    const result = detector.detect(email)
    if (result && (!best || result.confidence > best.confidence)) {
      best = result
    }
  }

  return best ?? { type: 'UNKNOWN', confidence: 0, data: {} }
}

export { vipDetector, verificationDetector, fundDetector, bonusDetector, paypalDetector }
