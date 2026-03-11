export type ConfigValueType = 'number' | 'percentage' | 'currency' | 'days' | 'hours'

export interface ConfigDefinition {
  key: string
  label: string
  description: string
  category: string
  type: ConfigValueType
  defaultValue: number
  min?: number
  max?: number
  step?: number
}

export const CONFIG_CATEGORIES = [
  'Platform Targets',
  'Cockpit / Dashboard',
  'Commission',
  'Risk Scoring',
  'Operations',
] as const

export type ConfigCategory = (typeof CONFIG_CATEGORIES)[number]

// ── Per-platform default values ──────────────────────────────────────
// balanceTarget  = total balance target across ALL accounts on this platform
// accountTarget  = how many active accounts we need
// minAccount     = minimum balance each individual account should hold

export const PLATFORM_DEFAULTS: Record<string, { balanceTarget: number; accountTarget: number; minAccount: number }> = {
  DRAFTKINGS:  { balanceTarget: 100_000, accountTarget: 5,  minAccount: 20_000 },
  FANDUEL:     { balanceTarget: 48_000,  accountTarget: 6,  minAccount: 8_000 },
  BETMGM:      { balanceTarget: 60_000,  accountTarget: 3,  minAccount: 20_000 },
  CAESARS:      { balanceTarget: 80_000,  accountTarget: 4,  minAccount: 20_000 },
  FANATICS:    { balanceTarget: 50_000,  accountTarget: 10, minAccount: 5_000 },
  BALLYBET:    { balanceTarget: 20_000,  accountTarget: 4,  minAccount: 5_000 },
  BETRIVERS:   { balanceTarget: 20_000,  accountTarget: 4,  minAccount: 5_000 },
  BET365:      { balanceTarget: 20_000,  accountTarget: 4,  minAccount: 5_000 },
}

export const PLATFORM_LABELS: Record<string, string> = {
  DRAFTKINGS: 'DraftKings',
  FANDUEL: 'FanDuel',
  BETMGM: 'BetMGM',
  CAESARS: 'Caesars',
  FANATICS: 'Fanatics',
  BALLYBET: 'Bally Bet',
  BETRIVERS: 'BetRivers',
  BET365: 'Bet365',
}

// Generate per-platform config entries (3 per platform)
function generatePlatformConfigs(): ConfigDefinition[] {
  const entries: ConfigDefinition[] = []
  for (const [platform, defaults] of Object.entries(PLATFORM_DEFAULTS)) {
    const label = PLATFORM_LABELS[platform] ?? platform
    entries.push({
      key: `${platform}_BALANCE_TARGET`,
      label: `${label} Total Target`,
      description: `Total balance target across all ${label} accounts combined`,
      category: 'Platform Targets',
      type: 'currency',
      defaultValue: defaults.balanceTarget,
      min: 100,
    })
    entries.push({
      key: `${platform}_ACCOUNT_TARGET`,
      label: `${label} Account Target`,
      description: `Required number of active accounts for ${label}`,
      category: 'Platform Targets',
      type: 'number',
      defaultValue: defaults.accountTarget,
      min: 1,
      max: 50,
    })
    entries.push({
      key: `${platform}_MIN_ACCOUNT`,
      label: `${label} Min per Account`,
      description: `Minimum balance each ${label} account should hold`,
      category: 'Platform Targets',
      type: 'currency',
      defaultValue: defaults.minAccount,
      min: 100,
    })
  }
  return entries
}

