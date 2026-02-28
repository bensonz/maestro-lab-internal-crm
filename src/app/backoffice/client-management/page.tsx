import { ClientManagementPage } from './_components/client-management-page'
import { getAllClients, getClientEventLogs } from '@/backend/data/clients'
import type { ServerClientData, ServerClientStats, ServerPlatformDetail } from './_components/types'
// Platform data from ClientDraft.platformData JSON — may have extra fields beyond PlatformEntry type
interface PlatformDataEntry {
  platform?: string
  username?: string
  accountId?: string
  screenshot?: string
  screenshot2?: string
  status?: string
  pin?: string
  screenshots?: string[]
  [key: string]: unknown
}

/**
 * Build a questionnaire JSON string from ClientDraft fields.
 * The client-detail component parses this to populate profile, alert flags, etc.
 */
function buildQuestionnaire(
  draft: Record<string, unknown>,
  phoneAssignment?: { phoneNumber: string; carrier: string | null } | null,
): string {
  const q: Record<string, unknown> = {}

  // Phone info from device assignment
  if (phoneAssignment) {
    q.companyPhone = phoneAssignment.phoneNumber
    q.carrier = phoneAssignment.carrier
  }

  // Step 1 fields (ClientDraft schema field names)
  if (draft.dateOfBirth) q.dateOfBirth = draft.dateOfBirth
  if (draft.idNumber) q.idNumber = draft.idNumber
  if (draft.idExpiry) q.idExpiry = draft.idExpiry
  if (draft.gmailPassword) q.gmailPassword = draft.gmailPassword
  if (draft.assignedGmail) q.assignedGmail = draft.assignedGmail
  if (draft.livesAtDifferentAddress) q.livesAtDifferentAddress = draft.livesAtDifferentAddress
  if (draft.secondAddress) q.secondaryAddress = draft.secondAddress
  if (draft.currentAddress) q.currentAddress = draft.currentAddress

  // Step 2 fields (matching actual ClientDraft column names)
  if (draft.citizenship) q.citizenship = draft.citizenship
  if (draft.hasCriminalRecord) q.criminalRecord = draft.hasCriminalRecord
  if (draft.criminalRecordNotes) q.criminalRecordNotes = draft.criminalRecordNotes
  if (draft.debankedHistory) q.debankedHistory = draft.debankedHistory
  if (draft.debankedBank) q.debankedBank = draft.debankedBank
  if (draft.paypalPreviouslyUsed) q.paypalPreviouslyUsed = draft.paypalPreviouslyUsed
  if (draft.undisclosedInfo) q.undisclosedInfo = draft.undisclosedInfo
  if (draft.occupation) q.occupation = draft.occupation
  if (draft.annualIncome) q.incomeRange = draft.annualIncome
  if (draft.employmentStatus) q.employmentStatus = draft.employmentStatus
  if (draft.maritalStatus) q.maritalStatus = draft.maritalStatus
  if (draft.householdAwareness) q.householdAwareness = draft.householdAwareness
  if (draft.familyTechSupport) q.familyTechSupport = draft.familyTechSupport
  if (draft.financialAutonomy) q.financialAutonomy = draft.financialAutonomy
  if (draft.digitalComfort) q.digitalComfort = draft.digitalComfort
  if (draft.bankingHistory) q.bankingHistory = draft.bankingHistory
  if (draft.sportsbookHistory) q.sportsbookHistory = draft.sportsbookHistory
  if (draft.ssnNumber) q.ssnNumber = draft.ssnNumber
  if (draft.missingIdType) q.missingIdType = draft.missingIdType

  return JSON.stringify(q)
}

/**
 * Map platformData JSON from ClientDraft into ServerPlatformDetail array.
 */
function buildPlatformDetails(platformData: unknown): ServerPlatformDetail[] {
  if (!platformData || typeof platformData !== 'object') return []

  const details: ServerPlatformDetail[] = []
  const data = platformData as Record<string, PlatformDataEntry>

  // Map platform key names to PlatformType enum values
  const keyToType: Record<string, string> = {
    paypal: 'PAYPAL',
    onlineBanking: 'ONLINE_BANKING',
    edgeboost: 'EDGEBOOST',
    draftkings: 'DRAFTKINGS',
    fanduel: 'FANDUEL',
    betmgm: 'BETMGM',
    caesars: 'CAESARS',
    fanatics: 'FANATICS',
    ballybet: 'BALLYBET',
    betrivers: 'BETRIVERS',
    bet365: 'BET365',
  }

  for (const [key, entry] of Object.entries(data)) {
    if (!entry || typeof entry !== 'object') continue
    const platformType = keyToType[key] || key.toUpperCase()

    // Collect all screenshots
    const screenshots: string[] = []
    if (entry.screenshot) screenshots.push(entry.screenshot)
    if (entry.screenshot2) screenshots.push(entry.screenshot2)
    if (entry.screenshots) screenshots.push(...entry.screenshots)

    details.push({
      platformType,
      status: entry.status || 'NOT_STARTED',
      screenshots,
      username: entry.username || null,
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
    })
  }

  return details
}

