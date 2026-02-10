import prisma from '@/backend/prisma/client'

export async function getPartnerProfitReport(options?: {
  dateFrom?: Date
  dateTo?: Date
  partnerId?: string
}) {
  const where: Record<string, unknown> = {}
  if (options?.partnerId) where.partnerId = options.partnerId
  if (options?.dateFrom || options?.dateTo) {
    where.createdAt = {}
    if (options?.dateFrom)
      (where.createdAt as Record<string, unknown>).gte = options.dateFrom
    if (options?.dateTo)
      (where.createdAt as Record<string, unknown>).lte = options.dateTo
  }

  const details = await prisma.profitShareDetail.findMany({
    where,
    include: {
      partner: { select: { id: true, name: true, type: true } },
      rule: {
        select: {
          name: true,
          splitType: true,
          partnerPercent: true,
          companyPercent: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const byPartner = new Map<
    string,
    {
      partnerId: string
      partnerName: string
      partnerType: string
      grossTotal: number
      feeTotal: number
      partnerTotal: number
      companyTotal: number
      transactionCount: number
      pendingAmount: number
      paidAmount: number
    }
  >()

  for (const d of details) {
    const existing = byPartner.get(d.partnerId) ?? {
      partnerId: d.partnerId,
      partnerName: d.partner.name,
      partnerType: d.partner.type,
      grossTotal: 0,
      feeTotal: 0,
      partnerTotal: 0,
      companyTotal: 0,
      transactionCount: 0,
      pendingAmount: 0,
      paidAmount: 0,
    }
    existing.grossTotal += Number(d.grossAmount)
    existing.feeTotal += Number(d.feeAmount)
    existing.partnerTotal += Number(d.partnerAmount)
    existing.companyTotal += Number(d.companyAmount)
    existing.transactionCount++
    if (d.status === 'pending') existing.pendingAmount += Number(d.partnerAmount)
    if (d.status === 'paid') existing.paidAmount += Number(d.partnerAmount)
    byPartner.set(d.partnerId, existing)
  }

  return {
    details,
    byPartner: [...byPartner.values()],
    totals: {
      gross: details.reduce((s, d) => s + Number(d.grossAmount), 0),
      fees: details.reduce((s, d) => s + Number(d.feeAmount), 0),
      partnerShare: details.reduce((s, d) => s + Number(d.partnerAmount), 0),
      companyShare: details.reduce((s, d) => s + Number(d.companyAmount), 0),
      count: details.length,
    },
  }
}

export async function getAgentCommissionReport(options?: {
  dateFrom?: Date
  dateTo?: Date
  agentId?: string
}) {
  const where: Record<string, unknown> = {}
  if (options?.agentId) where.agentId = options.agentId
  if (options?.dateFrom || options?.dateTo) {
    where.createdAt = {}
    if (options?.dateFrom)
      (where.createdAt as Record<string, unknown>).gte = options.dateFrom
    if (options?.dateTo)
      (where.createdAt as Record<string, unknown>).lte = options.dateTo
  }

  const allocations = await prisma.bonusAllocation.findMany({
    where,
    include: {
      agent: { select: { id: true, name: true, starLevel: true, tier: true } },
      bonusPool: {
        include: {
          client: { select: { firstName: true, lastName: true } },
          closer: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const byAgent = new Map<
    string,
    {
      agentId: string
      agentName: string
      starLevel: number
      tier: string
      directTotal: number
      starSliceTotal: number
      backfillTotal: number
      overrideTotal: number
      totalEarned: number
      pendingAmount: number
      paidAmount: number
      poolCount: number
    }
  >()

  for (const a of allocations) {
    const existing = byAgent.get(a.agentId) ?? {
      agentId: a.agentId,
      agentName: a.agent.name,
      starLevel: a.agent.starLevel,
      tier: a.agent.tier,
      directTotal: 0,
      starSliceTotal: 0,
      backfillTotal: 0,
      overrideTotal: 0,
      totalEarned: 0,
      pendingAmount: 0,
      paidAmount: 0,
      poolCount: 0,
    }
    const amount = Number(a.amount)
    existing.totalEarned += amount
    if (a.type === 'direct') existing.directTotal += amount
    if (a.type === 'star_slice') existing.starSliceTotal += amount
    if (a.type === 'backfill') existing.backfillTotal += amount
    if (a.bonusPool.closerId !== a.agentId) existing.overrideTotal += amount
    if (a.status === 'pending') existing.pendingAmount += amount
    if (a.status === 'paid') existing.paidAmount += amount
    existing.poolCount++
    byAgent.set(a.agentId, existing)
  }

  return {
    allocations,
    byAgent: [...byAgent.values()].sort((a, b) => b.totalEarned - a.totalEarned),
    totals: {
      totalEarned: allocations.reduce((s, a) => s + Number(a.amount), 0),
      totalDirect: allocations
        .filter((a) => a.type === 'direct')
        .reduce((s, a) => s + Number(a.amount), 0),
      totalOverride: allocations
        .filter((a) => a.bonusPool.closerId !== a.agentId)
        .reduce((s, a) => s + Number(a.amount), 0),
      totalPending: allocations
        .filter((a) => a.status === 'pending')
        .reduce((s, a) => s + Number(a.amount), 0),
      count: allocations.length,
    },
  }
}

export async function getClientLTVReport(options?: {
  dateFrom?: Date
  dateTo?: Date
}) {
  const where: Record<string, unknown> = { intakeStatus: 'APPROVED' }
  if (options?.dateFrom || options?.dateTo) {
    where.createdAt = {}
    if (options?.dateFrom)
      (where.createdAt as Record<string, unknown>).gte = options.dateFrom
    if (options?.dateTo)
      (where.createdAt as Record<string, unknown>).lte = options.dateTo
  }

  const clients = await prisma.client.findMany({
    where,
    include: {
      agent: { select: { name: true } },
      partner: { select: { name: true } },
      fundMovementsFrom: { select: { amount: true, createdAt: true } },
      fundMovementsTo: { select: { amount: true, createdAt: true } },
      bonusPool: {
        select: {
          totalAmount: true,
          directAmount: true,
          starPoolAmount: true,
          distributedSlices: true,
          recycledSlices: true,
          allocations: { select: { amount: true, status: true } },
        },
      },
      earnings: { select: { amount: true, status: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const clientLTVs = clients.map((client) => {
    const totalDeposited = client.fundMovementsTo.reduce(
      (s, m) => s + Number(m.amount),
      0,
    )
    const totalWithdrawn = client.fundMovementsFrom.reduce(
      (s, m) => s + Number(m.amount),
      0,
    )
    const netFlow = totalDeposited - totalWithdrawn

    const commissionCost = client.bonusPool
      ? client.bonusPool.allocations.reduce((s, a) => s + Number(a.amount), 0)
      : 0

    const earningsTotal = client.earnings.reduce(
      (s, e) => s + Number(e.amount),
      0,
    )

    const ltv = netFlow - commissionCost

    const daysSinceCreated = Math.floor(
      (Date.now() - client.createdAt.getTime()) / 86400_000,
    )

    return {
      clientId: client.id,
      clientName: `${client.firstName} ${client.lastName}`,
      agentName: client.agent.name,
      partnerName: client.partner?.name ?? null,
      createdAt: client.createdAt,
      daysSinceCreated,
      totalDeposited,
      totalWithdrawn,
      netFlow,
      commissionCost,
      earningsTotal,
      ltv,
      monthlyLTV: daysSinceCreated > 0 ? (ltv / daysSinceCreated) * 30 : 0,
    }
  })

  clientLTVs.sort((a, b) => b.ltv - a.ltv)

  return {
    clients: clientLTVs,
    totals: {
      totalLTV: clientLTVs.reduce((s, c) => s + c.ltv, 0),
      avgLTV:
        clientLTVs.length > 0
          ? clientLTVs.reduce((s, c) => s + c.ltv, 0) / clientLTVs.length
          : 0,
      totalDeposited: clientLTVs.reduce((s, c) => s + c.totalDeposited, 0),
      totalWithdrawn: clientLTVs.reduce((s, c) => s + c.totalWithdrawn, 0),
      totalCommissionCost: clientLTVs.reduce(
        (s, c) => s + c.commissionCost,
        0,
      ),
      clientCount: clientLTVs.length,
    },
  }
}
