'use server'

import prisma from '@/backend/prisma/client'
import { auth } from '@/backend/auth'
import { revalidatePath } from 'next/cache'
import { clientDraftSubmitSchema } from '@/lib/validations/client-draft'

export async function createClientDraft() {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const draft = await prisma.clientDraft.create({
    data: {
      closerId: session.user.id,
      step: 1,
      status: 'DRAFT',
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'CLIENT_DRAFT_CREATED',
      description: 'New client draft created',
      userId: session.user.id,
      metadata: { draftId: draft.id },
    },
  })

  revalidatePath('/agent/new-client')

  return { success: true, draftId: draft.id }
}

export async function saveClientDraft(
  draftId: string,
  data: Record<string, unknown>,
) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  // Ownership check
  const draft = await prisma.clientDraft.findFirst({
    where: { id: draftId, closerId: session.user.id },
    select: { id: true, status: true },
  })

  if (!draft) return { success: false, error: 'Draft not found' }
  if (draft.status !== 'DRAFT') {
    return { success: false, error: 'Draft already submitted' }
  }

  // Build update payload — only allow known fields
  const allowedFields = [
    'step',
    'firstName',
    'lastName',
    'email',
    'phone',
    'idDocument',
    'idNumber',
    'idExpiry',
    'assignedGmail',
    'betmgmCheckPassed',
    'ssnDocument',
    'secondAddress',
    'hasCriminalRecord',
    'criminalRecordNotes',
    'bankingHistory',
    'paypalHistory',
    'sportsbookHistory',
    'platformData',
    'contractDocument',
    'paypalPreviouslyUsed',
    'addressMismatch',
    'debankedHistory',
    'debankedBank',
    'undisclosedInfo',
  ]

  const updateData: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (key in data) {
      if (key === 'idExpiry') {
        updateData[key] = data[key] ? new Date(data[key] as string) : null
      } else {
        updateData[key] = data[key]
      }
    }
  }

  await prisma.clientDraft.update({
    where: { id: draftId },
    data: updateData,
  })

  return { success: true }
}

export async function submitClientDraft(draftId: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const draft = await prisma.clientDraft.findFirst({
    where: { id: draftId, closerId: session.user.id },
  })

  if (!draft) return { success: false, error: 'Draft not found' }
  if (draft.status !== 'DRAFT') {
    return { success: false, error: 'Draft already submitted' }
  }

  // Validate required fields
  const validation = clientDraftSubmitSchema.safeParse({
    firstName: draft.firstName,
    lastName: draft.lastName,
    contractDocument: draft.contractDocument,
  })

  if (!validation.success) {
    const firstError = validation.error.issues[0]?.message ?? 'Validation failed'
    return { success: false, error: firstError }
  }

  // Create the real Client record
  const client = await prisma.client.create({
    data: {
      firstName: draft.firstName!,
      lastName: draft.lastName!,
      email: draft.email || null,
      phone: draft.phone || null,
      closerId: session.user.id,
      status: 'PENDING',
    },
  })

  // Mark draft as submitted
  await prisma.clientDraft.update({
    where: { id: draftId },
    data: {
      status: 'SUBMITTED',
      resultClientId: client.id,
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'CLIENT_DRAFT_SUBMITTED',
      description: `Client draft submitted: ${draft.firstName} ${draft.lastName}`,
      userId: session.user.id,
      metadata: { draftId, clientId: client.id },
    },
  })

  revalidatePath('/agent/new-client')
  revalidatePath('/agent/clients')
  revalidatePath('/backoffice/client-management')

  return { success: true, clientId: client.id }
}

export async function deleteClientDraft(draftId: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const draft = await prisma.clientDraft.findFirst({
    where: { id: draftId, closerId: session.user.id },
    select: { id: true, status: true },
  })

  if (!draft) return { success: false, error: 'Draft not found' }
  if (draft.status !== 'DRAFT') {
    return { success: false, error: 'Cannot delete submitted draft' }
  }

  await prisma.clientDraft.delete({
    where: { id: draftId },
  })

  revalidatePath('/agent/new-client')

  return { success: true }
}
