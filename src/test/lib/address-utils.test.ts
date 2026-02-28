import { describe, it, expect } from 'vitest'
import {
  normalizeAddress,
  addressesMatch,
  findMatchingAddress,
  getUniqueAddresses,
} from '@/lib/address-utils'
import type { DiscoveredAddress } from '@/types/backend-types'

describe('normalizeAddress', () => {
  it('lowercases the address', () => {
    expect(normalizeAddress('123 MAIN STREET')).toBe('123 main street')
  })

  it('strips punctuation (periods, commas, hashes)', () => {
    expect(normalizeAddress('123 Main St., Apt. #2B')).toBe('123 main street apartment 2b')
  })

  it('expands common abbreviations', () => {
    expect(normalizeAddress('456 Oak Ave')).toBe('456 oak avenue')
    expect(normalizeAddress('789 Elm Blvd')).toBe('789 elm boulevard')
    expect(normalizeAddress('100 N Pine Dr')).toBe('100 north pine drive')
  })

  it('collapses whitespace', () => {
    expect(normalizeAddress('123   Main    St')).toBe('123 main street')
  })

  it('handles empty string', () => {
    expect(normalizeAddress('')).toBe('')
  })

  it('expands directional abbreviations', () => {
    expect(normalizeAddress('100 NW 5th Ave')).toBe('100 northwest 5th avenue')
    expect(normalizeAddress('200 SE Elm St')).toBe('200 southeast elm street')
  })
})

describe('addressesMatch', () => {
  it('matches identical addresses', () => {
    expect(addressesMatch('123 Main St', '123 Main St')).toBe(true)
  })

  it('matches addresses with different casing', () => {
    expect(addressesMatch('123 main st', '123 MAIN ST')).toBe(true)
  })

  it('matches abbreviated vs expanded', () => {
    expect(addressesMatch('123 Main St', '123 Main Street')).toBe(true)
  })

  it('matches addresses with/without punctuation', () => {
    expect(addressesMatch('123 Main St.', '123 Main St')).toBe(true)
  })

  it('does NOT match different addresses', () => {
    expect(addressesMatch('123 Main St', '456 Oak Ave')).toBe(false)
  })
})

describe('findMatchingAddress', () => {
  const existing: DiscoveredAddress[] = [
    { address: '123 Main St, Los Angeles, CA 90001', source: 'ID' },
    { address: '456 Oak Ave, Brooklyn, NY 11201', source: 'PAYPAL' },
  ]

  it('finds match with different formatting', () => {
    const match = findMatchingAddress('123 Main Street, Los Angeles, CA 90001', existing)
    expect(match).not.toBeNull()
    expect(match?.source).toBe('ID')
  })

  it('returns null when no match', () => {
    const match = findMatchingAddress('789 Elm Dr, Chicago, IL 60601', existing)
    expect(match).toBeNull()
  })

  it('returns null for empty existing array', () => {
    const match = findMatchingAddress('123 Main St', [])
    expect(match).toBeNull()
  })
})

describe('getUniqueAddresses', () => {
  it('deduplicates addresses by normalization', () => {
    const addresses: DiscoveredAddress[] = [
      { address: '123 Main St, LA, CA', source: 'ID' },
      { address: '123 Main Street, LA, CA', source: 'BETMGM' },
      { address: '456 Oak Ave, Brooklyn, NY', source: 'PAYPAL' },
    ]
    const unique = getUniqueAddresses(addresses)
    expect(unique).toHaveLength(2)
    expect(unique[0].source).toBe('ID')
    expect(unique[1].source).toBe('PAYPAL')
  })

  it('returns empty array for empty input', () => {
    expect(getUniqueAddresses([])).toEqual([])
  })

  it('keeps first occurrence', () => {
    const addresses: DiscoveredAddress[] = [
      { address: '123 Main St', source: 'ID', confirmedByAgent: true },
      { address: '123 Main Street', source: 'BETMGM' },
    ]
    const unique = getUniqueAddresses(addresses)
    expect(unique).toHaveLength(1)
    expect(unique[0].confirmedByAgent).toBe(true)
  })
})
