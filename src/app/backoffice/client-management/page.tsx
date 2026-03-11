import { ClientManagementPage } from './_components/client-management-page'
import { getAllApprovedRecords, getRecordEventLogs } from '@/backend/data/client-records'
import type { ServerClientData, ServerClientStats, ServerPlatformDetail } from './_components/types'
// Platform data from ClientRecord.platformData JSON — may have extra fields beyond PlatformEntry type
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
 * Build a questionnaire JSON string from ClientRecord fields.
 * The client-detail component parses this to populate profile, alert flags, etc.
 */
function buildQuestionnaire(
  record: Record<string, unknown>,
  phoneAssignment?: { phoneNumber: string; carrier: string | null } | null,
  agentZelle?: string | null,
): string {
  const q: Record<string, unknown> = {}

  // Phone info from device assignment
  if (phoneAssignment) {
    q.companyPhone = phoneAssignment.phoneNumber
    q.carrier = phoneAssignment.carrier
  }

  // Agent's zelle (from closer User record)
  if (agentZelle) q.zellePhone = agentZelle

  // Step 1 fields (ClientRecord schema field names)
  if (record.dateOfBirth) q.dateOfBirth = record.dateOfBirth
  if (record.idNumber) q.idNumber = record.idNumber
  if (record.idExpiry) q.idExpiry = record.idExpiry
  if (record.gmailPassword) q.gmailPassword = record.gmailPassword
  if (record.assignedGmail) q.assignedGmail = record.assignedGmail
  if (record.livesAtDifferentAddress) q.livesAtDifferentAddress = record.livesAtDifferentAddress
  if (record.address) q.address = record.address
  if (record.secondAddress) q.secondaryAddress = record.secondAddress
  if (record.currentAddress) q.currentAddress = record.currentAddress
  if (record.phone) q.phone = record.phone
  if (record.betmgmLogin) q.betmgmLogin = record.betmgmLogin
  if (record.betmgmPassword) q.betmgmPassword = record.betmgmPassword

  // Step 2 fields (matching actual ClientRecord column names)
  if (record.citizenship) q.citizenship = record.citizenship
  if (record.hasCriminalRecord) q.criminalRecord = record.hasCriminalRecord
  if (record.criminalRecordNotes) q.criminalRecordNotes = record.criminalRecordNotes
  if (record.debankedHistory) q.debankedHistory = record.debankedHistory
  if (record.debankedBank) q.debankedBank = record.debankedBank
  if (record.paypalPreviouslyUsed) q.paypalPreviouslyUsed = record.paypalPreviouslyUsed
  if (record.addressMismatch) q.addressMismatch = record.addressMismatch
  if (record.undisclosedInfo) q.undisclosedInfo = record.undisclosedInfo
  if (record.occupation) q.occupation = record.occupation
  if (record.annualIncome) q.incomeRange = record.annualIncome
  if (record.employmentStatus) q.employmentStatus = record.employmentStatus
  if (record.maritalStatus) q.maritalStatus = record.maritalStatus
  if (record.householdAwareness) q.householdAwareness = record.householdAwareness
  if (record.familyTechSupport) q.familyTechSupport = record.familyTechSupport
  if (record.financialAutonomy) q.financialAutonomy = record.financialAutonomy
  if (record.digitalComfort) q.digitalComfort = record.digitalComfort
  if (record.bankingHistory) q.bankingHistory = record.bankingHistory
  if (record.sportsbookHistory) q.sportsbookHistory = record.sportsbookHistory
  if (record.ssnNumber) q.ssnNumber = record.ssnNumber
  if (record.missingIdType) q.missingIdType = record.missingIdType
  if (record.paypalHistory) q.paypalHistory = record.paypalHistory

  return JSON.stringify(q)
}

/**
 * Map platformData JSON from ClientRecord into ServerPlatformDetail array.
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
      // Pass through bank/card fields for client detail display
      routingNumber: (entry as Record<string, unknown>).routingNumber as string || null,
      bankAccountNumber: (entry as Record<string, unknown>).bankAccountNumber as string || null,
      pin: (entry as Record<string, unknown>).pin as string || null,
      cardNumber: (entry as Record<string, unknown>).cardNumber as string || null,
      cvv: (entry as Record<string, unknown>).cvv as string || null,
      cardExpiry: (entry as Record<string, unknown>).cardExpiry as string || null,
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
    const dbRecords = await getAllApprovedRecords()

    // Fetch event logs for all records in parallel
    const recordIds = dbRecords.map((r) => r.id)
    const eventLogsMap = new Map<string, Awaited<ReturnType<typeof getRecordEventLogs>>>()
    if (recordIds.length > 0) {
      const allEvents = await Promise.all(
        recordIds.map((id) => getRecordEventLogs(id).catch(() => []))
      )
      recordIds.forEach((id, i) => {
        eventLogsMap.set(id, allEvents[i])
      })
    }

    serverClients = dbRecords.map((r) => {
      // Data is directly on the record — no fromDraft indirection
      const record = r as Record<string, unknown>
      const platformData = record.platformData
      const platformDetails = buildPlatformDetails(platformData)
      const platforms = extractPlatformAbbreviations(platformData)
      const events = eventLogsMap.get(r.id) || []

      return {
        id: r.id,
        name: `${r.firstName} ${r.lastName}`,
        phone: r.phone ?? '',
        email: r.email ?? null,
        start: r.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        funds: r.bonusPool ? `$${r.bonusPool.totalAmount}` : '$0',
        totalPaid: r.bonusPool?.totalAmount ?? 0,
        platforms,
        activePlatforms: platforms, // All registered platforms considered active
        intakeStatus: r.status,
        agent: r.closer?.name ?? null,
        // Address directly from the record
        address: r.address ?? r.currentAddress ?? null,
        city: null, // Not stored separately
        state: null,
        zipCode: null,
        country: null,
        // ID document from record
        idDocument: r.idDocument ?? null,
        // Questionnaire built from record fields
        questionnaire: buildQuestionnaire(record, r._phoneAssignment, r.closer?.zelle),
        // Platform details from record's platformData JSON
        platformDetails,
        // Generated credentials from record
        generatedCredentials: (record.generatedCredentials as Record<string, unknown>) ?? null,
        // Transactions from DB
        transactions: (r.transactions ?? []).map((t) => ({
          id: t.id,
          type: t.type,
          amount: Number(t.amount),
          description: t.description || '',
          date: t.createdAt.toISOString(),
          platformType: t.platformType || null,
        })),
        // Event logs from EventLog table
        eventLogs: events.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          description: e.description,
          userName: e.user?.name ?? 'System',
          createdAt: e.createdAt.toISOString(),
        })),
        // Operational account statuses (VIP, SEMI_LIMITED, etc.)
        accountStatuses: (record.accountStatuses as Record<string, string>) ?? null,
      }
    })

    // All records from getAllApprovedRecords are APPROVED
    stats = {
      total: dbRecords.length,
      active: dbRecords.length,
      ended: 0,
      verificationNeeded: 0,
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
