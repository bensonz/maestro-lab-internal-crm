/**
 * Star level promotion thresholds.
 *
 * Must stay in sync with recalculateStarLevel() in
 * src/backend/services/commission.ts
 *
 * `min` = minimum approved clients to reach this level
 * `max` = maximum approved clients before next promotion
 */
export const STAR_THRESHOLDS = [
  { level: 0, label: 'Rookie', min: 1, max: 2, sliceBonus: '$0' },
  { level: 1, label: '1-Star Agent', min: 3, max: 6, sliceBonus: '$50' },
  { level: 2, label: '2-Star Agent', min: 7, max: 12, sliceBonus: '$100' },
  { level: 3, label: '3-Star Agent', min: 13, max: 20, sliceBonus: '$150' },
  { level: 4, label: '4-Star Agent', min: 21, max: Infinity, sliceBonus: '$200' },
] as const
