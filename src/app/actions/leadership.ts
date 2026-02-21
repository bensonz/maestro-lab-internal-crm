'use server'

import prisma from '@/backend/prisma/client'
import { auth } from '@/backend/auth'
import { revalidatePath } from 'next/cache'
import {
  checkLeadershipEligibility,
  promoteToLeadership,
} from '@/backend/services/leadership'
import { calculateQuarterlySettlement } from '@/backend/services/quarterly-settlement'

export async function checkAndPromoteLeadership(
  agentId: string,
  tier: 'ED' | 'SED' | 'MD' | 'CMO',
) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = (session.user as { role: string }).role
  if (role !== 'ADMIN') {
    return { success: false, error: 'Not authorized' }
  }

  const eligibility = await checkLeadershipEligibility(agentId, tier)
  if (!eligibility.eligible) {
    return { success: false, error: eligibility.reason, eligibility }
  }

  const result = await promoteToLeadership(agentId, tier)

  revalidatePath('/backoffice/agent-management')
  revalidatePath('/agent/earnings')

  return { ...result, eligibility }
}

export async function generateQuarterlySettlement(
  leaderId: string,
  year: number,
  quarter: number,
) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = (session.user as { role: string }).role
  if (!['ADMIN', 'FINANCE'].includes(role)) {
    return { success: false, error: 'Not authorized' }
  }

  if (quarter < 1 || quarter > 4) {
    return { success: false, error: 'Quarter must be 1-4' }
  }

  const result = await calculateQuarterlySettlement(leaderId, year, quarter)

  revalidatePath('/backoffice/commissions')
  revalidatePath('/backoffice/profit-sharing')

  return result
}

export async function approveSettlement(settlementId: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = (session.user as { role: string }).role
  if (role !== 'ADMIN') {
    return { success: false, error: 'Not authorized' }
  }

  const settlement = await prisma.quarterlySettlement.findUnique({
    where: { id: settlementId },
  })

  if (!settlement) return { success: false, error: 'Settlement not found' }
  if (settlement.status !== 'DRAFT') {
    return { success: false, error: 'Settlement is not in DRAFT status' }
  }

  await prisma.quarterlySettlement.update({
    where: { id: settlementId },
    data: { status: 'APPROVED' },
  })

  revalidatePath('/backoffice/commissions')
  return { success: true }
}

export async function markSettlementPaid(settlementId: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = (session.user as { role: string }).role
  if (!['ADMIN', 'FINANCE'].includes(role)) {
    return { success: false, error: 'Not authorized' }
  }

  const settlement = await prisma.quarterlySettlement.findUnique({
    where: { id: settlementId },
  })

  if (!settlement) return { success: false, error: 'Settlement not found' }
  if (settlement.status !== 'APPROVED') {
    return { success: false, error: 'Settlement must be APPROVED before marking as PAID' }
  }

  await prisma.quarterlySettlement.update({
    where: { id: settlementId },
    data: { status: 'PAID' },
  })

  revalidatePath('/backoffice/commissions')
  return { success: true }
}
