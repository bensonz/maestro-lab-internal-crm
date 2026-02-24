import { describe, it, expect } from 'vitest'
import { calculateRiskScore } from '@/lib/risk-score'

describe('calculateRiskScore', () => {
  // ── Baseline (no flags, no missing IDs = +10 bonus) ────────

  it('returns low risk with no flags (+10 bonus for all IDs present)', () => {
    const result = calculateRiskScore({})
    expect(result.level).toBe('low')
    expect(result.score).toBe(10)
    expect(result.flags.idExpiryRisk).toBe('none')
    expect(result.flags.missingIdCount).toBe(0)
  })

  // ── Missing IDs scoring ────────────────────────────────────

  it('gives +10 bonus when missingIdCount is 0', () => {
    const result = calculateRiskScore({ missingIdCount: 0 })
    expect(result.score).toBe(10)
    expect(result.level).toBe('low')
  })

  it('gives -10 when 1 missing ID', () => {
    const result = calculateRiskScore({ missingIdCount: 1 })
    expect(result.score).toBe(-10)
    expect(result.level).toBe('medium')
  })

  it('gives -20 when 2 missing IDs', () => {
    const result = calculateRiskScore({ missingIdCount: 2 })
    expect(result.score).toBe(-20)
    expect(result.level).toBe('medium')
  })

  it('gives -30 when 3 missing IDs (high risk)', () => {
    const result = calculateRiskScore({ missingIdCount: 3 })
    expect(result.score).toBe(-30)
    expect(result.level).toBe('high')
  })

  // ── Individual flag weights (negative) ─────────────────────

  it('paypalPreviouslyUsed subtracts 10 (net 0 with ID bonus)', () => {
    const result = calculateRiskScore({ paypalPreviouslyUsed: true })
    expect(result.score).toBe(0)
    expect(result.level).toBe('low')
  })

  it('does not subtract points for multipleAddresses (informational only)', () => {
    const result = calculateRiskScore({ multipleAddresses: true })
    expect(result.score).toBe(10)
    expect(result.level).toBe('low')
    expect(result.flags.multipleAddresses).toBe(true)
  })

  it('debankedHistory subtracts 30 (net -20)', () => {
    const result = calculateRiskScore({ debankedHistory: true })
    expect(result.score).toBe(-20)
    expect(result.level).toBe('medium')
  })

  it('criminalRecord subtracts 30 (net -20)', () => {
    const result = calculateRiskScore({ criminalRecord: true })
    expect(result.score).toBe(-20)
    expect(result.level).toBe('medium')
  })

  it('debankedHistory + criminalRecord = -50 (high)', () => {
    const result = calculateRiskScore({
      debankedHistory: true,
      criminalRecord: true,
    })
    expect(result.score).toBe(-50)
    expect(result.level).toBe('high')
  })

  // ── 2-tier ID expiry tests ─────────────────────────────────

  it('idExpiryRisk is none when null', () => {
    const result = calculateRiskScore({ idExpiryDaysRemaining: null })
    expect(result.flags.idExpiryRisk).toBe('none')
    expect(result.score).toBe(10)
  })

  it('idExpiryRisk is none when >= 100 days', () => {
    const result = calculateRiskScore({ idExpiryDaysRemaining: 100 })
    expect(result.flags.idExpiryRisk).toBe('none')
    expect(result.score).toBe(10)
  })

  it('idExpiryRisk is moderate at 99 days (-10, net 0)', () => {
    const result = calculateRiskScore({ idExpiryDaysRemaining: 99 })
    expect(result.flags.idExpiryRisk).toBe('moderate')
    expect(result.score).toBe(0)
  })

  it('idExpiryRisk is moderate at 75 days (-10, net 0)', () => {
    const result = calculateRiskScore({ idExpiryDaysRemaining: 75 })
    expect(result.flags.idExpiryRisk).toBe('moderate')
    expect(result.score).toBe(0)
  })

  it('idExpiryRisk is high at 74 days (-20, net -10)', () => {
    const result = calculateRiskScore({ idExpiryDaysRemaining: 74 })
    expect(result.flags.idExpiryRisk).toBe('high')
    expect(result.score).toBe(-10)
  })

  it('idExpiryRisk is high at 0 days (-20, net -10)', () => {
    const result = calculateRiskScore({ idExpiryDaysRemaining: 0 })
    expect(result.flags.idExpiryRisk).toBe('high')
    expect(result.score).toBe(-10)
  })

  it('moderate idExpiry + paypal = net -10 (medium)', () => {
    const result = calculateRiskScore({
      idExpiryDaysRemaining: 80,
      paypalPreviouslyUsed: true,
    })
    expect(result.score).toBe(-10)
    expect(result.level).toBe('medium')
  })

  it('high idExpiry + paypal = net -20 (medium)', () => {
    const result = calculateRiskScore({
      idExpiryDaysRemaining: 50,
      paypalPreviouslyUsed: true,
    })
    expect(result.score).toBe(-20)
    expect(result.level).toBe('medium')
  })

  // ── Background assessment questions ────────────────────────

  it('householdAwareness: supportive = 0', () => {
    const result = calculateRiskScore({ householdAwareness: 'supportive' })
    expect(result.score).toBe(10)
  })

  it('householdAwareness: aware_neutral = -3', () => {
    const result = calculateRiskScore({ householdAwareness: 'aware_neutral' })
    expect(result.score).toBe(7)
  })

  it('householdAwareness: not_aware = -8', () => {
    const result = calculateRiskScore({ householdAwareness: 'not_aware' })
    expect(result.score).toBe(2)
    expect(result.level).toBe('low')
  })

  it('householdAwareness: not_applicable = 0', () => {
    const result = calculateRiskScore({ householdAwareness: 'not_applicable' })
    expect(result.score).toBe(10)
  })

  it('familyTechSupport: willing_to_help = 0', () => {
    const result = calculateRiskScore({ familyTechSupport: 'willing_to_help' })
    expect(result.score).toBe(10)
  })

  it('familyTechSupport: available_uninvolved = -5', () => {
    const result = calculateRiskScore({ familyTechSupport: 'available_uninvolved' })
    expect(result.score).toBe(5)
  })

  it('familyTechSupport: no = -10', () => {
    const result = calculateRiskScore({ familyTechSupport: 'no' })
    expect(result.score).toBe(0)
  })

  it('familyTechSupport: prefer_not_to_involve = -15', () => {
    const result = calculateRiskScore({ familyTechSupport: 'prefer_not_to_involve' })
    expect(result.score).toBe(-5)
    expect(result.level).toBe('medium')
  })

  it('financialAutonomy: fully_independent = 0', () => {
    const result = calculateRiskScore({ financialAutonomy: 'fully_independent' })
    expect(result.score).toBe(10)
  })

  it('financialAutonomy: shared_with_spouse = -5', () => {
    const result = calculateRiskScore({ financialAutonomy: 'shared_with_spouse' })
    expect(result.score).toBe(5)
  })

  it('financialAutonomy: dependent_on_others = -15', () => {
    const result = calculateRiskScore({ financialAutonomy: 'dependent_on_others' })
    expect(result.score).toBe(-5)
    expect(result.level).toBe('medium')
  })

  it('unknown assessment value = 0 (no impact)', () => {
    const result = calculateRiskScore({ householdAwareness: 'unknown_value' })
    expect(result.score).toBe(10)
  })

  it('empty assessment string = 0 (no impact)', () => {
    const result = calculateRiskScore({ familyTechSupport: '' })
    expect(result.score).toBe(10)
  })

  // ── Max worst score ────────────────────────────────────────

  it('returns high risk with all flags and worst answers (-158)', () => {
    const result = calculateRiskScore({
      idExpiryDaysRemaining: 10,
      paypalPreviouslyUsed: true,
      multipleAddresses: true,
      debankedHistory: true,
      criminalRecord: true,
      missingIdCount: 3,
      householdAwareness: 'not_aware',
      familyTechSupport: 'prefer_not_to_involve',
      financialAutonomy: 'dependent_on_others',
    })
    // -30 (3 missing) + -20 (id high) + -10 (paypal) + 0 (addresses)
    // + -30 (debanked) + -30 (criminal)
    // + -8 (household) + -15 (family) + -15 (autonomy) = -158
    expect(result.score).toBe(-158)
    expect(result.level).toBe('high')
  })

  // ── Boundary tests ─────────────────────────────────────────

  it('boundary: score 0 is low', () => {
    const result = calculateRiskScore({ paypalPreviouslyUsed: true })
    expect(result.score).toBe(0)
    expect(result.level).toBe('low')
  })

  it('boundary: score -10 is medium', () => {
    const result = calculateRiskScore({ missingIdCount: 1 })
    expect(result.score).toBe(-10)
    expect(result.level).toBe('medium')
  })

  it('boundary: score -30 is high', () => {
    const result = calculateRiskScore({ missingIdCount: 3 })
    expect(result.score).toBe(-30)
    expect(result.level).toBe('high')
  })

  it('flags object reflects exact input state', () => {
    const result = calculateRiskScore({
      idExpiryDaysRemaining: 50,
      criminalRecord: false,
      multipleAddresses: true,
      missingIdCount: 1,
      householdAwareness: 'not_aware',
      familyTechSupport: 'no',
      financialAutonomy: 'shared_with_spouse',
    })
    expect(result.flags.idExpiryRisk).toBe('high')
    expect(result.flags.criminalRecord).toBe(false)
    expect(result.flags.multipleAddresses).toBe(true)
    expect(result.flags.missingIdCount).toBe(1)
    expect(result.flags.householdAwareness).toBe('not_aware')
    expect(result.flags.familyTechSupport).toBe('no')
    expect(result.flags.financialAutonomy).toBe('shared_with_spouse')
    // -10 (1 missing) + -20 (id high) + -8 (household) + -10 (family) + -5 (autonomy) = -53
    expect(result.score).toBe(-53)
    expect(result.level).toBe('high')
  })
})
