import prisma from '@/backend/prisma/client'

// ── Types for the fund-allocation page ───────────────────

export interface FundClient {
  id: string
  name: string
}

export interface FundMovement {
  id: string
  type: string
  flowType: string
  fromClientName: string
  toClientName: string
  fromPlatform: string
  toPlatform: string
  amount: number
  fee: number | null
  method: string | null
  status: string
  recordedByName: string
  createdAt: string
}

export interface FundStats {
  externalTotal: number
  internalDeposits: number
  pendingCount: number
}

// ── Queries ──────────────────────────────────────────────

/**
 * Fetch approved clients for the fund allocation form dropdowns.
 */
export async function getFundClients(): Promise<FundClient[]> {
  const clients = await prisma.clientRecord.findMany({
    where: { status: 'APPROVED' },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: 'asc' },
  })

  return clients.map((c) => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName}`,
  }))
}

/**
 * Fetch recent fund movements from EventLog (FUND_ALLOCATED events).
 * Maps metadata back to the FundMovement view model.
 */
export async function getRecentFundMovements(
  limit = 100,
): Promise<FundMovement[]> {
  const events = await prisma.eventLog.findMany({
    where: { eventType: 'FUND_ALLOCATED' },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  // Collect all client IDs from metadata for name resolution
  const clientIds = new Set<string>()
  for (const event of events) {
    const meta = (event.metadata as Record<string, unknown>) || {}
    if (meta.clientId) clientIds.add(meta.clientId as string)
  }

  // Batch-fetch client names
  const clientNameMap = new Map<string, string>()
  if (clientIds.size > 0) {
    const clients = await prisma.clientRecord.findMany({
      where: { id: { in: [...clientIds] } },
      select: { id: true, firstName: true, lastName: true },
    })
    for (const c of clients) {
      clientNameMap.set(c.id, `${c.firstName} ${c.lastName}`)
    }
  }

  return events.map((event) => {
    const meta = (event.metadata as Record<string, unknown>) || {}

    // Handle both metadata formats:
    // 1. Rich format from recordFundMovement: { clientId, type, flowType, fromPlatform, toPlatform, amount, method, fee }
    // 2. Simple format from recordFundAllocation (action hub): { allocationId, platform, amount, direction, notes }
    const isRichFormat = !!meta.fromPlatform

    const fromClientName = meta.clientId
      ? clientNameMap.get(meta.clientId as string) || 'Unknown'
      : ''

    return {
      id: event.id,
      type: isRichFormat
        ? (meta.type as string) || 'internal'
        : (meta.direction as string) === 'withdrawal'
          ? 'external'
          : 'internal',
      flowType: isRichFormat
        ? (meta.flowType as string) || 'same_client'
        : 'same_client',
      fromClientName,
      toClientName: fromClientName, // same unless cross-client (future enhancement)
      fromPlatform: isRichFormat
        ? (meta.fromPlatform as string) || ''
        : (meta.platform as string) || '',
      toPlatform: isRichFormat
        ? (meta.toPlatform as string) || ''
        : (meta.platform as string) || '',
      amount: Number(meta.amount) || 0,
      fee: meta.fee ? Number(meta.fee) : null,
      method: (meta.method as string) || null,
      status: 'completed',
      recordedByName: event.user?.name || 'System',
      createdAt: event.createdAt.toISOString(),
    }
  })
}

/**
 * Calculate fund allocation stats for the period summary cards.
 */
export async function getFundStats(): Promise<FundStats> {
  const events = await prisma.eventLog.findMany({
    where: { eventType: 'FUND_ALLOCATED' },
    select: { metadata: true },
  })

  let externalTotal = 0
  let internalDeposits = 0

  for (const event of events) {
    const meta = (event.metadata as Record<string, unknown>) || {}
    const amount = Number(meta.amount) || 0
    const isRichFormat = !!meta.fromPlatform

    if (isRichFormat) {
      const type = (meta.type as string) || 'internal'
      if (type === 'external') {
        externalTotal += amount
      } else {
        internalDeposits += amount
      }
    } else {
      const direction = (meta.direction as string) || ''
      if (direction === 'WITHDRAWAL') {
        externalTotal += amount
      } else {
        internalDeposits += amount
      }
    }
  }

  return {
    externalTotal,
    internalDeposits,
    pendingCount: 0, // All recorded movements are immediately completed
  }
}
