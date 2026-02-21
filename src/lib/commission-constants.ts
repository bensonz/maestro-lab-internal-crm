/**
 * Star level promotion thresholds.
 *
 * `min` = minimum approved clients to reach this level
 * `max` = maximum approved clients before next promotion
 */
export const STAR_THRESHOLDS = [
  { level: 0, label: 'Rookie', min: 1, max: 2, sliceBonus: '$0' },
  { level: 1, label: '1-Star', min: 3, max: 6, sliceBonus: '$50' },
  { level: 2, label: '2-Star', min: 7, max: 12, sliceBonus: '$100' },
  { level: 3, label: '3-Star', min: 13, max: 20, sliceBonus: '$150' },
  { level: 4, label: '4-Star', min: 21, max: Infinity, sliceBonus: '$200' },
] as const

/**
 * Bonus pool constants — $400 fixed per approved client.
 */
export const BONUS_POOL_TOTAL = 400
export const DIRECT_BONUS = 200
export const STAR_POOL_TOTAL = 200
export const SLICE_VALUE = 50
export const TOTAL_SLICES = 4

/**
 * Leadership tier configuration.
 *
 * Each tier has promotion requirements, a one-time bonus, and a quarterly
 * commission percentage on team P&L revenue.
 */
export const LEADERSHIP_TIERS = [
  {
    tier: 'ED' as const,
    label: 'Executive Director',
    promotionBonus: 10_000,
    commissionPercent: 5,
    requirements: {
      minOwnClients: 30,
      subTierLevel: 4,
      subCount: 2,
      minDirect: 1,
    },
    maintenance: { minNewClientsPerYear: 15 },
  },
  {
    tier: 'SED' as const,
    label: 'Senior Executive Director',
    promotionBonus: 30_000,
    commissionPercent: 10,
    requirements: {
      minOwnClients: 50,
      subTierLevel: 4,
      subCount: 4,
      minDirect: 2,
    },
    maintenance: { minNewClientsPerYear: 20 },
  },
  {
    tier: 'MD' as const,
    label: 'Managing Director',
    promotionBonus: 100_000,
    commissionPercent: 15,
    requirements: {
      minOwnClients: 100,
      subTierLevel: 4,
      subCount: 6,
      minDirect: 3,
    },
    maintenance: { minNewClientsPerYear: 30 },
  },
  {
    tier: 'CMO' as const,
    label: 'Chief Marketing Officer',
    promotionBonus: 250_000,
    commissionPercent: 20,
    requirements: {
      minOwnClients: 200,
      subTierLevel: 4,
      subCount: 10,
      minDirect: 5,
    },
    maintenance: { minNewClientsPerYear: 50 },
  },
] as const

export type LeadershipTierConfig = (typeof LEADERSHIP_TIERS)[number]

/**
 * Returns the display label for an agent based on their star level and leadership tier.
 * Use this everywhere in UI to display an agent's tier consistently.
 */
export function getAgentDisplayTier(starLevel: number, leadershipTier: string = 'NONE'): string {
  if (leadershipTier !== 'NONE') {
    const lt = LEADERSHIP_TIERS.find(t => t.tier === leadershipTier)
    return lt?.label ?? leadershipTier
  }
  return STAR_THRESHOLDS[starLevel]?.label ?? `${starLevel}-Star`
}
