'use server'

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { ALL_PLATFORMS } from '@/lib/platforms'
import { createClientSchema } from '@/lib/validations/client'
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
    lastName: formData.get('lastName'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    notes: formData.get('notes'),
  }

  // 3. Validate with Zod
  const validationResult = createClientSchema.safeParse(rawData)

  if (!validationResult.success) {
    return {
      errors: validationResult.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const { firstName, lastName, phone, email, notes } = validationResult.data

  // 4. Create client and platforms in a transaction
  await prisma.$transaction(async (tx) => {
    // Create the client
    const client = await tx.client.create({
      data: {
        firstName,
        lastName,
        phone,
        email: email || null,
        applicationNotes: notes || null,
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

  // 5. Redirect on success
  redirect('/agent/clients')
}
