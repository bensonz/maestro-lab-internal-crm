import prisma from '@/backend/prisma/client'

/**
 * Calculate profit share for a transaction based on applicable rules.
 * Finds the highest-priority active rule for the partner that matches
 * the transaction type and amount.
 */
export async function calculateProfitShare(params: {
  partnerId: string
  grossAmount: number
  transactionType: string // "deposits" | "withdrawals" | "commissions"
  platformType?: string
  transactionId?: string
  fundMovementId?: string
}) {
  // 1. Find applicable rules for this partner
  const rules = await prisma.profitShareRule.findMany({
    where: {
      partnerId: params.partnerId,
      status: 'active',
      AND: [
        {
          effectiveFrom: { lte: new Date() },
        },
        {
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: new Date() } },
          ],
        },
        {
          OR: [
            { appliesTo: 'all' },
            { appliesTo: params.transactionType },
          ],
        },
      ],
    },
    orderBy: { priority: 'desc' },
  })

  if (rules.length === 0) return null

  // 2. Pick highest priority rule
  const rule = rules[0]

  // 3. Check min/max amount
  if (rule.minAmount && params.grossAmount < Number(rule.minAmount)) return null
  if (rule.maxAmount && params.grossAmount > Number(rule.maxAmount)) return null

  // 4. Check platform filter
  if (
    rule.platformType &&
    params.platformType &&
    rule.platformType !== params.platformType
  )
    return null

  // 5. Calculate
  const feeAmount = calculateFee(params.grossAmount, rule)
  const netAmount = params.grossAmount - feeAmount

  let partnerAmount: number
  let companyAmount: number

  if (rule.splitType === 'fixed') {
    partnerAmount = Number(rule.fixedAmount ?? 0)
    companyAmount = netAmount - partnerAmount
  } else {
    // percentage (default)
    partnerAmount = (netAmount * Number(rule.partnerPercent ?? 0)) / 100
    companyAmount = (netAmount * Number(rule.companyPercent ?? 0)) / 100
  }

  // Round to 2 decimals
  partnerAmount = Math.round(partnerAmount * 100) / 100
  companyAmount = Math.round(companyAmount * 100) / 100

  // 6. Record
  const detail = await prisma.profitShareDetail.create({
    data: {
      partnerId: params.partnerId,
      ruleId: rule.id,
      transactionId: params.transactionId,
      fundMovementId: params.fundMovementId,
      grossAmount: params.grossAmount,
      feeAmount,
      netAmount,
      partnerAmount,
      companyAmount,
    },
  })

  return detail
}

function calculateFee(
  grossAmount: number,
  rule: { feePercent: unknown; feeFixed: unknown },
): number {
  let fee = 0
  if (rule.feeFixed) fee += Number(rule.feeFixed)
  if (rule.feePercent) fee += (grossAmount * Number(rule.feePercent)) / 100
  return Math.round(fee * 100) / 100
}

/**
 * Get profit share summary for a partner.
 */
export async function getPartnerProfitSummary(partnerId: string) {
  const details = await prisma.profitShareDetail.findMany({
    where: { partnerId },
    include: { rule: { select: { name: true, splitType: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const totalPartnerAmount = details.reduce(
    (sum, d) => sum + Number(d.partnerAmount),
    0,
  )
  const totalCompanyAmount = details.reduce(
    (sum, d) => sum + Number(d.companyAmount),
    0,
  )
  const totalFees = details.reduce((sum, d) => sum + Number(d.feeAmount), 0)
  const pendingAmount = details
    .filter((d) => d.status === 'pending')
    .reduce((sum, d) => sum + Number(d.partnerAmount), 0)
  const paidAmount = details
    .filter((d) => d.status === 'paid')
    .reduce((sum, d) => sum + Number(d.partnerAmount), 0)

  return {
    details,
    totalPartnerAmount,
    totalCompanyAmount,
    totalFees,
    pendingAmount,
    paidAmount,
    transactionCount: details.length,
  }
}
