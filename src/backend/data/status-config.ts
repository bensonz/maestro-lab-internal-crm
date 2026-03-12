/**
 * Server-only async status config loaders.
 * DB is the single source of truth — auto-seeds hardcoded defaults on first access.
 * Each platform (9 sportsbooks + 3 financial) has its own status dictionary.
 * Separated from `@/lib/account-status-config` to avoid bundling `pg` into client code.
 */

import { getStatusConfigFromDB, getAllStatusConfigs } from '@/backend/data/config'
import { STATUS_CONFIG_KEYS } from '@/lib/status-config-keys'
import type { StatusOption } from '@/lib/account-status-config'

/**
 * Get status options for a platform from DB (auto-seeds defaults if needed).
 * Platform name (e.g. 'DRAFTKINGS') maps directly to DB key (e.g. 'STATUSES_DRAFTKINGS').
 */
export async function getStatusOptionsForPlatformAsync(platform: string): Promise<StatusOption[]> {
  const dbKey = STATUS_CONFIG_KEYS[platform as keyof typeof STATUS_CONFIG_KEYS]
  if (!dbKey) return []
  return getStatusConfigFromDB(dbKey)
}

/** Async validation — checks DB statuses */
export async function isValidStatusForPlatformAsync(platform: string, status: string): Promise<boolean> {
  const options = await getStatusOptionsForPlatformAsync(platform)
  return options.some((s) => s.value === status)
}

/**
 * Load all status configs for passing to client components.
 * Returns a record keyed by platform name (e.g. DRAFTKINGS → StatusOption[]).
 */
export async function loadAllStatusConfigs(): Promise<Record<string, StatusOption[]>> {
  const allConfigs = await getAllStatusConfigs()

  // Convert from DB keys (STATUSES_DRAFTKINGS) to platform names (DRAFTKINGS)
  const result: Record<string, StatusOption[]> = {}
  for (const [platform, dbKey] of Object.entries(STATUS_CONFIG_KEYS)) {
    result[platform] = allConfigs[dbKey] ?? []
  }
  return result
}
