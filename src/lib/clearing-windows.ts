import { getConfig } from '@/backend/data/config'
import { PLATFORM_INFO } from '@/lib/platforms'
import type { PlatformType } from '@/types'

/**
 * Default clearing window hours per platform + direction.
 * Deposits are always instant (0). Only withdrawals have clearing times.
 */
const CLEARING_DEFAULTS: Record<string, Record<string, number>> = {
  // Sportsbooks: deposits instant, withdrawals 4-24h
  DRAFTKINGS: { DEPOSIT: 0, WITHDRAWAL: 24 },
  FANDUEL: { DEPOSIT: 0, WITHDRAWAL: 24 },
  BETMGM: { DEPOSIT: 0, WITHDRAWAL: 24 },
  CAESARS: { DEPOSIT: 0, WITHDRAWAL: 24 },
  FANATICS: { DEPOSIT: 0, WITHDRAWAL: 24 },
  BALLYBET: { DEPOSIT: 0, WITHDRAWAL: 24 },
  BETRIVERS: { DEPOSIT: 0, WITHDRAWAL: 24 },
  BET365: { DEPOSIT: 0, WITHDRAWAL: 24 },
  // Financial
  BANK: { DEPOSIT: 0, WITHDRAWAL: 24 }, // Wire/ACH same-day to 1 day
  PAYPAL: { DEPOSIT: 0, WITHDRAWAL: 72 }, // PayPal → Bank: 1-3 days
  EDGEBOOST: { DEPOSIT: 0, WITHDRAWAL: 72 }, // EdgeBoost → Bank: 1-3 days
}

const DEFAULT_CLEARING_HOURS = 24

/**
 * Normalize platform string to PlatformType key.
 * Handles display names ("DraftKings") and enum keys ("DRAFTKINGS").
 */
function normalizePlatform(platform: string): string {
  // Try direct match (already a key)
  const upper = platform.toUpperCase().replace(/\s+/g, '')
  if (CLEARING_DEFAULTS[upper]) return upper

  // Try reverse lookup from display name
  const info = Object.entries(PLATFORM_INFO).find(
    ([, v]) => v.name.toLowerCase() === platform.toLowerCase(),
  )
  if (info) return info[0]

  // Fallback: strip spaces and uppercase
  return upper
}

/**
 * Get clearing hours for a platform + direction combo.
 * Returns 0 for deposits (instant).
 * Checks SystemConfig overrides, falls back to static defaults.
 */
export async function getClearingHours(
  platform: string,
  direction: string,
): Promise<number> {
  const normalized = normalizePlatform(platform)
  const dir = direction.toUpperCase()

  // Deposits are always instant
  if (dir === 'DEPOSIT') return 0

  // Withdrawals: check category-level SystemConfig overrides
  const info = PLATFORM_INFO[normalized as PlatformType]
  const isSportsbook = info?.category === 'sports'

  if (normalized === 'BANK') {
    return getConfig('CLEARING_BANK_WIRE_HOURS', CLEARING_DEFAULTS.BANK.WITHDRAWAL)
  }
  if (normalized === 'PAYPAL') {
    return getConfig('CLEARING_PAYPAL_WITHDRAWAL_HOURS', CLEARING_DEFAULTS.PAYPAL.WITHDRAWAL)
  }
  if (isSportsbook) {
    return getConfig(
      'CLEARING_SPORTSBOOK_WITHDRAWAL_HOURS',
      CLEARING_DEFAULTS[normalized]?.WITHDRAWAL ?? DEFAULT_CLEARING_HOURS,
    )
  }

  // EdgeBoost or other financial
  return CLEARING_DEFAULTS[normalized]?.WITHDRAWAL ?? DEFAULT_CLEARING_HOURS
}

/**
 * Compute expected arrival time from creation time + clearing hours.
 * Returns null if instant (0 hours).
 */
export function computeExpectedArrival(
  createdAt: Date,
  clearingHours: number,
): Date | null {
  if (clearingHours <= 0) return null
  return new Date(createdAt.getTime() + clearingHours * 60 * 60 * 1000)
}

/**
 * Check if a date falls on a business day (Mon-Fri).
 */
export function isBusinessDay(date: Date): boolean {
  const day = date.getDay()
  return day !== 0 && day !== 6
}

/**
 * Count business days elapsed between two dates.
 * Excludes weekends.
 */
export function getBusinessDaysElapsed(from: Date, to: Date): number {
  let count = 0
  const current = new Date(from)
  current.setHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setHours(0, 0, 0, 0)

  while (current < end) {
    current.setDate(current.getDate() + 1)
    if (isBusinessDay(current)) {
      count++
    }
  }
  return count
}
