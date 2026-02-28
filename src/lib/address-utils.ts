import type { DiscoveredAddress } from '@/types/backend-types'

/**
 * Address normalization and matching utilities.
 * Used for progressive address discovery during client onboarding —
 * as screenshots are uploaded across platforms, OCR detects addresses
 * and we need to deduplicate / track unique addresses.
 */

/** Common address abbreviation expansions */
const ABBREVIATIONS: Record<string, string> = {
  st: 'street',
  ave: 'avenue',
  blvd: 'boulevard',
  dr: 'drive',
  ln: 'lane',
  rd: 'road',
  ct: 'court',
  pl: 'place',
  cir: 'circle',
  pkwy: 'parkway',
  hwy: 'highway',
  apt: 'apartment',
  ste: 'suite',
  fl: 'floor',
  n: 'north',
  s: 'south',
  e: 'east',
  w: 'west',
  ne: 'northeast',
  nw: 'northwest',
  se: 'southeast',
  sw: 'southwest',
}

/**
 * Normalize an address string for comparison.
 * - Lowercases
 * - Strips punctuation (periods, commas, hashes)
 * - Expands common abbreviations (St -> Street, Ave -> Avenue, etc.)
 * - Collapses whitespace
 */
export function normalizeAddress(addr: string): string {
  let normalized = addr
    .toLowerCase()
    .replace(/[.,#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Expand abbreviations (word-boundary aware)
  const words = normalized.split(' ')
  const expanded = words.map((word) => ABBREVIATIONS[word] ?? word)
  normalized = expanded.join(' ')

  return normalized
}

/**
 * Check if two addresses match via normalized comparison.
 * Returns true if the normalized forms are identical.
 */
export function addressesMatch(a: string, b: string): boolean {
  return normalizeAddress(a) === normalizeAddress(b)
}

/**
 * Find an existing address that matches the given address.
 * Returns the matching DiscoveredAddress or null if no match.
 */
export function findMatchingAddress(
  newAddr: string,
  existing: DiscoveredAddress[],
): DiscoveredAddress | null {
  const normalizedNew = normalizeAddress(newAddr)
  return (
    existing.find((d) => normalizeAddress(d.address) === normalizedNew) ?? null
  )
}

/**
 * Get unique addresses from an array, deduplicating via normalization.
 * Keeps the first occurrence of each unique address.
 */
export function getUniqueAddresses(
  addresses: DiscoveredAddress[],
): DiscoveredAddress[] {
  const seen = new Set<string>()
  const unique: DiscoveredAddress[] = []

  for (const addr of addresses) {
    const normalized = normalizeAddress(addr.address)
    if (!seen.has(normalized)) {
      seen.add(normalized)
      unique.push(addr)
    }
  }

  return unique
}