/**
 * Extract platform abbreviations from platformData.
 */
function extractPlatformAbbreviations(platformData: unknown): string[] {
  if (!platformData || typeof platformData !== 'object') return []

  const abbrevMap: Record<string, string> = {
    draftkings: 'DK',
    fanduel: 'FD',
    betmgm: 'MGM',
    caesars: 'CZR',
    fanatics: 'FAN',
    ballybet: 'BB',
    betrivers: 'BR',
    bet365: '365',
    paypal: 'PP',
    onlineBanking: 'BANK',
    edgeboost: 'EB',
  }

  const data = platformData as Record<string, PlatformDataEntry>
  const abbrs: string[] = []

  for (const [key, entry] of Object.entries(data)) {
    if (!entry || typeof entry !== 'object') continue
    // Only include platforms that have some data (username or screenshot)
    if (entry.username || entry.screenshot || entry.screenshots?.length) {
      const abbr = abbrevMap[key]
      if (abbr) abbrs.push(abbr)
    }
  }

  return abbrs
}

export default async function ClientManagementServerPage() {
  let serverClients: ServerClientData[] = []
  let stats: ServerClientStats = { total: 0, active: 0, ended: 0, verificationNeeded: 0 }

  try {
    const dbClients = await getAllClients()

    // Fetch event logs for all clients in parallel
    const clientIds = dbClients.map((c) => c.id)
    const eventLogsMap = new Map<string, Awaited<ReturnType<typeof getClientEventLogs>>>()
    if (clientIds.length > 0) {
      const allEvents = await Promise.all(
        clientIds.map((id) => getClientEventLogs(id).catch(() => []))
      )
      clientIds.forEach((id, i) => {
        eventLogsMap.set(id, allEvents[i])
      })
    }

    serverClients = dbClients.map((c) => {
      const draft = c.fromDraft as Record<string, unknown> | null
      const platformData = draft?.platformData
      const platformDetails = buildPlatformDetails(platformData)
      const platforms = extractPlatformAbbreviations(platformData)
      const events = eventLogsMap.get(c.id) || []

      return {
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        phone: c.phone ?? (draft?.phone as string) ?? '',
        email: c.email ?? (draft?.email as string) ?? null,
        start: c.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        funds: c.bonusPool ? `$${c.bonusPool.totalAmount}` : '$0',
        totalPaid: c.bonusPool?.totalAmount ?? 0,
        platforms,
        activePlatforms: platforms, // All registered platforms considered active
        intakeStatus: c.status,
        agent: c.closer?.name ?? null,
        // Address from draft
        address: (draft?.address as string) ?? (draft?.currentAddress as string) ?? null,
        city: null, // Not stored separately in draft
        state: null,
        zipCode: null,
        country: null,
        // ID document from draft
        idDocument: (draft?.idDocument as string) ?? null,
        // Questionnaire built from draft fields
        questionnaire: draft ? buildQuestionnaire(draft, c._phoneAssignment) : null,
        // Platform details from draft's platformData JSON
        platformDetails,
        // Transactions (none in current schema — placeholder)
        transactions: [],
        // Event logs from EventLog table
        eventLogs: events.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          description: e.description,
          userName: e.user?.name ?? 'System',
          createdAt: e.createdAt.toISOString(),
        })),
      }
    })

    const activeCount = dbClients.filter((c) => c.status === 'APPROVED').length
    const endedCount = dbClients.filter((c) => c.status === 'CLOSED' || c.status === 'REJECTED').length
    const verificationCount = dbClients.filter((c) => c.status === 'PENDING').length

    stats = {
      total: dbClients.length,
      active: activeCount,
      ended: endedCount,
      verificationNeeded: verificationCount,
    }
  } catch (e) {
    console.error('[client-management] DB fetch error:', e)
  }

  return (
    <ClientManagementPage
      serverClients={serverClients}
      stats={stats}
    />
  )
}
