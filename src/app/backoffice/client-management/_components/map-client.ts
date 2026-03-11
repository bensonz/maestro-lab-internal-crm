import type {
  Client,
  FinancePlatformStatus,
  ServerClientData,
  ServerPlatformDetail,
  ViewPlatformStatus,
} from './types'

// Map DB accountStatuses values to view status
const DB_STATUS_TO_VIEW: Record<string, ViewPlatformStatus> = {
  VIP: 'vip',
  SEMI_LIMITED: 'semi_limited',
  ACTIVE: 'active',
  LIMITED: 'limited',
  DEAD: 'dead',
}

const DB_STATUS_TO_FINANCE_VIEW: Record<string, FinancePlatformStatus> = {
  VIP: 'active',
  SEMI_LIMITED: 'active',
  ACTIVE: 'active',
  LIMITED: 'permanent_limited',
  DEAD: 'rejected',
}

/** Extract status string from accountStatuses entry (handles both old string and new object format) */
function extractStatusString(raw: unknown): string | null {
  if (!raw) return null
  if (typeof raw === 'string') return raw
  if (typeof raw === 'object' && raw !== null && 'status' in raw) return (raw as { status: string }).status
  return null
}

// ============================================================================
// Server-to-view-model mapping (extracted for reuse)
// ============================================================================

// Platform type → display name lookup
const PLATFORM_TYPE_TO_NAME: Record<string, string> = {
  DRAFTKINGS: 'DraftKings',
  FANDUEL: 'FanDuel',
  BETMGM: 'BetMGM',
  CAESARS: 'Caesars',
  FANATICS: 'Fanatics',
  BALLYBET: 'BallyBet',
  BETRIVERS: 'BetRivers',
  BET365: 'Bet365',
  PAYPAL: 'PayPal',
  ONLINE_BANKING: 'Bank',
  BANK: 'Bank',
  EDGEBOOST: 'Edgeboost',
}

// Map intake status to our view status
export function mapIntakeStatusToClientStatus(
  intakeStatus: string,
): Client['status'] {
  switch (intakeStatus) {
    case 'APPROVED':
    case 'PHONE_ISSUED':
    case 'IN_EXECUTION':
      return 'active'
    case 'REJECTED':
    case 'INACTIVE':
    case 'PARTNERSHIP_ENDED':
      return 'ended'
    case 'NEEDS_MORE_INFO':
    case 'PENDING_EXTERNAL':
    case 'READY_FOR_APPROVAL':
    case 'EXECUTION_DELAYED':
      return 'verification_needed'
    default:
      return 'verification_needed'
  }
}

// Helper: extract a platform password from generatedCredentials
function getPlatformPassword(
  creds: Record<string, unknown> | null,
  platformKey: string,
): string {
  if (!creds) return '\u2014'
  // Format: platformPasswords map (keyed by DB type like DRAFTKINGS, PAYPAL, etc.)
  const pp = creds.platformPasswords as Record<string, string> | undefined
  if (pp?.[platformKey]) return pp[platformKey]
  // Shared sportsbook password
  if (pp?.sportsbook && !['PAYPAL', 'ONLINE_BANKING', 'BANK', 'EDGEBOOST', 'BETMGM'].includes(platformKey)) {
    return pp.sportsbook
  }
  // BetMGM special: top-level betmgmPassword
  if (platformKey === 'BETMGM' && creds.betmgmPassword) {
    return creds.betmgmPassword as string
  }
  // Legacy format: { draftkings: { password } }
  const legacyKey = platformKey.toLowerCase()
  const legacy = creds[legacyKey]
  if (legacy && typeof legacy === 'object' && 'password' in (legacy as Record<string, unknown>)) {
    return (legacy as Record<string, string>).password
  }
  return '\u2014'
}

