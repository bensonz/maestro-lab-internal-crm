import prisma from '@/backend/prisma/client'
import { ALL_PLATFORMS, PLATFORM_INFO } from '@/lib/platforms'
import type { PlatformType } from '@/types'
import type {
  AccountStatusesData,
  AccountStatusRow,
  AccountStatusesSummary,
  PlatformStatusEntry,
} from '@/types/backend-types'

/**
 * Normalise a raw accountStatuses value (old string or new object) to PlatformStatusEntry | null.
 */
function normalizeEntry(raw: unknown): PlatformStatusEntry | null {
  if (!raw) return null
  if (typeof raw === 'string') return { status: raw }
  if (typeof raw === 'object') return raw as PlatformStatusEntry
  return null
}

/**
 * Map platformData JSON key names to PlatformType enum values.
 */
const PLATFORM_DATA_KEYS: Record<string, PlatformType> = {
  draftkings: 'DRAFTKINGS',
  fanduel: 'FANDUEL',
  betmgm: 'BETMGM',
  caesars: 'CAESARS',
  fanatics: 'FANATICS',
  ballybet: 'BALLYBET',
  betrivers: 'BETRIVERS',
  espnbet: 'ESPNBET',
  bet365: 'BET365',
  paypal: 'PAYPAL',
  onlineBanking: 'BANK',
  edgeboost: 'EDGEBOOST',
}

export async function getAccountStatusesData(): Promise<AccountStatusesData> {
  // Parallel: approved clients + latest balance per client×platform
  const [clients, latestSnapshots] = await Promise.all([
    prisma.clientRecord.findMany({
      where: { status: 'APPROVED' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        accountStatuses: true,
        platformData: true,
      },
      orderBy: { firstName: 'asc' },
    }),
    // Get the most recent balance snapshot per client×platform
    prisma.$queryRaw<
      { clientRecordId: string; platform: string; balance: string }[]
    >`
      SELECT DISTINCT ON ("clientRecordId", "platform")
        "clientRecordId", "platform", "balance"::text
      FROM "BalanceSnapshot"
      ORDER BY "clientRecordId", "platform", "date" DESC
    `.catch(() => [] as { clientRecordId: string; platform: string; balance: string }[]),
  ])

  // Build balance lookup: "clientId:platform" → number
  const balanceMap = new Map<string, number>()
  for (const snap of latestSnapshots) {
    balanceMap.set(`${snap.clientRecordId}:${snap.platform}`, Number(snap.balance))
  }

  // Build rows
  const rows: AccountStatusRow[] = clients.map((client) => {
    const rawStatuses = (client.accountStatuses as Record<string, unknown>) ?? {}
    const pd = client.platformData as Record<string, unknown> | null

    // Determine registered platforms from platformData
    const registeredPlatforms: string[] = []
    if (pd) {
      for (const [key, platformType] of Object.entries(PLATFORM_DATA_KEYS)) {
        const entry = pd[key]
        if (entry && typeof entry === 'object') {
          const obj = entry as Record<string, unknown>
          if (obj.username || obj.screenshot || obj.screenshots) {
            registeredPlatforms.push(platformType)
          }
        }
      }
    }

    // Build statuses & balances for all 12 platforms
    const platformStatuses: Record<string, PlatformStatusEntry | null> = {}
    const platformBalances: Record<string, number | null> = {}

    for (const pt of ALL_PLATFORMS) {
      platformStatuses[pt] = normalizeEntry(rawStatuses[pt])
      platformBalances[pt] = balanceMap.get(`${client.id}:${pt}`) ?? null
    }

    return {
      clientRecordId: client.id,
      clientName: `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim(),
      platformStatuses,
      platformBalances,
      registeredPlatforms,
    }
  })

  // Summary stats
  const summary = computeSummary(rows)

  return { rows, summary }
}

function computeSummary(rows: AccountStatusRow[]): AccountStatusesSummary {
  const statusCounts: Record<string, number> = {}
  let totalAccounts = 0

  for (const row of rows) {
    for (const pt of row.registeredPlatforms) {
      totalAccounts++
      const entry = row.platformStatuses[pt]
      const status = entry?.status ?? '(none)'
      statusCounts[status] = (statusCounts[status] ?? 0) + 1
    }
  }

  return {
    totalClients: rows.length,
    totalAccounts,
    statusCounts,
  }
}
