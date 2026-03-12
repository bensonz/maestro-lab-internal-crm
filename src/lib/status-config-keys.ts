// Keys used in SystemConfig for per-platform status definitions
// Each platform gets its own dictionary of dropdown statuses
// AND its own detail config (limited subtypes, active details)

/** All 12 platforms that have status dictionaries */
export const STATUS_CONFIG_KEYS = {
  // Sportsbook (9)
  DRAFTKINGS: 'STATUSES_DRAFTKINGS',
  FANDUEL: 'STATUSES_FANDUEL',
  BETMGM: 'STATUSES_BETMGM',
  CAESARS: 'STATUSES_CAESARS',
  FANATICS: 'STATUSES_FANATICS',
  BALLYBET: 'STATUSES_BALLYBET',
  BETRIVERS: 'STATUSES_BETRIVERS',
  ESPNBET: 'STATUSES_ESPNBET',
  BET365: 'STATUSES_BET365',
  // Financial (3)
  BANK: 'STATUSES_BANK',
  EDGEBOOST: 'STATUSES_EDGEBOOST',
  PAYPAL: 'STATUSES_PAYPAL',
} as const

export type StatusConfigType = keyof typeof STATUS_CONFIG_KEYS

/** All DB keys for status configs */
export const ALL_STATUS_DB_KEYS = Object.values(STATUS_CONFIG_KEYS)

/** DB keys for per-platform detail configs (limited subtypes, active details) */
export const DETAIL_CONFIG_KEYS = {
  // Sportsbook (9)
  DRAFTKINGS: 'DETAILS_DRAFTKINGS',
  FANDUEL: 'DETAILS_FANDUEL',
  BETMGM: 'DETAILS_BETMGM',
  CAESARS: 'DETAILS_CAESARS',
  FANATICS: 'DETAILS_FANATICS',
  BALLYBET: 'DETAILS_BALLYBET',
  BETRIVERS: 'DETAILS_BETRIVERS',
  ESPNBET: 'DETAILS_ESPNBET',
  BET365: 'DETAILS_BET365',
  // Financial (3)
  BANK: 'DETAILS_BANK',
  EDGEBOOST: 'DETAILS_EDGEBOOST',
  PAYPAL: 'DETAILS_PAYPAL',
} as const

export const ALL_DETAIL_DB_KEYS = Object.values(DETAIL_CONFIG_KEYS)

/**
 * Per-platform detail config stored in DB as JSON.
 * Controls what sub-options appear when a status like "Limited" or "Active" is selected.
 */
export interface PlatformDetailConfig {
  // Limited status details (sportsbook only)
  limitedType: 'percentage' | 'amount' | 'mgm-tier' | 'caesars-sports' | 'none'
  limitedOptions?: string[]  // percentage values, tier names, fraction options
  limitedSports?: string[]   // caesars: sports list (NBA, NFL, etc.)
  // Active status details (financial only)
  activeDetailOptions?: string[]  // Bank names, EB tiers
  activeDetailLabel?: string      // "Bank", "Tier"
}
