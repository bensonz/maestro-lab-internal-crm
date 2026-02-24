import { describe, it, expect } from 'vitest'
import { calculateRiskScore } from '@/lib/risk-score'

describe('calculateRiskScore', () => {
  it('returns low risk with no flags', () => {
    const result = calculateRiskScore({})
    expect(result.level).toBe('low')
    expect(result.score).toBe(0)
    expect(result.flags.idExpiryRisk).toBe('none')
  })

  it('returns low risk with paypalPreviouslyUsed only (10 points)', () => {
    const result = calculateRiskScore({ paypalPreviouslyUsed: true })
    expect(result.level).toBe('low')
    expect(result.score).toBe(10)
  })

  it('does not add points for addressMismatch (informational only)', () => {
    const result = calculateRiskScore({ addressMismatch: true })
    expect(result.score).toBe(0)
    expect(result.level).toBe('low')
    expect(result.flags.addressMismatch).toBe(true)
  })

  it('returns medium risk with debankedHistory (30 points)', () => {
    const result = calculateRiskScore({ debankedHistory: true })
    expect(result.level).toBe('medium')
    expect(result.score).toBe(30)
  })

  it('returns medium risk with criminalRecord (30 points)', () => {
    const result = calculateRiskScore({ criminalRecord: true })
    expect(result.level).toBe('medium')
    expect(result.score).toBe(30)
  })

  it('returns high risk with criminalRecord + undisclosedInfo (50 points)', () => {
    const result = calculateRiskScore({
      criminalRecord: true,
      undisclosedInfo: true,
    })
    expect(result.score).toBe(50)
    expect(result.level).toBe('high')
  })

  it('returns high risk with debankedHistory + criminalRecord (60 points)', () => {
    const result = calculateRiskScore({
      debankedHistory: true,
      criminalRecord: true,
    })
    expect(result.score).toBe(60)
    expect(result.level).toBe('high')
  })

  // ── 2-tier ID expiry tests ───────────────────────────────

  it('idExpiryRisk is none when null', () => {
    const result = calculateRiskScore({ idExpiryDaysRemaining: null })
    expect(result.flags.idExpiryRisk).toBe('none')
    expect(result.score).toBe(0)
  })

  it('idExpiryRisk is none when >= 100 days', () => {
    const result = calculateRiskScore({ idExpiryDaysRemaining: 100 })
    expect(result.flags.idExpiryRisk).toBe('none')
    expect(result.score).toBe(0)
  })

  it('idExpiryRisk is none when 200 days', () => {
    const result = calculateRiskScore({ idExpiryDaysRemaining: 200 })
    expect(result.flags.idExpiryRisk).toBe('none')
    expect(result.score).toBe(0)
  })

  it('idExpiryRisk is moderate at 99 days (10 points)', () => {
    const result = calculateRiskScore({ idExpiryDaysRemaining: 99 })
    expect(result.flags.idExpiryRisk).toBe('moderate')
    expect(result.score).toBe(10)
  })

  it('idExpiryRisk is moderate at 75 days (10 points)', () => {
    const result = calculateRiskScore({ idExpiryDaysRemaining: 75 })
    expect(result.flags.idExpiryRisk).toBe('moderate')
    expect(result.score).toBe(10)
  })

  it('idExpiryRisk is high at 74 days (20 points)', () => {
    const result = calculateRiskScore({ idExpiryDaysRemaining: 74 })
    expect(result.flags.idExpiryRisk).toBe('high')
    expect(result.score).toBe(20)
  })

  it('idExpiryRisk is high at 0 days (20 points)', () => {
    const result = calculateRiskScore({ idExpiryDaysRemaining: 0 })
    expect(result.flags.idExpiryRisk).toBe('high')
    expect(result.score).toBe(20)
  })

  it('idExpiryRisk is high with negative days (20 points)', () => {
    const result = calculateRiskScore({ idExpiryDaysRemaining: -10 })
    expect(result.flags.idExpiryRisk).toBe('high')
    expect(result.score).toBe(20)
  })

  it('moderate idExpiry + paypal stays low (20 points)', () => {
    const result = calculateRiskScore({
      idExpiryDaysRemaining: 80,
      paypalPreviouslyUsed: true,
    })
    expect(result.score).toBe(20)
    expect(result.level).toBe('low')
    expect(result.flags.idExpiryRisk).toBe('moderate')
  })

  it('high idExpiry + paypal stays low (30 points → medium)', () => {
    const result = calculateRiskScore({
      idExpiryDaysRemaining: 50,
      paypalPreviouslyUsed: true,
    })
    expect(result.score).toBe(30)
    expect(result.level).toBe('medium')
  })

  it('returns high risk with all flags active (110 points max)', () => {
    const result = calculateRiskScore({
      idExpiryDaysRemaining: 10,
      paypalPreviouslyUsed: true,
      addressMismatch: true,
      debankedHistory: true,
      criminalRecord: true,
      undisclosedInfo: true,
    })
    // 20 + 10 + 0 + 30 + 30 + 20 = 110
    expect(result.score).toBe(110)
    expect(result.level).toBe('high')
    expect(result.flags.idExpiryRisk).toBe('high')
  })

  // ── Boundary tests ───────────────────────────────────────

  it('boundary: 29 points is still low', () => {
    // high idExpiry(20) + no other scored flags that sum to 9
    // idExpiry 74 days (20) is the closest we can get
    const result = calculateRiskScore({ idExpiryDaysRemaining: 74 })
    expect(result.score).toBe(20)
    expect(result.level).toBe('low')
  })

  it('boundary: 30 points is medium', () => {
    const result = calculateRiskScore({ debankedHistory: true })
    expect(result.score).toBe(30)
    expect(result.level).toBe('medium')
  })

  it('boundary: 49 points is medium', () => {
    // debanked(30) + paypal(10) = 40
    const result = calculateRiskScore({
      debankedHistory: true,
      paypalPreviouslyUsed: true,
    })
    expect(result.score).toBe(40)
    expect(result.level).toBe('medium')
  })

  it('boundary: 50 points is high', () => {
    // criminal(30) + undisclosed(20) = 50
    const result = calculateRiskScore({
      criminalRecord: true,
      undisclosedInfo: true,
    })
    expect(result.score).toBe(50)
    expect(result.level).toBe('high')
  })

  it('flags object reflects exact input state', () => {
    const result = calculateRiskScore({
      idExpiryDaysRemaining: 50,
      criminalRecord: false,
      addressMismatch: true,
    })
    expect(result.flags.idExpiryRisk).toBe('high')
    expect(result.flags.criminalRecord).toBe(false)
    expect(result.flags.addressMismatch).toBe(true)
    expect(result.flags.paypalPreviouslyUsed).toBe(false)
    expect(result.flags.debankedHistory).toBe(false)
    expect(result.flags.undisclosedInfo).toBe(false)
  })
})
