import { describe, it, expect } from 'vitest'
import {
  vipDetector,
  verificationDetector,
  fundDetector,
  bonusDetector,
  paypalDetector,
} from '@/lib/gmail/detectors'
import { detectEmail } from '@/lib/gmail/detectors'
import type { ParsedEmail } from '@/lib/gmail/types'

function makeEmail(overrides: Partial<ParsedEmail> = {}): ParsedEmail {
  return {
    messageId: 'msg-1',
    threadId: 'thread-1',
    from: 'noreply@example.com',
    to: 'business@gmail.com',
    subject: 'Test email',
    snippet: '',
    body: '',
    receivedAt: new Date(),
    ...overrides,
  }
}

// ── VIP Detector ──────────────────────────────────

describe('vipDetector', () => {
  it('detects VIP email from DraftKings', () => {
    const email = makeEmail({
      from: 'noreply@draftkings.com',
      subject: 'Congratulations! VIP Status Unlocked',
    })
    const result = vipDetector.detect(email)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('VIP_REPLY')
    expect(result!.data.platform).toBe('draftkings')
  })

  it('detects elevated status from FanDuel', () => {
    const email = makeEmail({
      from: 'support@fanduel.com',
      subject: 'Your elevated status benefits',
    })
    const result = vipDetector.detect(email)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('VIP_REPLY')
  })

  it('ignores VIP from non-sportsbook sender', () => {
    const email = makeEmail({
      from: 'noreply@randomcompany.com',
      subject: 'You are a VIP customer',
    })
    const result = vipDetector.detect(email)
    expect(result).toBeNull()
  })

  it('ignores non-VIP email from sportsbook', () => {
    const email = makeEmail({
      from: 'noreply@betmgm.com',
      subject: 'Your weekly summary',
    })
    const result = vipDetector.detect(email)
    expect(result).toBeNull()
  })
})

// ── Verification Detector ─────────────────────────

describe('verificationDetector', () => {
  it('detects verification request from BetMGM', () => {
    const email = makeEmail({
      from: 'noreply@betmgm.com',
      subject: 'Action needed: Verify your account',
    })
    const result = verificationDetector.detect(email)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('ACCOUNT_VERIFICATION')
  })

  it('detects identity verification from PayPal', () => {
    const email = makeEmail({
      from: 'service@paypal.com',
      subject: 'Identity verification required',
    })
    const result = verificationDetector.detect(email)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('ACCOUNT_VERIFICATION')
  })

  it('detects document upload request', () => {
    const email = makeEmail({
      from: 'support@caesars.com',
      subject: 'Document upload required for your account',
    })
    const result = verificationDetector.detect(email)
    expect(result).not.toBeNull()
  })

  it('ignores non-verification emails', () => {
    const email = makeEmail({
      from: 'noreply@draftkings.com',
      subject: 'New contest available!',
    })
    const result = verificationDetector.detect(email)
    expect(result).toBeNull()
  })
})

// ── Fund Detector ─────────────────────────────────

describe('fundDetector', () => {
  it('detects deposit confirmation with amount', () => {
    const email = makeEmail({
      from: 'noreply@fanduel.com',
      subject: 'Deposit confirmed',
      body: 'Your deposit of $150.00 has been successfully processed.',
    })
    const result = fundDetector.detect(email)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('FUND_DEPOSIT')
    expect(result!.data.amount).toBe(150)
    expect(result!.data.direction).toBe('DEPOSIT')
  })

  it('detects withdrawal confirmation', () => {
    const email = makeEmail({
      from: 'noreply@draftkings.com',
      subject: 'Withdrawal processed',
      body: 'Your withdrawal of $200.00 has been completed.',
    })
    const result = fundDetector.detect(email)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('FUND_WITHDRAWAL')
    expect(result!.data.amount).toBe(200)
  })

  it('extracts amounts with commas', () => {
    const email = makeEmail({
      from: 'noreply@betmgm.com',
      subject: 'Deposit successful',
      body: 'We have received your deposit of $1,250.00.',
    })
    const result = fundDetector.detect(email)
    expect(result).not.toBeNull()
    expect(result!.data.amount).toBe(1250)
  })

  it('ignores non-fund emails from platforms', () => {
    const email = makeEmail({
      from: 'noreply@fanduel.com',
      subject: 'Weekly picks are in!',
    })
    const result = fundDetector.detect(email)
    expect(result).toBeNull()
  })
})

// ── Bonus Detector ────────────────────────────────

describe('bonusDetector', () => {
  it('detects deposit match bonus', () => {
    const email = makeEmail({
      from: 'promo@draftkings.com',
      subject: 'Deposit match bonus activated!',
      body: 'Your $100 deposit match bonus is now available.',
    })
    const result = bonusDetector.detect(email)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('DEPOSIT_MATCH_BONUS')
    expect(result!.data.amount).toBe(100)
  })

  it('detects free bet offer', () => {
    const email = makeEmail({
      from: 'offers@fanduel.com',
      subject: 'Free bet credited to your account',
    })
    const result = bonusDetector.detect(email)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('DEPOSIT_MATCH_BONUS')
  })

  it('ignores non-bonus from sportsbook', () => {
    const email = makeEmail({
      from: 'noreply@betmgm.com',
      subject: 'Your account settings have been updated',
    })
    const result = bonusDetector.detect(email)
    expect(result).toBeNull()
  })
})

// ── PayPal Detector ───────────────────────────────

describe('paypalDetector', () => {
  it('detects payment received', () => {
    const email = makeEmail({
      from: 'service@paypal.com',
      subject: 'You received a payment',
      body: 'You received a payment of $75.00.',
    })
    const result = paypalDetector.detect(email)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('PAYPAL_TRANSFER')
    expect(result!.data.amount).toBe(75)
    expect(result!.data.direction).toBe('DEPOSIT')
  })

  it('detects payment sent', () => {
    const email = makeEmail({
      from: 'noreply@paypal.com',
      subject: 'You sent a payment',
      body: 'You sent a payment of $50.00.',
    })
    const result = paypalDetector.detect(email)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('PAYPAL_TRANSFER')
    expect(result!.data.direction).toBe('WITHDRAWAL')
  })

  it('detects transfer completed', () => {
    const email = makeEmail({
      from: 'noreply@paypal.com',
      subject: 'Transfer confirmed',
      body: 'Your money transfer of $120.00 has been completed.',
    })
    const result = paypalDetector.detect(email)
    expect(result).not.toBeNull()
  })

  it('ignores non-PayPal sender', () => {
    const email = makeEmail({
      from: 'noreply@venmo.com',
      subject: 'Payment received',
    })
    const result = paypalDetector.detect(email)
    expect(result).toBeNull()
  })
})

// ── detectEmail (registry) ────────────────────────

describe('detectEmail', () => {
  it('returns UNKNOWN for unrecognized emails', () => {
    const email = makeEmail({
      from: 'noreply@random.com',
      subject: 'Hello world',
    })
    const result = detectEmail(email)
    expect(result.type).toBe('UNKNOWN')
  })

  it('picks fund detection over VIP when both match', () => {
    const email = makeEmail({
      from: 'vip@draftkings.com',
      subject: 'VIP deposit confirmed',
      body: 'Your VIP deposit of $500.00 has been confirmed.',
    })
    const result = detectEmail(email)
    // Fund detector should have higher confidence
    expect(result.type).toBe('FUND_DEPOSIT')
  })
})
