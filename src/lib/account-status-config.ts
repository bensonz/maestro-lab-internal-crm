/**
 * Account Status Configuration
 *
 * Defines all operational statuses for sportsbook and financial platforms,
 * including platform-specific "Limited" subtypes, colors, and grouping.
 */

// ── Sportsbook Statuses (16 values) ─────────────────────────────
// Grouped by lifecycle stage, ordered within each group

export type SportsbookStatusGroup =
  | 'setup'
  | 'verification'
  | 'active'
  | 'limited'
  | 'withdrawal'
  | 'closed'
  | 'other'

export interface StatusOption {
  value: string
  label: string
  group: SportsbookStatusGroup | 'financial'
  color: string // tailwind bg class
  textColor: string // tailwind text class
}

// ── Sportsbook statuses ──

export const SPORTSBOOK_STATUSES: StatusOption[] = [
  // Setup
  { value: 'SIGN_UP', label: 'Sign Up!', group: 'setup', color: 'bg-sky-400/20', textColor: 'text-sky-300' },
  { value: 'PIPELINE', label: 'Pipeline', group: 'setup', color: 'bg-blue-400/20', textColor: 'text-blue-400' },
  // Verification
  { value: 'VERIFY_NEEDED', label: 'Verify Needed', group: 'verification', color: 'bg-muted', textColor: 'text-muted-foreground' },
  { value: 'VERIFY_SENT', label: 'Verify Sent', group: 'verification', color: 'bg-muted', textColor: 'text-muted-foreground' },
  // Active
  { value: 'ACTIVE', label: 'Active', group: 'active', color: 'bg-green-400/20', textColor: 'text-green-400' },
  { value: 'VIP', label: 'VIP', group: 'active', color: 'bg-emerald-600/25', textColor: 'text-emerald-400' },
  // Limited
  { value: 'LIMITED', label: 'Limited', group: 'limited', color: 'bg-yellow-400/20', textColor: 'text-yellow-400' },
  // Withdrawal
  { value: 'WITHDRAWING', label: 'WITHDRAWING', group: 'withdrawal', color: 'bg-purple-400/20', textColor: 'text-purple-400' },
  { value: 'WD_TESTING', label: 'WD Testing', group: 'withdrawal', color: 'bg-red-300/15', textColor: 'text-red-300' },
  { value: 'WD_OPEN_BET', label: 'WD - w/open bet', group: 'withdrawal', color: 'bg-red-300/15', textColor: 'text-red-300' },
  { value: 'WITHDREW', label: 'WD', group: 'withdrawal', color: 'bg-red-300/15', textColor: 'text-red-300' },
  { value: 'WD_NO_LIMIT', label: 'WD w/o Limited', group: 'withdrawal', color: 'bg-red-300/15', textColor: 'text-red-300' },
  // Closed
  { value: 'CLOSED_BAL', label: 'Closed - w/bal', group: 'closed', color: 'bg-orange-400/20', textColor: 'text-orange-400' },
  { value: 'CLOSED_REFUNDED', label: 'Closed - Refunded', group: 'closed', color: 'bg-muted/50', textColor: 'text-muted-foreground' },
  { value: 'CLOSED_2ND', label: 'Closed aft 2nd Att.', group: 'closed', color: 'bg-muted/50', textColor: 'text-muted-foreground' },
  // Other
  { value: 'SELF_USE', label: 'Self-Use', group: 'other', color: 'bg-muted', textColor: 'text-muted-foreground' },
]

export const SPORTSBOOK_STATUS_MAP = new Map(SPORTSBOOK_STATUSES.map((s) => [s.value, s]))

// ── Financial platform statuses ──

export const BANK_STATUSES: StatusOption[] = [
  { value: 'ACTIVE', label: 'Active', group: 'financial', color: 'bg-green-400/20', textColor: 'text-green-400' },
  { value: 'CLOSED_BY_CLIENT', label: 'Closed by client', group: 'financial', color: 'bg-muted/50', textColor: 'text-muted-foreground' },
  { value: 'DEBANKED', label: 'De-banked', group: 'financial', color: 'bg-red-400/20', textColor: 'text-red-400' },
  { value: 'DEBANKED_BAL', label: 'De-banked w/bal', group: 'financial', color: 'bg-orange-400/20', textColor: 'text-orange-400' },
]

export const EDGEBOOST_STATUSES: StatusOption[] = [
  { value: 'ACTIVE', label: 'Active', group: 'financial', color: 'bg-green-400/20', textColor: 'text-green-400' },
  { value: 'REJECTED', label: 'Rejected', group: 'financial', color: 'bg-red-400/20', textColor: 'text-red-400' },
]

