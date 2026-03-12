import prisma from '@/backend/prisma/client'
import type { StatusOption } from '@/lib/account-status-config'
import {
  SPORTSBOOK_STATUSES,
  BANK_STATUSES,
  EDGEBOOST_STATUSES,
  PAYPAL_STATUSES,
  PLATFORM_LIMITED_CONFIG,
  PLATFORM_ACTIVE_DETAIL,
} from '@/lib/account-status-config'
import {
  ALL_STATUS_DB_KEYS,
  ALL_DETAIL_DB_KEYS,
  DETAIL_CONFIG_KEYS,
  type PlatformDetailConfig,
} from '@/lib/status-config-keys'

const CACHE_TTL_MS = 60_000 // 60 seconds

let cachedConfigs: Map<string, string> | null = null
let cacheTimestamp = 0

// Separate cache for status configs (also 60s TTL)
let cachedStatusConfigs: Map<string, StatusOption[]> | null = null
let statusCacheTimestamp = 0

// Cache for detail configs (also 60s TTL)
let cachedDetailConfigs: Map<string, PlatformDetailConfig> | null = null
let detailCacheTimestamp = 0

async function loadConfigs(): Promise<Map<string, string>> {
  const now = Date.now()
  if (cachedConfigs && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedConfigs
  }

  const rows = await prisma.systemConfig.findMany()
  const map = new Map<string, string>()
  for (const row of rows) {
    map.set(row.key, row.value)
  }

  cachedConfigs = map
  cacheTimestamp = now
  return map
}

export function invalidateConfigCache() {
  cachedConfigs = null
  cacheTimestamp = 0
}

export function invalidateStatusConfigCache() {
  cachedStatusConfigs = null
  statusCacheTimestamp = 0
  cachedDetailConfigs = null
  detailCacheTimestamp = 0
}

/**
 * Get a config value from DB with fallback to default.
 * Return type inferred from defaultValue.
 */
export async function getConfig<T extends number | boolean>(
  key: string,
  defaultValue: T,
): Promise<T> {
  const configs = await loadConfigs()
  const raw = configs.get(key)
  if (raw === undefined) return defaultValue

  if (typeof defaultValue === 'boolean') {
    return (raw === 'true') as T
  }
  const num = Number(raw)
  return (isNaN(num) ? defaultValue : num) as T
}

/**
 * Get all stored config values (for the settings UI).
 */
export async function getAllConfigValues(): Promise<Record<string, string>> {
  const map = await loadConfigs()
  return Object.fromEntries(map)
}

// ── Status Config Loading ──────────────────────────────────────

/**
 * Per-platform defaults. Each sportsbook starts with the same base statuses
 * but can be customized independently via the dictionary editor.
 */
const STATUS_DEFAULTS: Record<string, StatusOption[]> = {
  STATUSES_DRAFTKINGS: SPORTSBOOK_STATUSES,
  STATUSES_FANDUEL: SPORTSBOOK_STATUSES,
  STATUSES_BETMGM: SPORTSBOOK_STATUSES,
  STATUSES_CAESARS: SPORTSBOOK_STATUSES,
  STATUSES_FANATICS: SPORTSBOOK_STATUSES,
  STATUSES_BALLYBET: SPORTSBOOK_STATUSES,
  STATUSES_BETRIVERS: SPORTSBOOK_STATUSES,
  STATUSES_ESPNBET: SPORTSBOOK_STATUSES,
  STATUSES_BET365: SPORTSBOOK_STATUSES,
  STATUSES_BANK: BANK_STATUSES,
  STATUSES_EDGEBOOST: EDGEBOOST_STATUSES,
  STATUSES_PAYPAL: PAYPAL_STATUSES,
}

/** Convert hardcoded LimitedConfig + ActiveDetailConfig to PlatformDetailConfig */
function buildDetailDefaults(): Record<string, PlatformDetailConfig> {
  const result: Record<string, PlatformDetailConfig> = {}

  // Sportsbook limited configs
  for (const [platform, config] of Object.entries(PLATFORM_LIMITED_CONFIG)) {
    const key = DETAIL_CONFIG_KEYS[platform as keyof typeof DETAIL_CONFIG_KEYS]
    if (!key) continue
    result[key] = {
      limitedType: config.type,
      limitedOptions: config.options,
      limitedSports: config.sports,
    }
  }

  // Financial active detail configs
  for (const [platform, config] of Object.entries(PLATFORM_ACTIVE_DETAIL)) {
    const key = DETAIL_CONFIG_KEYS[platform as keyof typeof DETAIL_CONFIG_KEYS]
    if (!key) continue
    result[key] = {
      ...(result[key] ?? { limitedType: 'none' as const }),
      activeDetailOptions: config.options,
      activeDetailLabel: config.label,
    }
  }

  // Fill any platforms that don't have configs yet
  for (const dbKey of ALL_DETAIL_DB_KEYS) {
    if (!result[dbKey]) {
      result[dbKey] = { limitedType: 'none' }
    }
  }

  return result
}

