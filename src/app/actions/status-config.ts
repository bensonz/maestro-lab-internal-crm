'use server'

import prisma from '@/backend/prisma/client'
import { auth } from '@/backend/auth'
import { revalidatePath } from 'next/cache'
import { invalidateStatusConfigCache } from '@/backend/data/config'
import type { StatusOption } from '@/lib/account-status-config'

// Re-export types/constants from shared module (can't export non-functions from "use server")
import { STATUS_CONFIG_KEYS, type StatusConfigType } from '@/lib/status-config-keys'

/**
 * Save platform statuses to SystemConfig as JSON.
 * Admin-only. Validates that each status has value + label.
 */
export async function savePlatformStatuses(
  type: StatusConfigType,
  statuses: StatusOption[],
) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }
  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Admin access required' }
  }

  // Validate
  if (!statuses.length) {
    return { success: false, error: 'Must have at least one status' }
  }

  for (const s of statuses) {
    if (!s.value?.trim()) return { success: false, error: 'All statuses must have a value/key' }
    if (!s.label?.trim()) return { success: false, error: 'All statuses must have a label' }
  }

  // Check for duplicate values
  const values = statuses.map((s) => s.value)
  const uniqueValues = new Set(values)
  if (uniqueValues.size !== values.length) {
    return { success: false, error: 'Duplicate status values found' }
  }

  const userId = session.user.id
  const userExists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })
  if (!userExists) {
    return { success: false, error: 'Your session is stale. Please log out and log back in.' }
  }

  const key = STATUS_CONFIG_KEYS[type]
  const jsonValue = JSON.stringify(statuses)

  await prisma.systemConfig.upsert({
    where: { key },
    update: {
      value: jsonValue,
      category: 'Account Statuses',
      updatedById: userId,
    },
    create: {
      key,
      value: jsonValue,
      category: 'Account Statuses',
      updatedById: userId,
    },
  })

  // Audit log
  await prisma.eventLog.create({
    data: {
      eventType: 'USER_UPDATED',
      description: `Account statuses updated: ${type} (${statuses.length} statuses)`,
      userId,
      metadata: {
        action: 'status_config_update',
        type,
        statusCount: statuses.length,
        statusValues: statuses.map((s) => s.value),
      },
    },
  })

  invalidateStatusConfigCache()
  revalidatePath('/backoffice/rules-registry')
  revalidatePath('/backoffice/account-statuses')

  return { success: true }
}
