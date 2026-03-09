import prisma from '@/backend/prisma/client'

const CACHE_TTL_MS = 60_000 // 60 seconds

let cachedConfigs: Map<string, string> | null = null
let cacheTimestamp = 0

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
