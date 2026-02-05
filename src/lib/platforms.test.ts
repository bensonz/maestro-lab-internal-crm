import { describe, it, expect } from 'vitest'
import {
  ALL_PLATFORMS,
  SPORTS_PLATFORMS,
  FINANCIAL_PLATFORMS,
  PLATFORM_INFO,
  PLATFORM_COUNT,
  getPlatformName,
  getPlatformAbbrev,
  isSportsPlatform,
  isFinancialPlatform,
} from './platforms'

describe('Platform Configuration', () => {
  it('should have exactly 11 platforms', () => {
    expect(ALL_PLATFORMS).toHaveLength(11)
    expect(PLATFORM_COUNT).toBe(11)
  })

  it('should have 8 sports platforms', () => {
    expect(SPORTS_PLATFORMS).toHaveLength(8)
    expect(SPORTS_PLATFORMS).toContain('DRAFTKINGS')
    expect(SPORTS_PLATFORMS).toContain('FANDUEL')
    expect(SPORTS_PLATFORMS).toContain('BETMGM')
    expect(SPORTS_PLATFORMS).toContain('CAESARS')
    expect(SPORTS_PLATFORMS).toContain('FANATICS')
    expect(SPORTS_PLATFORMS).toContain('BALLYBET')
    expect(SPORTS_PLATFORMS).toContain('BETRIVERS')
    expect(SPORTS_PLATFORMS).toContain('BET365')
  })

  it('should have 3 financial platforms', () => {
    expect(FINANCIAL_PLATFORMS).toHaveLength(3)
    expect(FINANCIAL_PLATFORMS).toContain('BANK')
    expect(FINANCIAL_PLATFORMS).toContain('PAYPAL')
    expect(FINANCIAL_PLATFORMS).toContain('EDGEBOOST')
  })

  it('should have info for all platforms', () => {
    for (const platform of ALL_PLATFORMS) {
      expect(PLATFORM_INFO[platform]).toBeDefined()
      expect(PLATFORM_INFO[platform].name).toBeTruthy()
      expect(PLATFORM_INFO[platform].abbrev).toBeTruthy()
      expect(['sports', 'financial']).toContain(PLATFORM_INFO[platform].category)
    }
  })

  it('getPlatformName returns correct names', () => {
    expect(getPlatformName('DRAFTKINGS')).toBe('DraftKings')
    expect(getPlatformName('PAYPAL')).toBe('PayPal')
    expect(getPlatformName('EDGEBOOST')).toBe('EdgeBoost')
  })

  it('getPlatformAbbrev returns correct abbreviations', () => {
    expect(getPlatformAbbrev('DRAFTKINGS')).toBe('DK')
    expect(getPlatformAbbrev('CAESARS')).toBe('CZR')
    expect(getPlatformAbbrev('BANK')).toBe('BNK')
    expect(getPlatformAbbrev('PAYPAL')).toBe('PP')
  })

  it('isSportsPlatform correctly identifies sports platforms', () => {
    expect(isSportsPlatform('DRAFTKINGS')).toBe(true)
    expect(isSportsPlatform('FANDUEL')).toBe(true)
    expect(isSportsPlatform('BANK')).toBe(false)
    expect(isSportsPlatform('PAYPAL')).toBe(false)
  })

  it('isFinancialPlatform correctly identifies financial platforms', () => {
    expect(isFinancialPlatform('BANK')).toBe(true)
    expect(isFinancialPlatform('PAYPAL')).toBe(true)
    expect(isFinancialPlatform('EDGEBOOST')).toBe(true)
    expect(isFinancialPlatform('DRAFTKINGS')).toBe(false)
  })
})
