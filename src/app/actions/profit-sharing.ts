'use server'

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { UserRole } from '@/types'
import { revalidatePath } from 'next/cache'

const ALLOWED_ROLES: string[] = [UserRole.ADMIN, UserRole.BACKOFFICE]

export async function createProfitShareRule(data: {
  partnerId: string
  name: string
  description?: string
  splitType?: string
  partnerPercent?: number
  companyPercent?: number
  fixedAmount?: number
  appliesTo?: string
  platformType?: string
  minAmount?: number
  maxAmount?: number
  feePercent?: number
  feeFixed?: number
  effectiveFrom?: string
  effectiveTo?: string
  priority?: number
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  if (!data.name?.trim()) {
    return { success: false, error: 'Rule name is required' }
  }

  if (!data.partnerId) {
    return { success: false, error: 'Partner is required' }
  }

  // Validate percentages sum to ≤ 100
  if (
    data.splitType !== 'fixed' &&
    data.partnerPercent != null &&
    data.companyPercent != null &&
    data.partnerPercent + data.companyPercent > 100
  ) {
    return {
      success: false,
      error: 'Partner % + Company % cannot exceed 100%',
    }
  }

  await prisma.profitShareRule.create({
    data: {
      partnerId: data.partnerId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      splitType: data.splitType || 'percentage',
      partnerPercent: data.partnerPercent ?? null,
      companyPercent: data.companyPercent ?? null,
      fixedAmount: data.fixedAmount ?? null,
      appliesTo: data.appliesTo || 'all',
      platformType: data.platformType
        ? (data.platformType as never)
        : null,
      minAmount: data.minAmount ?? null,
      maxAmount: data.maxAmount ?? null,
      feePercent: data.feePercent ?? null,
      feeFixed: data.feeFixed ?? null,
      effectiveFrom: data.effectiveFrom
        ? new Date(data.effectiveFrom)
        : new Date(),
      effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
      priority: data.priority ?? 0,
    },
  })

  revalidatePath('/backoffice/profit-sharing')
  return { success: true }
}

export async function updateProfitShareRule(
  ruleId: string,
  data: {
    name?: string
    description?: string
    splitType?: string
    partnerPercent?: number
    companyPercent?: number
    fixedAmount?: number
    appliesTo?: string
    platformType?: string | null
    minAmount?: number | null
    maxAmount?: number | null
    feePercent?: number | null
    feeFixed?: number | null
    effectiveFrom?: string
    effectiveTo?: string | null
    priority?: number
    status?: string
  },
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  if (!ruleId) {
    return { success: false, error: 'Rule ID is required' }
  }

  await prisma.profitShareRule.update({
    where: { id: ruleId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.description !== undefined && {
        description: data.description?.trim() || null,
      }),
      ...(data.splitType !== undefined && { splitType: data.splitType }),
      ...(data.partnerPercent !== undefined && {
        partnerPercent: data.partnerPercent,
      }),
      ...(data.companyPercent !== undefined && {
        companyPercent: data.companyPercent,
      }),
      ...(data.fixedAmount !== undefined && {
        fixedAmount: data.fixedAmount,
      }),
      ...(data.appliesTo !== undefined && { appliesTo: data.appliesTo }),
      ...(data.platformType !== undefined && {
        platformType: data.platformType
          ? (data.platformType as never)
          : null,
      }),
      ...(data.minAmount !== undefined && { minAmount: data.minAmount }),
      ...(data.maxAmount !== undefined && { maxAmount: data.maxAmount }),
      ...(data.feePercent !== undefined && { feePercent: data.feePercent }),
      ...(data.feeFixed !== undefined && { feeFixed: data.feeFixed }),
      ...(data.effectiveFrom !== undefined && {
        effectiveFrom: new Date(data.effectiveFrom),
      }),
      ...(data.effectiveTo !== undefined && {
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
      }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.status !== undefined && { status: data.status }),
    },
  })

  revalidatePath('/backoffice/profit-sharing')
  return { success: true }
}

export async function deactivateRule(
  ruleId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  if (!ruleId) {
    return { success: false, error: 'Rule ID is required' }
  }

  await prisma.profitShareRule.update({
    where: { id: ruleId },
    data: { status: 'inactive' },
  })

  revalidatePath('/backoffice/profit-sharing')
  return { success: true }
}

export async function markProfitSharePaid(
  detailId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  if (!detailId) {
    return { success: false, error: 'Detail ID is required' }
  }

  await prisma.profitShareDetail.update({
    where: { id: detailId },
    data: { status: 'paid', paidAt: new Date() },
  })

  revalidatePath('/backoffice/profit-sharing')
  return { success: true }
}

export async function bulkMarkProfitSharePaid(
  detailIds: string[],
): Promise<{ success: boolean; updated: number; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, updated: 0, error: 'Not authenticated' }
  }

  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return { success: false, updated: 0, error: 'Insufficient permissions' }
  }

  if (!detailIds.length) {
    return { success: false, updated: 0, error: 'No details selected' }
  }

  const result = await prisma.profitShareDetail.updateMany({
    where: { id: { in: detailIds }, status: 'pending' },
    data: { status: 'paid', paidAt: new Date() },
  })

  revalidatePath('/backoffice/profit-sharing')
  return { success: true, updated: result.count }
}
