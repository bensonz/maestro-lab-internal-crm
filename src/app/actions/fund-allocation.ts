'use server'

import prisma from '@/backend/prisma/client'
import { auth } from '@/backend/auth'
import { revalidatePath } from 'next/cache'

/**
 * Record a fund movement (deposit/withdrawal/transfer).
 * Creates both a FundAllocation record and a Transaction record linked to the client.
 */
export async function recordFundMovement(data: Record<string, unknown>): Promise<{
  success: boolean
  error?: string
}> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  // Only BACKOFFICE, ADMIN, or FINANCE can record fund movements
  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'BACKOFFICE' && role !== 'FINANCE') {
    return { success: false, error: 'Not authorized' }
  }

  const {
    type,
    flowType,
    fromClientId,
    toClientId,
    fromPlatform,
    toPlatform,
    amount,
    method,
    fee,
    notes,
  } = data as {
    type: string
    flowType: string
    fromClientId: string
    toClientId?: string
    fromPlatform: string
    toPlatform: string
    amount: number
    method?: string
    fee?: number
    notes?: string
  }

  if (!fromClientId || !amount || amount <= 0) {
    return { success: false, error: 'Client and amount are required' }
  }

  try {
    // Determine direction: external withdrawal vs deposit/transfer
    const isWithdrawal = type === 'external' && flowType === 'external'
    const direction = isWithdrawal ? 'withdrawal' : 'deposit'

    // Build description
    const desc = notes || `${type === 'internal' ? 'Internal' : 'External'} ${direction}: ${fromPlatform} → ${toPlatform}`

    // Create FundAllocation record
    await prisma.fundAllocation.create({
      data: {
        amount,
        platform: fromPlatform,
        direction,
        notes: desc,
        recordedById: session.user.id,
      },
    })

    // Create Transaction record linked to the client
    // For internal transfers, create transactions for both source and destination
    const transactionType = isWithdrawal ? 'WITHDRAWAL' : 'DEPOSIT'

    await prisma.transaction.create({
      data: {
        clientId: fromClientId,
        type: transactionType,
        amount,
        description: desc,
        platformType: fromPlatform.toUpperCase().replace(/\s+/g, '_'),
      },
    })

    // If internal transfer to a different client, create a second transaction
    if (flowType === 'cross_client' && toClientId && toClientId !== fromClientId) {
      await prisma.transaction.create({
        data: {
          clientId: toClientId,
          type: 'DEPOSIT',
          amount,
          description: `Transfer from ${fromPlatform}: ${notes || ''}`.trim(),
          platformType: toPlatform.toUpperCase().replace(/\s+/g, '_'),
        },
      })
    }

    // Log event
    await prisma.eventLog.create({
      data: {
        eventType: 'FUND_ALLOCATED',
        description: `Fund ${direction} recorded: $${amount} on ${fromPlatform}`,
        userId: session.user.id,
        metadata: {
          clientId: fromClientId,
          type,
          flowType,
          fromPlatform,
          toPlatform,
          amount,
          method,
          fee,
        },
      },
    })

    revalidatePath('/backoffice/fund-allocation')
    revalidatePath('/backoffice/client-management')

    return { success: true }
  } catch (e) {
    console.error('[recordFundMovement] Error:', e)
    return { success: false, error: 'Failed to record fund movement' }
  }
}
