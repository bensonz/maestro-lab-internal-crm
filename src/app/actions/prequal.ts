'use server'

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { ALL_PLATFORMS } from '@/lib/platforms'
import { prequalSchema, updateGmailSchema } from '@/lib/validations/prequal'
import { EventType, PlatformStatus, PlatformType, UserRole } from '@/types'
import { notifyRole } from '@/backend/services/notifications'
import logger from '@/backend/logger'

export type PrequalActionState = {
  errors?: Record<string, string[]>
  message?: string
  clientId?: string
}

export async function submitPrequalification(
  prevState: PrequalActionState,
  formData: FormData,
): Promise<PrequalActionState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { message: 'You must be logged in to submit pre-qualification' }
  }

  const rawData = {
    firstName: formData.get('firstName') ?? '',
    lastName: formData.get('lastName') ?? '',
    middleName: formData.get('middleName'),
    dateOfBirth: formData.get('dateOfBirth'),
    gmailAccount: formData.get('gmailAccount') ?? '',
    gmailPassword: formData.get('gmailPassword') ?? '',
    phone: formData.get('phone') ?? '',
    agentConfirmsId: formData.get('agentConfirmsId'),
    idExpiry: formData.get('idExpiry'),
    idDocument: formData.get('idDocument'),
    betmgmResult: formData.get('betmgmResult'),
    betmgmLoginScreenshot: formData.get('betmgmLoginScreenshot'),
    betmgmDepositScreenshot: formData.get('betmgmDepositScreenshot'),
    address: formData.get('address'),
    city: formData.get('city'),
    state: formData.get('state'),
    zipCode: formData.get('zipCode'),
  }

  const validationResult = prequalSchema.safeParse(rawData)

  if (!validationResult.success) {
    return {
      errors: validationResult.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    }
  }

  const {
    firstName,
    lastName,
    middleName,
    dateOfBirth,
    gmailAccount,
    gmailPassword,
    phone,
    idExpiry,
    idDocument,
    betmgmResult,
    betmgmLoginScreenshot,
    betmgmDepositScreenshot,
    address,
    city,
    state,
    zipCode,
  } = validationResult.data

  // Check ID expiration - block if expired
  if (idExpiry) {
    const expiryDate = new Date(idExpiry)
    if (expiryDate.getTime() < Date.now()) {
      return { message: 'Cannot submit — ID is expired' }
    }
  }

  try {
    // Verify the logged-in user exists in the DB (session JWT may be stale after re-seed)
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    })
    if (!userExists) {
      return { message: 'Session expired — please log out and log back in' }
    }

    const client = await prisma.$transaction(async (tx) => {
      const newClient = await tx.client.create({
        data: {
          firstName,
          lastName,
          gmailAccount,
          gmailPassword,
          phone: phone || null,
          prequalCompleted: true,
          intakeStatus: 'PENDING',
          agentId: session.user.id,
          address: address || null,
          city: city || null,
          state: state || null,
          zipCode: zipCode || null,
          questionnaire: JSON.stringify({
            middleName,
            dateOfBirth,
            idExpiry,
            idVerified: true,
            betmgmResult: betmgmResult || null,
            extractedAddress: {
              address: address || null,
              city: city || null,
              state: state || null,
              zip: zipCode || null,
            },
          }),
          idDocument: idDocument || null,
        },
      })

      // Create 11 ClientPlatform records — BetMGM gets status based on result, others NOT_STARTED
      const betmgmScreenshots: string[] = []
      if (betmgmLoginScreenshot) betmgmScreenshots.push(betmgmLoginScreenshot)
      if (betmgmDepositScreenshot) betmgmScreenshots.push(betmgmDepositScreenshot)

      const betmgmPlatformStatus =
        betmgmResult === 'failed'
          ? PlatformStatus.REJECTED
          : PlatformStatus.PENDING_REVIEW

      await tx.clientPlatform.createMany({
        data: ALL_PLATFORMS.map((platformType) => ({
          clientId: newClient.id,
          platformType,
          status:
            platformType === PlatformType.BETMGM
              ? betmgmPlatformStatus
              : PlatformStatus.NOT_STARTED,
          ...(platformType === PlatformType.BETMGM && betmgmScreenshots.length > 0
            ? { screenshots: betmgmScreenshots }
            : {}),
        })),
      })

      await tx.eventLog.create({
        data: {
          eventType: EventType.APPLICATION_SUBMITTED,
          description: `Pre-qualification submitted for ${firstName} ${lastName}`,
          clientId: newClient.id,
          userId: session.user.id,
        },
      })

      return newClient
    })

    // Notify backoffice if BetMGM needs review
    if (betmgmResult !== 'failed') {
      try {
        await notifyRole({
          role: [UserRole.ADMIN, UserRole.BACKOFFICE],
          type: EventType.PLATFORM_STATUS_CHANGE,
          title: 'BetMGM verification needed',
          message: `${firstName} ${lastName} submitted pre-qualification — BetMGM account needs review`,
          link: '/backoffice/sales-interaction',
          clientId: client.id,
        })
      } catch (err) {
        logger.warn('Notification failed after prequal submit', { error: err, clientId: client.id })
      }
    }

    return { clientId: client.id }
  } catch (error) {
    logger.error('Pre-qualification submission failed', { error })
    return { message: 'Failed to submit pre-qualification' }
  }
}

export type GmailUpdateState = {
  success?: boolean
  message?: string
}

export async function updateGmailCredentials(
  prevState: GmailUpdateState,
  formData: FormData,
): Promise<GmailUpdateState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, message: 'You must be logged in' }
  }

  const rawData = {
    clientId: formData.get('clientId'),
    gmailAccount: formData.get('gmailAccount'),
    gmailPassword: formData.get('gmailPassword'),
  }

  const validationResult = updateGmailSchema.safeParse(rawData)

  if (!validationResult.success) {
    return {
      success: false,
      message: Object.values(
        validationResult.error.flatten().fieldErrors,
      )
        .flat()
        .join(', '),
    }
  }

  const { clientId, gmailAccount, gmailPassword } = validationResult.data

  try {
    await prisma.client.update({
      where: { id: clientId, agentId: session.user.id },
      data: { gmailAccount, gmailPassword },
    })

    return { success: true, message: 'Gmail credentials updated' }
  } catch {
    return { success: false, message: 'Failed to update Gmail credentials' }
  }
}
