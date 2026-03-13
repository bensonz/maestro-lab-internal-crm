/**
 * Server-only async status config loaders.
 * DB is the single source of truth — auto-seeds hardcoded defaults on first access.
 * Each platform (9 sportsbooks + 3 financial) has its own status dictionary
 * AND its own detail config (limited subtypes, active details).
 * Separated from `@/lib/account-status-config` to avoid bundling `pg` into client code.
 */

import {
  getStatusConfigFromDB,
  getAllStatusConfigs,
  getDetailConfigFromDB,
  getAllDetailConfigs,
} from '@/backend/data/config'
import {
  STATUS_CONFIG_KEYS,
  DETAIL_CONFIG_KEYS,
  type PlatformDetailConfig,
} from '@/lib/status-config-keys'
import type { StatusOption } from '@/lib/account-status-config'
import type { LimitedConfig, ActiveDetailConfig } from '@/lib/account-status-config'

/**
 * Get status options for a platform from DB (auto-seeds defaults if needed).
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
  const result: Record<string, StatusOption[]> = {}
  for (const [platform, dbKey] of Object.entries(STATUS_CONFIG_KEYS)) {
    result[platform] = allConfigs[dbKey] ?? []
  }
  return result
}

/**
 * Get the limited config for a platform from DB (async, DB-aware).
 */
export async function getLimitedConfigAsync(platform: string): Promise<LimitedConfig> {
  const dbKey = DETAIL_CONFIG_KEYS[platform as keyof typeof DETAIL_CONFIG_KEYS]
  if (!dbKey) return { type: 'none' }
  const detail = await getDetailConfigFromDB(dbKey)
  return {
    type: detail.limitedType,
    options: detail.limitedOptions,
    sports: detail.limitedSports,
  }
}

/**
 * Get the active detail config for a platform from DB (async, DB-aware).
 */
export async function getActiveDetailConfigAsync(platform: string): Promise<ActiveDetailConfig | null> {
  const dbKey = DETAIL_CONFIG_KEYS[platform as keyof typeof DETAIL_CONFIG_KEYS]
  if (!dbKey) return null
  const detail = await getDetailConfigFromDB(dbKey)
  if (!detail.activeDetailOptions?.length) return null
  return {
    options: detail.activeDetailOptions,
    label: detail.activeDetailLabel ?? '',
  }
}

/**
 * Load all detail configs for passing to client components.
 * Returns a record keyed by platform name (e.g. DRAFTKINGS → PlatformDetailConfig).
 */
export async function loadAllDetailConfigs(): Promise<Record<string, PlatformDetailConfig>> {
  const allConfigs = await getAllDetailConfigs()
  const result: Record<string, PlatformDetailConfig> = {}
  for (const [platform, dbKey] of Object.entries(DETAIL_CONFIG_KEYS)) {
    result[platform] = allConfigs[dbKey] ?? { limitedType: 'none' }
  }
  return result
}