// Map platform abbreviations to betting platform entries
export function mapPlatformsToBetting(
  platforms: string[],
  activePlatforms: string[],
  platformDetails?: ServerPlatformDetail[],
  generatedCredentials?: Record<string, unknown> | null,
  accountStatuses?: Record<string, string> | null,
): Client['bettingPlatforms'] {
  const PLATFORM_META: Record<string, { id: string; name: string; dbType: string }> = {
    DK: { id: 'draftkings', name: 'DraftKings', dbType: 'DRAFTKINGS' },
    FD: { id: 'fanduel', name: 'FanDuel', dbType: 'FANDUEL' },
    MGM: { id: 'betmgm', name: 'BetMGM', dbType: 'BETMGM' },
    CZR: { id: 'caesars', name: 'Caesars', dbType: 'CAESARS' },
    FAN: { id: 'fanatics', name: 'Fanatics', dbType: 'FANATICS' },
    BB: { id: 'ballybet', name: 'BallyBet', dbType: 'BALLYBET' },
    BR: { id: 'betrivers', name: 'BetRivers', dbType: 'BETRIVERS' },
    '365': { id: 'bet365', name: 'Bet365', dbType: 'BET365' },
  }

  // Map DB status to view status
  function mapBettingStatus(dbStatus: string | undefined): ViewPlatformStatus {
    switch (dbStatus) {
      case 'VERIFIED': return 'active'
      case 'LIMITED': return 'limited'
      case 'REJECTED': return 'dead'
      case 'PENDING_REVIEW': return 'pipeline'
      default: return 'pipeline'
    }
  }

  // Only include sportsbook platform abbreviations
  const sportAbbrs = ['DK', 'FD', 'MGM', 'CZR', 'FAN', 'BB', 'BR', '365']
  const sportPlatforms = platforms.filter((p) => sportAbbrs.includes(p))

  return sportPlatforms.map((abbr) => {
    const meta = PLATFORM_META[abbr] || { id: abbr.toLowerCase(), name: abbr, dbType: abbr }
    const detail = platformDetails?.find((p) => p.platformType === meta.dbType)
    // Operational status from accountStatuses takes precedence over intake status
    const acctStatus = accountStatuses?.[meta.dbType]
    const viewStatus: ViewPlatformStatus = acctStatus && DB_STATUS_TO_VIEW[acctStatus]
      ? DB_STATUS_TO_VIEW[acctStatus]
      : detail ? mapBettingStatus(detail.status) : 'pipeline'
    return {
      id: meta.id,
      name: meta.name,
      abbr,
      status: viewStatus,
      balance: 0,
      credentials: {
        username: detail?.username || '\u2014',
        password: getPlatformPassword(generatedCredentials ?? null, meta.dbType),
      },
    }
  })
}

// Map event type enum values to timeline display types
export function mapEventTypeToTimelineType(
  eventType: string,
): 'application' | 'verification' | 'status' | 'deposit' | 'withdrawal' | 'todo' | 'update' {
  const lower = eventType.toLowerCase()
  if (lower.includes('application') || lower.includes('submitted'))
    return 'application'
  if (
    lower.includes('verification') ||
    lower.includes('approval') ||
    lower.includes('rejection')
  )
    return 'verification'
  if (lower.includes('status')) return 'status'
  if (lower.includes('deposit') || lower.includes('fund')) return 'deposit'
  if (lower.includes('withdrawal')) return 'withdrawal'
  if (lower.includes('todo') || lower.includes('task')) return 'todo'
  return 'update'
}

// Map DB platform status to finance view status
export function mapFinanceStatus(dbStatus: string | undefined): FinancePlatformStatus {
  switch (dbStatus) {
    case 'VERIFIED': return 'active'
    case 'LIMITED': return 'permanent_limited'
    case 'REJECTED': return 'rejected'
    default: return 'pipeline' // NOT_STARTED, PENDING_UPLOAD, PENDING_REVIEW, etc.
  }
}

// Find a platform detail by type
export function findPlatformDetail(
  details: ServerPlatformDetail[] | undefined,
  type: string,
): ServerPlatformDetail | undefined {
  return details?.find((p) => p.platformType === type)
}

/** Format ISO date string to readable format (e.g. "Feb 15, 2000") */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '\u2014'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return '\u2014'
  }
}

/** Extract US state abbreviation from address string, e.g. "123 Main St, Chicago, IL 60601" -> "IL" */
function extractStateFromAddress(address: string | null | undefined): string | null {
  if (!address) return null
  const match = address.match(/\b([A-Z]{2})\s*\d{5}/)
  if (match) return match[1]
  const parts = address.split(',').map((s) => s.trim())
  if (parts.length >= 2) {
    const stateZip = parts[parts.length - 1]
    const stateMatch = stateZip.match(/^([A-Z]{2})\b/)
    if (stateMatch) return stateMatch[1]
  }
  return null
}

