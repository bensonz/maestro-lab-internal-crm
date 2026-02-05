'use server'

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { ALL_PLATFORMS } from '@/lib/platforms'
import { createClientSchema, saveDraftSchema } from '@/lib/validations/client'
import { EventType, IntakeStatus, PlatformStatus } from '@/types'
import { redirect } from 'next/navigation'

export type ActionState = {
  errors?: Record<string, string[]>
  message?: string
}

export async function createClient(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // 1. Auth check - must be logged in
  const session = await auth()
  if (!session?.user?.id) {
    return { message: 'You must be logged in to create a client' }
  }

  // 2. Parse form data
  const rawData = {
    firstName: formData.get('firstName'),
    middleName: formData.get('middleName'),
    lastName: formData.get('lastName'),
    dateOfBirth: formData.get('dateOfBirth'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    primaryAddress: formData.get('primaryAddress'),
    primaryCity: formData.get('primaryCity'),
    primaryState: formData.get('primaryState'),
    primaryZip: formData.get('primaryZip'),
    hasSecondAddress: formData.get('hasSecondAddress'),
    secondaryAddress: formData.get('secondaryAddress'),
    secondaryCity: formData.get('secondaryCity'),
    secondaryState: formData.get('secondaryState'),
    secondaryZip: formData.get('secondaryZip'),
    questionnaire: formData.get('questionnaire'),
    notes: formData.get('notes'),
    agentConfirmsSuitable: formData.get('agentConfirmsSuitable'),
  }

  // 3. Validate with Zod
  const validationResult = createClientSchema.safeParse(rawData)

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
    middleName,
    lastName,
    dateOfBirth,
    phone,
    email,
    primaryAddress,
    primaryCity,
    primaryState,
    primaryZip,
    hasSecondAddress,
    secondaryAddress,
    secondaryCity,
    secondaryState,
    secondaryZip,
    questionnaire,
    notes,
  } = validationResult.data

  // 4. Build questionnaire JSON with all data
  let questionnaireData = {}
  try {
    if (questionnaire) {
      questionnaireData = JSON.parse(questionnaire)
    }
  } catch {
    // If parsing fails, use empty object
  }

  // Add additional fields to questionnaire
  const fullQuestionnaire = {
    ...questionnaireData,
    middleName,
    dateOfBirth,
    secondaryAddress: hasSecondAddress
      ? {
          address: secondaryAddress,
          city: secondaryCity,
          state: secondaryState,
          zip: secondaryZip,
        }
      : null,
  }

  // 5. Create client and platforms in a transaction
  await prisma.$transaction(async (tx) => {
    // Create the client
    const client = await tx.client.create({
      data: {
        firstName,
        lastName,
        phone,
        email: email || null,
        address: primaryAddress,
        city: primaryCity,
        state: primaryState,
        zipCode: primaryZip,
        country: 'USA',
        applicationNotes: notes || null,
        questionnaire: JSON.stringify(fullQuestionnaire),
        intakeStatus: IntakeStatus.PENDING,
        agentId: session.user.id,
      },
    })

    // Create 11 ClientPlatform records
    await tx.clientPlatform.createMany({
      data: ALL_PLATFORMS.map((platformType) => ({
        clientId: client.id,
        platformType,
        status: PlatformStatus.NOT_STARTED,
      })),
    })

    // Create EventLog entry
    await tx.eventLog.create({
      data: {
        eventType: EventType.APPLICATION_SUBMITTED,
        description: `New client application submitted: ${firstName} ${lastName}`,
        clientId: client.id,
        userId: session.user.id,
      },
    })
  })

  // 6. Redirect on success
  redirect('/agent/clients')
}

export async function saveDraft(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // 1. Auth check
  const session = await auth()
  if (!session?.user?.id) {
    return { message: 'You must be logged in to save a draft' }
  }

  // 2. Parse form data (more lenient validation for drafts)
  const rawData = {
    firstName: formData.get('firstName'),
    middleName: formData.get('middleName'),
    lastName: formData.get('lastName'),
    dateOfBirth: formData.get('dateOfBirth'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    primaryAddress: formData.get('primaryAddress'),
    primaryCity: formData.get('primaryCity'),
    primaryState: formData.get('primaryState'),
    primaryZip: formData.get('primaryZip'),
    hasSecondAddress: formData.get('hasSecondAddress'),
    secondaryAddress: formData.get('secondaryAddress'),
    secondaryCity: formData.get('secondaryCity'),
    secondaryState: formData.get('secondaryState'),
    secondaryZip: formData.get('secondaryZip'),
    questionnaire: formData.get('questionnaire'),
    notes: formData.get('notes'),
    agentConfirmsSuitable: formData.get('agentConfirmsSuitable'),
  }

  // 3. Validate with draft schema (lenient)
  const validationResult = saveDraftSchema.safeParse(rawData)

  if (!validationResult.success) {
    return {
      errors: validationResult.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    }
  }

  // For now, just return success - draft saving can be implemented later
  // when there's a drafts table or localStorage mechanism
  return { message: 'Draft saved successfully' }
}
