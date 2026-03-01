import prisma from '@/backend/prisma/client'
import type { EmailDetection } from './types'

interface MatchResult {
  matched: boolean
  allocationId?: string
  autoConfirmed: boolean
  discrepancy: boolean
  recordedAmount?: number
  detectedAmount?: number
}

/**
 * Attempt to match a fund movement email detection against existing FundAllocation records.
 *
 * Matching criteria:
 * - Same platform (case-insensitive)
 * - Same direction (DEPOSIT/WITHDRAWAL)
 * - Amount within +/-5%
 * - Created within 48 hours
 * - Currently UNCONFIRMED
 */
export async function matchFundAllocation(
  detection: EmailDetection,
  emailReceivedAt: Date,
): Promise<MatchResult> {
  const platform = detection.data.platform as string | undefined
  const amount = detection.data.amount as number | undefined
  const direction = detection.data.direction as string | undefined

  if (!platform || !direction || direction === 'UNKNOWN') {
    return { matched: false, autoConfirmed: false, discrepancy: false }
  }

  // 48-hour window
  const windowStart = new Date(emailReceivedAt.getTime() - 48 * 60 * 60 * 1000)

  const candidates = await prisma.fundAllocation.findMany({
    where: {
      platform: { contains: platform, mode: 'insensitive' },
      direction,
      confirmationStatus: 'UNCONFIRMED',
      createdAt: { gte: windowStart },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (candidates.length === 0) {
    return { matched: false, autoConfirmed: false, discrepancy: false }
  }

  if (!amount) {
    // No amount extracted — can't auto-confirm, but found potential match
    return {
      matched: true,
      allocationId: candidates[0].id,
      autoConfirmed: false,
      discrepancy: false,
      recordedAmount: Number(candidates[0].amount),
    }
  }

  // Find best match by amount
  for (const candidate of candidates) {
    const recordedAmount = Number(candidate.amount)
    const tolerance = recordedAmount * 0.05 // 5% tolerance
    const diff = Math.abs(recordedAmount - amount)

    if (diff <= tolerance) {
      // Exact match (within tolerance) — auto-confirm
      await prisma.fundAllocation.update({
        where: { id: candidate.id },
        data: {
          confirmationStatus: 'CONFIRMED',
          confirmedAt: new Date(),
          confirmedAmount: amount,
        },
      })

      return {
        matched: true,
        allocationId: candidate.id,
        autoConfirmed: true,
        discrepancy: false,
        recordedAmount,
        detectedAmount: amount,
      }
    }

    if (diff <= recordedAmount * 0.25) {
      // Amount mismatch but plausible — flag discrepancy
      await prisma.fundAllocation.update({
        where: { id: candidate.id },
        data: {
          confirmationStatus: 'DISCREPANCY',
          confirmedAt: new Date(),
          confirmedAmount: amount,
          discrepancyNotes: `Auto-detected: email shows $${amount.toFixed(2)} vs recorded $${recordedAmount.toFixed(2)}`,
        },
      })

      return {
        matched: true,
        allocationId: candidate.id,
        autoConfirmed: false,
        discrepancy: true,
        recordedAmount,
        detectedAmount: amount,
      }
    }
  }

  // No amount match found
  return { matched: false, autoConfirmed: false, discrepancy: false }
}
