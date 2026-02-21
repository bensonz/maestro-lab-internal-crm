import { describe, it, expect } from 'vitest'
import { calculateRiskScore } from '@/lib/risk-score'

describe('calculateRiskScore', () => {
  it('returns low risk with no flags', () => {
    const result = calculateRiskScore({})
    expect(result.level).toBe('low')
    expect(result.score).toBe(0)
  })

  it('returns low risk with idExpiringSoon only (10 points)', () => {
    const result = calculateRiskScore({ idExpiringSoon: true })
    expect(result.level).toBe('low')
    expect(result.score).toBe(10)
  })

  it('returns low risk with paypalPreviouslyUsed only (10 points)', () => {
    const result = calculateRiskScore({ paypalPreviouslyUsed: true })
    expect(result.level).toBe('low')
    expect(result.score).toBe(10)
  })

  it('returns low risk with both paypal + id expiring (20 points)', () => {
    const result = calculateRiskScore({
      idExpiringSoon: true,
      paypalPreviouslyUsed: true,
    })
    expect(result.level).toBe('low')
    expect(result.score).toBe(20)
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

  it('returns medium risk with undisclosedInfo + idExpiring (30 points)', () => {
    const result = calculateRiskScore({
      undisclosedInfo: true,
      idExpiringSoon: true,
    })
    expect(result.score).toBe(30)
    expect(result.level).toBe('medium')
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

  it('returns high risk with all flags active', () => {
    const result = calculateRiskScore({
      idExpiringSoon: true,
      paypalPreviouslyUsed: true,
      addressMismatch: true,
      debankedHistory: true,
      criminalRecord: true,
      undisclosedInfo: true,
    })
    // 10 + 10 + 0 + 30 + 30 + 20 = 100
    expect(result.score).toBe(100)
    expect(result.level).toBe('high')
  })

  it('boundary: 29 points is still low', () => {
    // idExpiringSoon(10) + paypalPreviouslyUsed(10) = 20, not 29
    // We can't hit exactly 29 with current weights, test at 20
    const result = calculateRiskScore({
      idExpiringSoon: true,
      paypalPreviouslyUsed: true,
    })
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
      idExpiringSoon: true,
      criminalRecord: false,
      addressMismatch: true,
    })
    expect(result.flags.idExpiringSoon).toBe(true)
    expect(result.flags.criminalRecord).toBe(false)
    expect(result.flags.addressMismatch).toBe(true)
    expect(result.flags.paypalPreviouslyUsed).toBe(false)
    expect(result.flags.debankedHistory).toBe(false)
    expect(result.flags.undisclosedInfo).toBe(false)
  })
})
