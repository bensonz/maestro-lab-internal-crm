'use server'

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { EventType, PlatformStatus, PlatformType } from '@/types'

export type VerificationActionState = {
  success?: boolean
  message?: string
}

/**
 * Backoffice action: manually verify a client's BetMGM account.
 * Sets BetMGM platform status to VERIFIED.
 */
export async function verifyBetmgmManual(
  clientId: string,
): Promise<VerificationActionState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, message: 'You must be logged in' }
  }

  // Only BACKOFFICE and ADMIN can verify
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (!user || (user.role !== 'BACKOFFICE' && user.role !== 'ADMIN')) {
    return { success: false, message: 'Only backoffice or admin can verify BetMGM accounts' }
  }

  try {
    const platform = await prisma.clientPlatform.findFirst({
      where: {
        clientId,
        platformType: PlatformType.BETMGM,
      },
    })

    if (!platform) {
      return { success: false, message: 'BetMGM platform record not found' }
    }

    if (platform.status === PlatformStatus.VERIFIED) {
      return { success: true, message: 'BetMGM is already verified' }
    }

    await prisma.clientPlatform.update({
      where: { id: platform.id },
      data: {
        status: PlatformStatus.VERIFIED,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
    })

    await prisma.eventLog.create({
      data: {
        eventType: EventType.PLATFORM_STATUS_CHANGE,
        description: 'BetMGM account manually verified by backoffice',
        clientId,
        userId: session.user.id,
        oldValue: platform.status,
        newValue: PlatformStatus.VERIFIED,
      },
    })

    return { success: true, message: 'BetMGM account verified successfully' }
  } catch {
    return { success: false, message: 'Failed to verify BetMGM account' }
  }
}

export type BetmgmStatusResult = {
  status: string
  verified: boolean
}

/**
 * Agent polling action: check the current BetMGM verification status for a client.
 */
export async function checkBetmgmStatus(
  clientId: string,
): Promise<BetmgmStatusResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { status: 'NOT_STARTED', verified: false }
  }

  const platform = await prisma.clientPlatform.findFirst({
    where: {
      clientId,
      platformType: PlatformType.BETMGM,
    },
    select: { status: true },
  })

  if (!platform) {
    return { status: 'NOT_STARTED', verified: false }
  }

  return {
    status: platform.status,
    verified: platform.status === PlatformStatus.VERIFIED,
  }
}