export const PAYPAL_STATUSES: StatusOption[] = [
  { value: 'ACTIVE', label: 'Active', group: 'financial', color: 'bg-green-400/20', textColor: 'text-green-400' },
  { value: 'PERM_LIMITED', label: 'Perm. Limited', group: 'financial', color: 'bg-yellow-400/20', textColor: 'text-yellow-400' },
  { value: 'VERIFY_NEEDED', label: 'Verify Needed', group: 'financial', color: 'bg-muted', textColor: 'text-muted-foreground' },
  { value: 'PERM_LIMITED_BAL', label: 'Perm. Limited w/bal', group: 'financial', color: 'bg-orange-400/20', textColor: 'text-orange-400' },
]

/** Get the status options for a given platform */
export function getStatusOptionsForPlatform(platform: string): StatusOption[] {
  switch (platform) {
    case 'BANK':
      return BANK_STATUSES
    case 'EDGEBOOST':
      return EDGEBOOST_STATUSES
    case 'PAYPAL':
      return PAYPAL_STATUSES
    default:
      return SPORTSBOOK_STATUSES
  }
}

/** Look up a status option by platform and value */
export function findStatusOption(platform: string, value: string): StatusOption | undefined {
  const options = getStatusOptionsForPlatform(platform)
  return options.find((s) => s.value === value)
}

// ── Platform-Specific "Limited" Subtypes ──

export type LimitedType = 'percentage' | 'amount' | 'mgm-tier' | 'caesars-sports' | 'none'

export interface LimitedConfig {
  type: LimitedType
  options?: string[] // For percentage/mgm-tier dropdowns
  sports?: string[] // For caesars sports
}

// ── Active sub-detail configs (financial platforms) ──
// When status = ACTIVE, some financial platforms need a sub-selector
export interface ActiveDetailConfig {
  options: string[]
  label: string // placeholder text
}

export const PLATFORM_ACTIVE_DETAIL: Record<string, ActiveDetailConfig> = {
  BANK: { options: ['Chase', 'Citi', 'BofA'], label: 'Bank' },
  EDGEBOOST: { options: ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'], label: 'Tier' },
}

/** Get the active detail config for a platform (if any) */
export function getActiveDetailConfig(platform: string): ActiveDetailConfig | null {
  return PLATFORM_ACTIVE_DETAIL[platform] ?? null
}

/** Defines how each platform handles the "Limited" status detail */
export const PLATFORM_LIMITED_CONFIG: Record<string, LimitedConfig> = {
  // Percentage-based
  BETRIVERS: { type: 'percentage', options: ['10%', '20%', '25%', '50%', '75%'] },
  BALLYBET: { type: 'percentage', options: ['10%', '20%', '25%', '50%', '75%'] },
  FANDUEL: { type: 'percentage', options: ['5%', '10%', '25%', '40%', '75%'] },
  // Amount-based (just "Limited" + amount input)
  DRAFTKINGS: { type: 'amount' },
  ESPNBET: { type: 'amount' },
  BET365: { type: 'amount' },
  FANATICS: { type: 'amount' },
  // MGM-specific tiers
  BETMGM: { type: 'mgm-tier', options: ['$3K Limited', '$1K Limited', '$100 Limited'] },
  // Caesars: by sports
  CAESARS: {
    type: 'caesars-sports',
    options: ['1/4', '2/4', '3/4', 'all'],
    sports: ['NBA', 'NFL', 'NCAAB', 'NCAAF'],
  },
}

/** Get the limited config for a platform (defaults to 'none' for financial) */
export function getLimitedConfig(platform: string): LimitedConfig {
  return PLATFORM_LIMITED_CONFIG[platform] ?? { type: 'none' }
}

// ── Group labels for dropdown section headers ──

export const STATUS_GROUP_LABELS: Record<SportsbookStatusGroup, string> = {
  setup: 'Setup',
  verification: 'Verification',
  active: 'Active',
  limited: 'Limited',
  withdrawal: 'Withdrawal',
  closed: 'Closed',
  other: 'Other',
}

// ── All valid sportsbook status values (for server-side validation) ──

export const ALL_SPORTSBOOK_STATUS_VALUES = SPORTSBOOK_STATUSES.map((s) => s.value)

export const ALL_BANK_STATUS_VALUES = BANK_STATUSES.map((s) => s.value)
export const ALL_EDGEBOOST_STATUS_VALUES = EDGEBOOST_STATUSES.map((s) => s.value)
export const ALL_PAYPAL_STATUS_VALUES = PAYPAL_STATUSES.map((s) => s.value)

/** Check if a status value is valid for a given platform */
export function isValidStatusForPlatform(platform: string, status: string): boolean {
  const options = getStatusOptionsForPlatform(platform)
  return options.some((s) => s.value === status)
}
