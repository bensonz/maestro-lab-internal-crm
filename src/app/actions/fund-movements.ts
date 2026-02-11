'use server'

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { UserRole, EventType } from '@/types'
import { PLATFORM_INFO } from '@/lib/platforms'
import { revalidatePath } from 'next/cache'
import { recordTransactionFromFundMovement } from '@/backend/services/transaction'
import logger from '@/backend/logger'

const VALID_PLATFORM_NAMES = new Set(
  Object.values(PLATFORM_INFO).map((p) => p.name),
)

const VALID_METHODS = new Set(['zelle', 'wire', 'transfer'])

export async function recordFundMovement(data: {
  type: 'internal' | 'external'
  flowType: 'same_client' | 'different_clients' | 'external'
  fromClientId: string
  fromPlatform: string
  toClientId?: string
  toPlatform: string
  amount: number
  method?: string
  fee?: number
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  // Check role
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (
    !user ||
    (user.role !== UserRole.ADMIN && user.role !== UserRole.BACKOFFICE)
  ) {
    return {
      success: false,
      error: 'Unauthorized — admin or backoffice role required',
    }
  }

  // Validate amount
  if (!data.amount || data.amount <= 0) {
    return { success: false, error: 'Amount must be greater than 0' }
  }

  // Validate platforms
  if (!VALID_PLATFORM_NAMES.has(data.fromPlatform)) {
    return { success: false, error: 'Invalid source platform' }
  }

  if (!VALID_PLATFORM_NAMES.has(data.toPlatform)) {
    return { success: false, error: 'Invalid destination platform' }
  }

  // Validate method if provided
  if (data.method && !VALID_METHODS.has(data.method)) {
    return { success: false, error: 'Invalid transfer method' }
  }

  // Validate fromClientId exists
  if (!data.fromClientId) {
    return { success: false, error: 'Source client is required' }
  }

  const fromClient = await prisma.client.findUnique({
    where: { id: data.fromClientId },
    select: { id: true },
  })

  if (!fromClient) {
    return { success: false, error: 'Source client not found' }
  }

  // Determine toClientId based on flowType
  let toClientId: string | null = null

  if (data.flowType === 'same_client') {
    toClientId = data.fromClientId
  } else if (
    data.flowType === 'different_clients' ||
    data.flowType === 'external'
  ) {
    if (!data.toClientId) {
      return {
        success: false,
        error: 'Destination client is required for this flow type',
      }
    }

    const toClient = await prisma.client.findUnique({
      where: { id: data.toClientId },
      select: { id: true },
    })

    if (!toClient) {
      return { success: false, error: 'Destination client not found' }
    }

    toClientId = data.toClientId
  }

  try {
    const movement = await prisma.fundMovement.create({
      data: {
        type: data.type,
        flowType: data.flowType,
        fromClientId: data.fromClientId,
        fromPlatform: data.fromPlatform,
        toClientId,
        toPlatform: data.toPlatform,
        amount: data.amount,
        fee: data.fee ?? null,
        method: data.method ?? null,
        notes: data.notes?.trim() || null,
        recordedById: session.user.id,
      },
    })

    // Record transaction ledger entries
    await recordTransactionFromFundMovement(movement, session.user.id)

    // Log event
    await prisma.eventLog.create({
      data: {
        eventType: EventType.TRANSACTION_CREATED,
        description: `Fund movement recorded: $${data.amount} ${data.fromPlatform} → ${data.toPlatform}`,
        clientId: data.fromClientId,
        userId: session.user.id,
        metadata: {
          type: data.type,
          flowType: data.flowType,
          amount: data.amount,
          fromPlatform: data.fromPlatform,
          toPlatform: data.toPlatform,
        },
      },
    })

    revalidatePath('/backoffice/fund-allocation')

    return { success: true }
  } catch (error) {
    logger.error('Record fund movement error', { error })
    return { success: false, error: 'Failed to record fund movement' }
  }
}
