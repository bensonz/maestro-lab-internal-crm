// ============================================================================
// Client Management View-Model Types (mirrors Lovable reference)
// ============================================================================

export type ClientStatus = 'active' | 'closed' | 'further_verification'
export type ViewPlatformStatus = 'active' | 'limited' | 'pipeline' | 'dead'
export type FinancePlatformStatus = 'active' | 'permanent_limited' | 'rejected'
export type BankType = 'Chase' | 'Citi' | 'BofA'

export const BETTING_PLATFORMS = [
  { id: 'draftkings', name: 'DraftKings', abbr: 'DK' },
  { id: 'fanduel', name: 'FanDuel', abbr: 'FD' },
  { id: 'betmgm', name: 'BetMGM', abbr: 'MGM' },
  { id: 'caesars', name: 'Caesars', abbr: 'CZR' },
  { id: 'fanatics', name: 'Fanatics', abbr: 'FAN' },
  { id: 'ballybet', name: 'BallyBet', abbr: 'BB' },
  { id: 'betrivers', name: 'BetRivers', abbr: 'BR' },
  { id: 'bet365', name: 'Bet365', abbr: '365' },
] as const

export interface PlatformCredentials {
  username?: string
  password?: string
  pin?: string
  address?: string
}

export interface DebitCardInfo {
  cardNumber: string
  cvv: string
  expiration: string
}

export interface BankInfo {
  routingNumber?: string
  accountNumber?: string
}

export interface BettingPlatform {
  id: string
  name: string
  abbr: string
  status: ViewPlatformStatus
  balance: number
  startDate?: string
  endDate?: string
  deposits?: number
  withdrawals?: number
  credentials?: PlatformCredentials
}

export interface FinancePlatform {
  name: string
  type: 'paypal' | 'bank' | 'edgeboost'
  status: FinancePlatformStatus
  balance: number
  credentials?: PlatformCredentials
  debitCard?: DebitCardInfo
  bankType?: BankType
  isUsed?: boolean
  bankInfo?: BankInfo
}

export interface ClientQuickInfo {
  zellePhone: string
  edgeboostDebit: string
  bankDebit: string
  state: string
}

export interface ClientProfile {
  fullName: string
  dob: string
  gender: 'Male' | 'Female'
  idImageUrl?: string
  idExpiryDate?: string
  ssn: string
  ssnDocumentUrl?: string
  citizenship: string
  personalEmail: string
  primaryAddress: string
  secondaryAddress?: string
}

export interface PlatformAddress {
  paypal?: string
  bank?: string
  edgeboost?: string
}

export interface AlertFlags {
  paypalPreviouslyUsed?: boolean
  idExpiring?: boolean
  pinIssue?: boolean
  customAlerts?: string[]
}

export interface Relationship {
  name: string
  type: 'friend' | 'referral' | 'family'
  clientId?: string
}

export interface Transaction {
  id: string
  date: string
  amount: number
  type: 'deposit' | 'withdrawal'
  platform: string
  documentUrl?: string
  documentType?: string
}

export interface TimelineEvent {
  id: string
  date: string
  event: string
  type:
    | 'application'
    | 'verification'
    | 'status'
    | 'deposit'
    | 'withdrawal'
    | 'todo'
    | 'update'
}

export interface Client {
  id: string
  name: string
  companyPhone: string
  carrier: string
  companyEmail: string
  personalPhone: string
  startDate: string
  closeDate?: string
  status: ClientStatus
  intakeStatus?: string
  totalFunds: number
  financePlatforms: FinancePlatform[]
  bettingPlatforms: BettingPlatform[]
  quickInfo: ClientQuickInfo
  profile: ClientProfile
  platformAddresses?: PlatformAddress
  alertFlags?: AlertFlags
  transactions: Transaction[]
  timeline: TimelineEvent[]
  agent?: string
  agentId?: string
  zelle?: string
  relationships?: Relationship[]
}

// Summary metrics for sidebar
export interface SummaryMetric {
  label: string
  value: number
  variant: 'primary' | 'success' | 'muted' | 'warning'
}

// ============================================================================
// Server data shape from getAllClients + getClientStats
// ============================================================================

export interface ServerClientData {
  id: string
  name: string
  phone: string
  email: string | null
  start: string
  funds: string
  platforms: string[]
  activePlatforms: string[]
  intakeStatus: string
}

export interface ServerClientStats {
  total: number
  active: number
  closed: number
  furtherVerification: number
}
