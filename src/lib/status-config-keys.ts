// Keys used in SystemConfig for per-platform status definitions
// Each platform gets its own dictionary of dropdown statuses

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