export const CONFIG_REGISTRY: ConfigDefinition[] = [
  // ── Platform Targets (per-platform) ────────────────────────────────
  ...generatePlatformConfigs(),

  // ── Cockpit / Dashboard ──────────────────────────────────────────
  {
    key: 'BANK_OVERNIGHT_THRESHOLD',
    label: 'Bank Overnight Alert',
    description: 'Bank balance above this triggers overnight transfer alert',
    category: 'Cockpit / Dashboard',
    type: 'currency',
    defaultValue: 250,
    min: 50,
  },
  {
    key: 'BANK_OVERNIGHT_HOURS',
    label: 'Bank Overnight Window',
    description: 'Hours to look back for recent bank deposits',
    category: 'Cockpit / Dashboard',
    type: 'hours',
    defaultValue: 24,
    min: 1,
    max: 72,
  },
  {
    key: 'EDGEBOOST_TOTAL_TARGET',
    label: 'EdgeBoost Total Target',
    description: 'Total deposit target per client for EdgeBoost onboarding',
    category: 'Cockpit / Dashboard',
    type: 'currency',
    defaultValue: 1_000,
    min: 100,
  },
  {
    key: 'EDGEBOOST_DEPOSIT_COUNT',
    label: 'EdgeBoost Deposit Count',
    description: 'Number of deposits to complete EdgeBoost onboarding',
    category: 'Cockpit / Dashboard',
    type: 'number',
    defaultValue: 4,
    min: 1,
    max: 10,
  },
  {
    key: 'STALE_AGENT_DAYS',
    label: 'Stale Agent Threshold',
    description: 'Days of inactivity before agent is considered stale',
    category: 'Cockpit / Dashboard',
    type: 'days',
    defaultValue: 7,
    min: 1,
    max: 30,
  },
  {
    key: 'ATTENTION_SUCCESS_THRESHOLD',
    label: 'Low Success Threshold',
    description: 'Agents below this approval rate are flagged (0-100)',
    category: 'Cockpit / Dashboard',
    type: 'percentage',
    defaultValue: 85,
    min: 0,
    max: 100,
  },
  {
    key: 'STUCK_NO_PROGRESS_DAYS',
    label: 'Stuck Client Threshold',
    description: 'Days without progress before a client is considered stuck',
    category: 'Cockpit / Dashboard',
    type: 'days',
    defaultValue: 5,
    min: 1,
    max: 30,
  },
  {
    key: 'STUCK_DEVICE_WAIT_DAYS',
    label: 'Device Wait Stuck Threshold',
    description: 'Days waiting for device before flagging as stuck',
    category: 'Cockpit / Dashboard',
    type: 'days',
    defaultValue: 1,
    min: 1,
    max: 7,
  },
  {
    key: 'INSIGHTS_LOW_BALANCE_PCT',
    label: 'Low Balance Insight Threshold',
    description: 'Platforms below this % of target trigger a low-balance insight',
    category: 'Cockpit / Dashboard',
    type: 'percentage',
    defaultValue: 50,
    min: 10,
    max: 100,
  },
  {
    key: 'INSIGHTS_SLOW_APPROVAL_DAYS',
    label: 'Slow Approval Insight Threshold',
    description: 'Average days-to-approve above this triggers a process improvement insight',
    category: 'Cockpit / Dashboard',
    type: 'days',
    defaultValue: 14,
    min: 3,
    max: 60,
  },
  {
    key: 'INSIGHTS_INACTIVE_AGENT_WARN',
    label: 'Inactive Agent Warning Threshold',
    description: 'Number of inactive agents above which severity escalates to warning',
    category: 'Cockpit / Dashboard',
    type: 'number',
    defaultValue: 3,
    min: 1,
    max: 20,
  },
  {
    key: 'INSIGHTS_ZERO_SUCCESS_CRITICAL',
    label: 'Zero Success Critical Threshold',
    description: 'Number of zero-success agents above which severity escalates to critical',
    category: 'Cockpit / Dashboard',
    type: 'number',
    defaultValue: 2,
    min: 1,
    max: 10,
  },
  {
    key: 'INSIGHTS_STUCK_WARNING_COUNT',
    label: 'Stuck Clients Warning Count',
    description: 'Number of stuck clients in a step before severity escalates to warning',
    category: 'Cockpit / Dashboard',
    type: 'number',
    defaultValue: 2,
    min: 1,
    max: 10,
  },
  {
    key: 'INSIGHTS_UNUSED_ACCOUNTS_WARN',
    label: 'Unused Accounts Warning Count',
    description: 'Number of unused accounts before severity escalates to warning',
    category: 'Cockpit / Dashboard',
    type: 'number',
    defaultValue: 5,
    min: 1,
    max: 20,
  },
  {
    key: 'INSIGHTS_DEVICE_WAIT_WARN',
    label: 'Device Wait Warning Count',
    description: 'Number of clients waiting for device before severity escalates to warning',
    category: 'Cockpit / Dashboard',
    type: 'number',
    defaultValue: 3,
    min: 1,
    max: 10,
  },

  // ── Commission ───────────────────────────────────────────────────
  {
    key: 'BONUS_POOL_TOTAL',
    label: 'Bonus Pool Total',
    description: 'Total bonus pool per approved client',
    category: 'Commission',
    type: 'currency',
    defaultValue: 400,
    min: 0,
  },
  {
    key: 'DIRECT_BONUS',
    label: 'Direct Bonus',
    description: 'Direct bonus to the closer agent',
    category: 'Commission',
    type: 'currency',
    defaultValue: 200,
    min: 0,
  },
  {
    key: 'STAR_POOL_TOTAL',
    label: 'Star Pool Total',
    description: 'Star pool distributed up the hierarchy',
    category: 'Commission',
    type: 'currency',
    defaultValue: 200,
    min: 0,
  },
  {
    key: 'SLICE_VALUE',
    label: 'Slice Value',
    description: 'Value of each star pool slice',
    category: 'Commission',
    type: 'currency',
    defaultValue: 50,
    min: 0,
  },

  // ── Risk Scoring ─────────────────────────────────────────────────
  {
    key: 'RISK_THRESHOLD_LOW_MAX',
    label: 'Low Risk Upper Bound',
    description: 'Scores at or above this are low risk (green)',
    category: 'Risk Scoring',
    type: 'number',
    defaultValue: 0,
  },
  {
    key: 'RISK_THRESHOLD_HIGH',
    label: 'High Risk Threshold',
    description: 'Scores at or below this are high risk (red)',
    category: 'Risk Scoring',
    type: 'number',
    defaultValue: -30,
    max: 0,
  },
  {
    key: 'RISK_PENALTY_DEBANKED',
    label: 'De-banked Penalty',
    description: 'Score penalty for de-banked history',
    category: 'Risk Scoring',
    type: 'number',
    defaultValue: -30,
    max: 0,
  },
  {
    key: 'RISK_PENALTY_CRIMINAL',
    label: 'Criminal Record Penalty',
    description: 'Score penalty for criminal record',
    category: 'Risk Scoring',
    type: 'number',
    defaultValue: -30,
    max: 0,
  },
  {
    key: 'RISK_PENALTY_PAYPAL',
    label: 'PayPal Used Penalty',
    description: 'Score penalty for previously used PayPal',
    category: 'Risk Scoring',
    type: 'number',
    defaultValue: -10,
    max: 0,
  },

  // ── Operations ───────────────────────────────────────────────────
  {
    key: 'PHONE_DUE_BACK_DAYS',
    label: 'Phone Due-Back Window',
    description: 'Days before a signed-out device is due for return',
    category: 'Operations',
    type: 'days',
    defaultValue: 3,
    min: 1,
    max: 14,
  },
  {
    key: 'AUTO_TODO_DUE_DAYS',
    label: 'Auto-Todo Due Window',
    description: 'Default due date for auto-created todos on approval',
    category: 'Operations',
    type: 'days',
    defaultValue: 7,
    min: 1,
    max: 30,
  },
  {
    key: 'FUND_MATCH_WINDOW_HOURS',
    label: 'Fund Match Window',
    description: 'Hours to look back when matching email detections to fund allocations',
    category: 'Operations',
    type: 'hours',
    defaultValue: 48,
    min: 1,
    max: 168,
  },
  {
    key: 'FUND_EXACT_MATCH_TOLERANCE',
    label: 'Fund Exact Match Tolerance',
    description: 'Percentage tolerance for auto-confirming fund matches',
    category: 'Operations',
    type: 'percentage',
    defaultValue: 5,
    min: 0,
    max: 50,
  },
  {
    key: 'FUND_DISCREPANCY_THRESHOLD',
    label: 'Fund Discrepancy Threshold',
    description: 'Percentage mismatch before flagging as discrepancy',
    category: 'Operations',
    type: 'percentage',
    defaultValue: 25,
    min: 0,
    max: 100,
  },
  {
    key: 'EMAIL_TODO_DUE_DAYS',
    label: 'Email Todo Due Window',
    description: 'Default due date for auto-created email todos',
    category: 'Operations',
    type: 'days',
    defaultValue: 3,
    min: 1,
    max: 14,
  },
  {
    key: 'WITHDRAWAL_CONFIRM_HOURS',
    label: 'Withdrawal Confirm Window',
    description: 'Hours to wait for withdrawal confirmation before reminder todo is due',
    category: 'Operations',
    type: 'hours',
    defaultValue: 24,
    min: 1,
    max: 72,
  },
  {
    key: 'MIN_DEVICE_INVENTORY',
    label: 'Min Device Inventory',
    description: 'Available devices below this count triggers a low inventory warning',
    category: 'Operations',
    type: 'number',
    defaultValue: 6,
    min: 1,
    max: 50,
  },
  {
    key: 'CLEARING_SPORTSBOOK_WITHDRAWAL_HOURS',
    label: 'Sportsbook Withdrawal Clearing',
    description: 'Hours for sportsbook withdrawals to clear to bank',
    category: 'Operations',
    type: 'hours',
    defaultValue: 24,
    min: 1,
    max: 168,
  },
  {
    key: 'CLEARING_PAYPAL_WITHDRAWAL_HOURS',
    label: 'PayPal Withdrawal Clearing',
    description: 'Hours for PayPal withdrawals to clear to bank',
    category: 'Operations',
    type: 'hours',
    defaultValue: 72,
    min: 1,
    max: 168,
  },
  {
    key: 'CLEARING_BANK_WIRE_HOURS',
    label: 'Bank ACH/Wire Clearing',
    description: 'Hours for bank ACH/wire transfers to clear',
    category: 'Operations',
    type: 'hours',
    defaultValue: 24,
    min: 1,
    max: 168,
  },
  {
    key: 'CLEARING_STUCK_BUSINESS_DAYS',
    label: 'Stuck Transaction Threshold',
    description: 'Business days before flagging an in-transit transaction as stuck',
    category: 'Operations',
    type: 'days',
    defaultValue: 3,
    min: 1,
    max: 10,
  },
]

// Lookup map for quick access
export const CONFIG_MAP = new Map(CONFIG_REGISTRY.map((c) => [c.key, c]))
