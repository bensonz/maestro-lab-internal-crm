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
    logoPath: string | null
  }
> = {
  // Sports Betting (8)
  DRAFTKINGS: { name: 'DraftKings', abbrev: 'DK', category: 'sports', logoPath: '/platforms/draftkings-logo.svg' },
  FANDUEL: { name: 'FanDuel', abbrev: 'FD', category: 'sports', logoPath: '/platforms/fanduel-logo.svg' },
  BETMGM: { name: 'BetMGM', abbrev: 'MGM', category: 'sports', logoPath: '/platforms/betmgm-logo.svg' },
  CAESARS: { name: 'Caesars', abbrev: 'CZR', category: 'sports', logoPath: '/platforms/caesars-logo.svg' },
  FANATICS: { name: 'Fanatics', abbrev: 'FAN', category: 'sports', logoPath: '/platforms/fanatics-logo.svg' },
  BALLYBET: { name: 'Bally Bet', abbrev: 'BB', category: 'sports', logoPath: '/platforms/ballybet-logo.svg' },
  BETRIVERS: { name: 'BetRivers', abbrev: 'BR', category: 'sports', logoPath: '/platforms/betrivers-logo.svg' },
  BET365: { name: 'Bet365', abbrev: '365', category: 'sports', logoPath: null },
  // Financial (3)
  BANK: { name: 'Bank', abbrev: 'BNK', category: 'financial', logoPath: null },
  PAYPAL: { name: 'PayPal', abbrev: 'PP', category: 'financial', logoPath: null },
  EDGEBOOST: { name: 'EdgeBoost', abbrev: 'EB', category: 'financial', logoPath: null },
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

/** Get the SVG logo path for a platform, or null if none */
export function getPlatformLogoPath(platform: PlatformType): string | null {
  return PLATFORM_INFO[platform].logoPath
}

/** Total platform count */
export const PLATFORM_COUNT = ALL_PLATFORMS.length // 11
