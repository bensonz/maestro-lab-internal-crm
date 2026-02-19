import type {
  Client,
  FinancePlatformStatus,
  ServerClientData,
  ServerPlatformDetail,
  ViewPlatformStatus,
} from './types'

// ============================================================================
// Server-to-view-model mapping (extracted for reuse)
// ============================================================================

// Map intake status to our view status
export function mapIntakeStatusToClientStatus(
  intakeStatus: string,
): Client['status'] {
  switch (intakeStatus) {
    case 'APPROVED':
    case 'PREQUAL_APPROVED':
    case 'PHONE_ISSUED':
    case 'IN_EXECUTION':
      return 'active'
    case 'REJECTED':
    case 'INACTIVE':
    case 'PARTNERSHIP_ENDED':
      return 'closed'
    case 'PREQUAL_REVIEW':
    case 'NEEDS_MORE_INFO':
    case 'PENDING_EXTERNAL':
    case 'READY_FOR_APPROVAL':
    case 'EXECUTION_DELAYED':
      return 'further_verification'
    default:
      return 'further_verification'
  }
}

// Map platform abbreviations to betting platform entries
export function mapPlatformsToBetting(
  platforms: string[],
  activePlatforms: string[],
  platformDetails?: ServerPlatformDetail[],
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
    return {
      id: meta.id,
      name: meta.name,
      abbr,
      status: detail ? mapBettingStatus(detail.status) : ('pipeline' as const),
      balance: 0,
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

  // Build finance platforms from real data
  const paypalDetail = findPlatformDetail(serverClient.platformDetails, 'PAYPAL')
  const bankDetail = findPlatformDetail(serverClient.platformDetails, 'BANK')
  const edgeboostDetail = findPlatformDetail(serverClient.platformDetails, 'EDGEBOOST')

  // BetMGM screenshots for review banner
  const betmgmDetail = findPlatformDetail(serverClient.platformDetails, 'BETMGM')

  return {
    id: serverClient.id,
    name: serverClient.name,
    companyPhone: serverClient.phone || '\u2014',
    carrier: '\u2014',
    companyEmail: serverClient.email || '\u2014',
    personalPhone: '\u2014',
    startDate: serverClient.start,
    status: mapIntakeStatusToClientStatus(serverClient.intakeStatus),
    intakeStatus: serverClient.intakeStatus,
    totalFunds: parseFloat(serverClient.funds.replace(/[$,]/g, '')) || 0,
    financePlatforms: [
      {
        name: 'PayPal',
        type: 'paypal' as const,
        status: paypalDetail ? mapFinanceStatus(paypalDetail.status) : 'pipeline',
        balance: 0,
        isUsed: false,
        credentials: {
          username: paypalDetail?.username || '\u2014',
          password: '\u2014',
        },
      },
      {
        name: 'Bank',
        type: 'bank' as const,
        status: bankDetail ? mapFinanceStatus(bankDetail.status) : 'pipeline',
        balance: 0,
        bankType: 'Chase' as const,
        credentials: {
          username: bankDetail?.username || '\u2014',
          password: '\u2014',
        },
        debitCard: {
          cardNumber: '\u2014',
          cvv: '\u2014',
          expiration: '\u2014',
        },
        bankInfo: {
          routingNumber: '\u2014',
          accountNumber: '\u2014',
        },
      },
      {
        name: 'Edgeboost',
        type: 'edgeboost' as const,
        status: edgeboostDetail ? mapFinanceStatus(edgeboostDetail.status) : 'pipeline',
        balance: 0,
        credentials: {
          username: edgeboostDetail?.username || '\u2014',
          password: '\u2014',
        },
        debitCard: {
          cardNumber: '\u2014',
          cvv: '\u2014',
          expiration: '\u2014',
        },
      },
    ],
    bettingPlatforms: mapPlatformsToBetting(
      serverClient.platforms,
      serverClient.activePlatforms,
      serverClient.platformDetails,
    ),
    agent: serverClient.agent || undefined,
    betmgmScreenshots: betmgmDetail?.screenshots ?? [],
    betmgmStatus: betmgmDetail?.status ?? 'NOT_STARTED',
    betmgmAgentResult: betmgmDetail?.agentResult ?? undefined,
    betmgmRetryCount: betmgmDetail?.retryCount ?? 0,
    platformDetails: serverClient.platformDetails,
    quickInfo: {
      zellePhone: (questionnaire.zellePhone as string) || '\u2014',
      edgeboostDebit: '\u2014',
      bankDebit: '\u2014',
      state: serverClient.state || '\u2014',
    },
    profile: {
      fullName: serverClient.name,
      dob: (questionnaire.dateOfBirth as string) || '\u2014',
      gender:
        ((questionnaire.gender as string) as 'Male' | 'Female') || 'Male',
      idImageUrl: serverClient.idDocument || undefined,
      idExpiryDate: (questionnaire.idExpiry as string) || '\u2014',
      ssn: '\u2022\u2022\u2022\u2022', // Never expose real SSN client-side
      citizenship: (questionnaire.citizenship as string) || '\u2014',
      personalEmail: serverClient.email || '\u2014',
      primaryAddress: serverClient.address
        ? `${serverClient.address}, ${serverClient.city}, ${serverClient.state} ${serverClient.zipCode}`
        : '\u2014',
    },
    platformAddresses: {
      paypal: '\u2014',
      bank: '\u2014',
      edgeboost: '\u2014',
    },
    alertFlags: {},
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
      platform: t.platformType || '\u2014',
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
