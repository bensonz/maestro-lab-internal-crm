import { PlatformType } from '@prisma/generated/browser'

/**
 * Platform metadata and utilities
 */

export const PLATFORM_INFO: Record<
  PlatformType,
  {
    name: string
    abbrev: string
    category: 'sports' | 'financial'
  }
> = {
  // Sports Betting (8)
  DRAFTKINGS: { name: 'DraftKings', abbrev: 'DK', category: 'sports' },
  FANDUEL: { name: 'FanDuel', abbrev: 'FD', category: 'sports' },
  BETMGM: { name: 'BetMGM', abbrev: 'MGM', category: 'sports' },
  CAESARS: { name: 'Caesars', abbrev: 'CZR', category: 'sports' },
  FANATICS: { name: 'Fanatics', abbrev: 'FAN', category: 'sports' },
  BALLYBET: { name: 'Bally Bet', abbrev: 'BB', category: 'sports' },
  BETRIVERS: { name: 'BetRivers', abbrev: 'BR', category: 'sports' },
  BET365: { name: 'Bet365', abbrev: '365', category: 'sports' },
  // Financial (3)
  BANK: { name: 'Bank', abbrev: 'BNK', category: 'financial' },
  PAYPAL: { name: 'PayPal', abbrev: 'PP', category: 'financial' },
  EDGEBOOST: { name: 'EdgeBoost', abbrev: 'EB', category: 'financial' },
}

/** All platform types in order */
export const ALL_PLATFORMS: PlatformType[] = [
  'DRAFTKINGS',
  'FANDUEL',
  'BETMGM',
  'CAESARS',
  'FANATICS',
  'BALLYBET',
  'BETRIVERS',
  'BET365',
  'BANK',
  'PAYPAL',
  'EDGEBOOST',
]

/** Sports platforms only */
export const SPORTS_PLATFORMS = ALL_PLATFORMS.filter(
  (p) => PLATFORM_INFO[p].category === 'sports',
)

/** Financial platforms only */
export const FINANCIAL_PLATFORMS = ALL_PLATFORMS.filter(
  (p) => PLATFORM_INFO[p].category === 'financial',
)

/** Get display name for a platform */
export function getPlatformName(platform: PlatformType): string {
  return PLATFORM_INFO[platform].name
}

/** Get abbreviation for a platform (for UI pills) */
export function getPlatformAbbrev(platform: PlatformType): string {
  return PLATFORM_INFO[platform].abbrev
}

/** Check if platform is a sports betting platform */
export function isSportsPlatform(platform: PlatformType): boolean {
  return PLATFORM_INFO[platform].category === 'sports'
}

/** Check if platform is a financial platform */
export function isFinancialPlatform(platform: PlatformType): boolean {
  return PLATFORM_INFO[platform].category === 'financial'
}

/** Reverse lookup: display name → PlatformType (e.g., "DraftKings" → "DRAFTKINGS") */
const NAME_TO_PLATFORM = new Map<string, PlatformType>(
  Object.entries(PLATFORM_INFO).map(([key, info]) => [
    info.name,
    key as PlatformType,
  ]),
)

/** Look up PlatformType from a display name string (used by FundMovement data) */
export function getPlatformTypeFromName(
  name: string,
): PlatformType | undefined {
  return NAME_TO_PLATFORM.get(name)
}

/** Total platform count */
export const PLATFORM_COUNT = ALL_PLATFORMS.length // 11