const DETAIL_DEFAULTS = buildDetailDefaults()

async function loadStatusConfigs(): Promise<Map<string, StatusOption[]>> {
  const now = Date.now()
  if (cachedStatusConfigs && now - statusCacheTimestamp < CACHE_TTL_MS) {
    return cachedStatusConfigs
  }

  const rows = await prisma.systemConfig.findMany({
    where: { key: { in: [...ALL_STATUS_DB_KEYS] } },
  })

  const map = new Map<string, StatusOption[]>()
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.value) as StatusOption[]
      if (Array.isArray(parsed)) {
        map.set(row.key, parsed)
      }
    } catch {
      // Invalid JSON — skip
    }
  }

  cachedStatusConfigs = map
  statusCacheTimestamp = now
  return map
}

export async function getStatusConfigFromDB(
  key: string,
): Promise<StatusOption[]> {
  const configs = await loadStatusConfigs()
  const existing = configs.get(key)
  if (existing) return existing

  const defaults = STATUS_DEFAULTS[key]
  if (!defaults) return []

  try {
    await prisma.systemConfig.upsert({
      where: { key },
      update: {},
      create: {
        key,
        value: JSON.stringify(defaults),
        category: 'Account Statuses',
      },
    })
    if (cachedStatusConfigs) {
      cachedStatusConfigs.set(key, defaults)
    }
  } catch {
    // If seeding fails, return defaults in memory
  }

  return defaults
}

export async function getAllStatusConfigs(): Promise<Record<string, StatusOption[]>> {
  const results = await Promise.all(
    ALL_STATUS_DB_KEYS.map(async (key) => [key, await getStatusConfigFromDB(key)] as const),
  )
  return Object.fromEntries(results)
}

// ── Detail Config Loading ──────────────────────────────────────

async function loadDetailConfigs(): Promise<Map<string, PlatformDetailConfig>> {
  const now = Date.now()
  if (cachedDetailConfigs && now - detailCacheTimestamp < CACHE_TTL_MS) {
    return cachedDetailConfigs
  }

  const rows = await prisma.systemConfig.findMany({
    where: { key: { in: [...ALL_DETAIL_DB_KEYS] } },
  })

  const map = new Map<string, PlatformDetailConfig>()
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.value) as PlatformDetailConfig
      if (parsed && typeof parsed === 'object') {
        map.set(row.key, parsed)
      }
    } catch {
      // Invalid JSON — skip
    }
  }

  cachedDetailConfigs = map
  detailCacheTimestamp = now
  return map
}

/**
 * Get detail config for a specific platform DB key.
 * Auto-seeds defaults on first access.
 */
export async function getDetailConfigFromDB(
  key: string,
): Promise<PlatformDetailConfig> {
  const configs = await loadDetailConfigs()
  const existing = configs.get(key)
  if (existing) return existing

  const defaults = DETAIL_DEFAULTS[key]
  if (!defaults) return { limitedType: 'none' }

  try {
    await prisma.systemConfig.upsert({
      where: { key },
      update: {},
      create: {
        key,
        value: JSON.stringify(defaults),
        category: 'Account Statuses',
      },
    })
    if (cachedDetailConfigs) {
      cachedDetailConfigs.set(key, defaults)
    }
  } catch {
    // If seeding fails, return defaults in memory
  }

  return defaults
}

/**
 * Get all detail configs from DB for the settings UI.
 * Returns record keyed by DB key (e.g. DETAILS_DRAFTKINGS → PlatformDetailConfig).
 */
export async function getAllDetailConfigs(): Promise<Record<string, PlatformDetailConfig>> {
  const results = await Promise.all(
    ALL_DETAIL_DB_KEYS.map(async (key) => [key, await getDetailConfigFromDB(key)] as const),
  )
  return Object.fromEntries(results)
}