// Map a single server client to our view model
export function mapServerClientToClient(serverClient: ServerClientData): Client {
  // Parse questionnaire JSON for profile fields
  let questionnaire: Record<string, unknown> = {}
  try {
    if (serverClient.questionnaire) {
      questionnaire = JSON.parse(serverClient.questionnaire)
    }
  } catch {
    /* ignore parse errors */
  }

  // Extract generated credentials for password/PIN display
  const creds = serverClient.generatedCredentials

  // Read operational account statuses (VIP, SEMI_LIMITED, etc.)
  // Handle both old string format and new PlatformStatusEntry object format
  const rawAcctStatuses = serverClient.accountStatuses as Record<string, unknown> | null
  const acctStatuses: Record<string, string> | null = rawAcctStatuses
    ? Object.fromEntries(
        Object.entries(rawAcctStatuses).map(([k, v]) => [k, extractStatusString(v) ?? ''])
          .filter(([, v]) => v !== ''),
      )
    : null

  // Build finance platforms from real data
  const paypalDetail = findPlatformDetail(serverClient.platformDetails, 'PAYPAL')
  const bankDetail = findPlatformDetail(serverClient.platformDetails, 'ONLINE_BANKING')
    || findPlatformDetail(serverClient.platformDetails, 'BANK')
  const edgeboostDetail = findPlatformDetail(serverClient.platformDetails, 'EDGEBOOST')

  // BetMGM screenshots for review banner
  const betmgmDetail = findPlatformDetail(serverClient.platformDetails, 'BETMGM')

  // Address from draft — either currentAddress (lives somewhere else) or ID address
  const primaryAddress = serverClient.address || '\u2014'
  const secondaryAddress = (questionnaire.secondaryAddress as string) || (questionnaire.currentAddress as string) || undefined

  // State from address
  const state = extractStateFromAddress(serverClient.address)

  return {
    id: serverClient.id,
    name: serverClient.name,
    companyPhone: (questionnaire.companyPhone as string) || serverClient.phone || '\u2014',
    carrier: (questionnaire.carrier as string) || '\u2014',
    companyEmail: (questionnaire.assignedGmail as string) || serverClient.email || '\u2014',
    personalPhone: serverClient.phone || '\u2014',
    startDate: serverClient.start,
    status: mapIntakeStatusToClientStatus(serverClient.intakeStatus),
    intakeStatus: serverClient.intakeStatus,
    totalFunds: parseFloat(serverClient.funds.replace(/[$,]/g, '')) || 0,
    totalPaid: serverClient.totalPaid || 0,
    financePlatforms: [
      {
        name: 'PayPal',
        type: 'paypal' as const,
        status: acctStatuses?.PAYPAL ? (DB_STATUS_TO_FINANCE_VIEW[acctStatuses.PAYPAL] || mapFinanceStatus(paypalDetail?.status)) : (paypalDetail ? mapFinanceStatus(paypalDetail.status) : 'pipeline'),
        balance: 0,
        isUsed: false,
        credentials: {
          username: paypalDetail?.username || '\u2014',
          password: getPlatformPassword(creds, 'PAYPAL'),
        },
      },
      {
        name: 'Bank',
        type: 'bank' as const,
        status: acctStatuses?.ONLINE_BANKING ? (DB_STATUS_TO_FINANCE_VIEW[acctStatuses.ONLINE_BANKING] || mapFinanceStatus(bankDetail?.status)) : (bankDetail ? mapFinanceStatus(bankDetail.status) : 'pipeline'),
        balance: 0,
        bankType: 'Chase' as const,
        credentials: {
          username: bankDetail?.username || '\u2014',
          password: getPlatformPassword(creds, 'BANK'),
          pin: (creds?.bankPin4 as string) || '\u2014',
        },
        debitCard: {
          cardNumber: bankDetail?.cardNumber || '\u2014',
          cvv: bankDetail?.cvv || '\u2014',
          expiration: bankDetail?.cardExpiry || '\u2014',
        },
        bankInfo: {
          routingNumber: bankDetail?.routingNumber || '\u2014',
          accountNumber: bankDetail?.bankAccountNumber || '\u2014',
        },
      },
      {
        name: 'Edgeboost',
        type: 'edgeboost' as const,
        status: acctStatuses?.EDGEBOOST ? (DB_STATUS_TO_FINANCE_VIEW[acctStatuses.EDGEBOOST] || mapFinanceStatus(edgeboostDetail?.status)) : (edgeboostDetail ? mapFinanceStatus(edgeboostDetail.status) : 'pipeline'),
        balance: 0,
        credentials: {
          username: edgeboostDetail?.username || '\u2014',
          password: getPlatformPassword(creds, 'EDGEBOOST'),
        },
        debitCard: {
          cardNumber: edgeboostDetail?.cardNumber || '\u2014',
          cvv: edgeboostDetail?.cvv || '\u2014',
          expiration: edgeboostDetail?.cardExpiry || '\u2014',
        },
      },
    ],
    bettingPlatforms: mapPlatformsToBetting(
      serverClient.platforms,
      serverClient.activePlatforms,
      serverClient.platformDetails,
      creds,
      acctStatuses,
    ),
    agent: serverClient.agent || undefined,
    betmgmScreenshots: betmgmDetail?.screenshots ?? [],
    betmgmStatus: betmgmDetail?.status ?? 'NOT_STARTED',
    platformDetails: serverClient.platformDetails,
    quickInfo: {
      zellePhone: (questionnaire.zellePhone as string) || '\u2014',
      edgeboostDebit: edgeboostDetail?.cardNumber ? `\u2022\u2022\u2022\u2022 ${edgeboostDetail.cardNumber.slice(-4)}` : '\u2014',
      bankDebit: bankDetail?.cardNumber ? `\u2022\u2022\u2022\u2022 ${bankDetail.cardNumber.slice(-4)}` : '\u2014',
      state: state || serverClient.state || '\u2014',
    },
    profile: {
      fullName: serverClient.name,
      dob: formatDate(questionnaire.dateOfBirth as string),
      gender:
        ((questionnaire.gender as string) as 'Male' | 'Female') || 'Male',
      idImageUrl: serverClient.idDocument || undefined,
      idExpiryDate: formatDate(questionnaire.idExpiry as string),
      ssn: (questionnaire.ssnNumber as string) || '\u2014',
      citizenship: (questionnaire.citizenship as string) || '\u2014',
      personalEmail: serverClient.email || '\u2014',
      primaryAddress,
      secondaryAddress,
    },
    platformAddresses: {
      paypal: primaryAddress !== '\u2014' ? primaryAddress : '\u2014',
      bank: primaryAddress !== '\u2014' ? primaryAddress : '\u2014',
      edgeboost: primaryAddress !== '\u2014' ? primaryAddress : '\u2014',
    },
    gmailPassword: (questionnaire.gmailPassword as string) || '\u2014',
    alertFlags: {
      paypalPreviouslyUsed: questionnaire.paypalPreviouslyUsed === true,
      idExpiring: (() => {
        const idExpiry = (questionnaire.idExpiry as string) || null
        if (!idExpiry) return false
        const expiry = new Date(idExpiry)
        const today = new Date()
        const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays < 100
      })(),
      debankedHistory: questionnaire.debankedHistory === true,
      criminalRecord: questionnaire.criminalRecord === true,
      undisclosedInfo: questionnaire.undisclosedInfo === true,
      addressMismatch: questionnaire.addressMismatch === true || questionnaire.livesAtDifferentAddress === true,
    },
    transactions: serverClient.transactions.map((t) => ({
      id: t.id,
      type:
        t.type === 'DEPOSIT'
          ? ('deposit' as const)
          : t.type === 'WITHDRAWAL'
            ? ('withdrawal' as const)
            : ('deposit' as const),
      amount: t.amount,
      date: new Date(t.date).toLocaleDateString(),
      platform: PLATFORM_TYPE_TO_NAME[t.platformType || ''] || t.platformType || '\u2014',
    })),
    timeline: serverClient.eventLogs.map((e) => ({
      id: e.id,
      event: e.description,
      date: new Date(e.createdAt).toLocaleDateString(),
      type: mapEventTypeToTimelineType(e.eventType),
    })),
    zelle: (questionnaire.zellePhone as string) || '\u2014',
    relationships: [],
    questionnaire: Object.keys(questionnaire).length > 0 ? questionnaire : null,
  }
}
