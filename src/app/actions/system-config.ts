'use server'

import prisma from '@/backend/prisma/client'
import { auth } from '@/backend/auth'
import { revalidatePath } from 'next/cache'
import { invalidateConfigCache } from '@/backend/data/config'
import { CONFIG_MAP } from '@/lib/config-defaults'

export async function updateSystemConfig(
  entries: { key: string; value: string }[],
) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }
  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Admin access required' }
  }

  // Validate all keys exist in registry
  for (const entry of entries) {
    const def = CONFIG_MAP.get(entry.key)
    if (!def) return { success: false, error: `Unknown config key: ${entry.key}` }

    const num = Number(entry.value)
    if (isNaN(num)) return { success: false, error: `${def.label} must be a number` }
    if (def.min !== undefined && num < def.min) {
      return { success: false, error: `${def.label} must be at least ${def.min}` }
    }
    if (def.max !== undefined && num > def.max) {
      return { success: false, error: `${def.label} must be at most ${def.max}` }
    }
  }

  // Verify the session user exists in the DB (handles stale sessions after re-seed)
  const userId = session.user!.id
  const userExists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })

  if (!userExists) {
    return {
      success: false,
      error: 'Your session is stale. Please log out and log back in.',
    }
  }

  // Upsert all entries in a transaction
  await prisma.$transaction(
    entries.map((entry) => {
      const def = CONFIG_MAP.get(entry.key)!
      return prisma.systemConfig.upsert({
        where: { key: entry.key },
        update: {
          value: entry.value,
          category: def.category,
          updatedById: userId,
        },
        create: {
          key: entry.key,
          value: entry.value,
          category: def.category,
          updatedById: userId,
        },
      })
    }),
  )

  // Audit log
  await prisma.eventLog.create({
    data: {
      eventType: 'USER_UPDATED',
      description: `System config updated: ${entries.map((e) => e.key).join(', ')}`,
      userId,
      metadata: {
        configChanges: entries,
        action: 'system_config_update',
      },
    },
  })

  invalidateConfigCache()
  revalidatePath('/backoffice/rules-registry')

  return { success: true }
}
