'use server'

import prisma from '@/backend/prisma/client'
import { auth } from '@/backend/auth'
import { revalidatePath } from 'next/cache'
import { clientDraftSubmitSchema } from '@/lib/validations/client-draft'

export async function createClientRecord() {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const record = await prisma.clientRecord.create({
    data: {
      closerId: session.user.id,
      step: 1,
      status: 'DRAFT',
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'CLIENT_DRAFT_CREATED',
      description: 'New client record created',
      userId: session.user.id,
      metadata: { draftId: record.id },
    },
  })

  revalidatePath('/agent/new-client')

  return { success: true, draftId: record.id }
}

export async function saveClientRecord(
  draftId: string,
  data: Record<string, unknown>,
) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  // Ownership check — backoffice/admin can edit any record (including submitted ones)
  const role = session.user.role
  const isPrivileged = role === 'ADMIN' || role === 'BACKOFFICE'
  const record = await prisma.clientRecord.findFirst({
    where: isPrivileged ? { id: draftId } : { id: draftId, closerId: session.user.id },
    select: { id: true, status: true },
  })

  if (!record) return { success: false, error: 'Draft not found' }
  // Agents can only edit DRAFT status; backoffice can edit any status
  if (!isPrivileged && record.status !== 'DRAFT') {
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
    'dateOfBirth',
    'address',
    'livesAtDifferentAddress',
    'currentAddress',
    'differentAddressDuration',
    'differentAddressProof',
    'assignedGmail',
    'gmailPassword',
    'gmailScreenshot',
    'betmgmCheckPassed',
    'betmgmLogin',
    'betmgmPassword',
    'betmgmRegScreenshot',
    'betmgmLoginScreenshot',
    'ssnDocument',
    'ssnNumber',
    'citizenship',
    'missingIdType',
    'secondAddress',
    'secondAddressProof',
    'hasCriminalRecord',
    'criminalRecordNotes',
    'bankingHistory',
    'bankNegativeBalance',
    'paypalHistory',
    'paypalSsnLinked',
    'paypalBrowserVerified',
    'occupation',
    'annualIncome',
    'employmentStatus',
    'maritalStatus',
    'creditScoreRange',
    'dependents',
    'educationLevel',
    'householdAwareness',
    'familyTechSupport',
    'financialAutonomy',
    'digitalComfort',
    'deviceReservationDate',
    'sportsbookHistory',
    'sportsbookUsedBefore',
    'sportsbookUsedList',
    'sportsbookStatuses',
    'platformData',
    'generatedCredentials',
    'contractDocument',
    'paypalPreviouslyUsed',
    'addressMismatch',
    'debankedHistory',
    'debankedBank',
    'undisclosedInfo',
    'discoveredAddresses',
    'agentConfidenceLevel',
    'clientHidingInfo',
    'clientHidingInfoNotes',
    'backofficeReviewedStep',
  ]

  const updateData: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (key in data) {
      if (key === 'idExpiry' || key === 'dateOfBirth') {
        updateData[key] = data[key] ? new Date(data[key] as string) : null
      } else {
        updateData[key] = data[key]
      }
    }
  }

  await prisma.clientRecord.update({
    where: { id: draftId },
    data: updateData,
  })

  return { success: true }
}

export async function submitClientRecord(draftId: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const record = await prisma.clientRecord.findFirst({
    where: { id: draftId, closerId: session.user.id },
  })

  if (!record) return { success: false, error: 'Draft not found' }
  if (record.status !== 'DRAFT') {
    return { success: false, error: 'Draft already submitted' }
  }

  // Validate required fields
  const validation = clientDraftSubmitSchema.safeParse({
    firstName: record.firstName,
    lastName: record.lastName,
    contractDocument: record.contractDocument,
    agentConfidenceLevel: record.agentConfidenceLevel,
  })

  if (!validation.success) {
    const firstError = validation.error.issues[0]?.message ?? 'Validation failed'
    return { success: false, error: firstError }
  }

  // Update the record status to SUBMITTED (no separate Client record needed)
  await prisma.clientRecord.update({
    where: { id: draftId },
    data: {
      status: 'SUBMITTED',
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'CLIENT_DRAFT_SUBMITTED',
      description: `Client record submitted: ${record.firstName} ${record.lastName}`,
      userId: session.user.id,
      metadata: { draftId, clientRecordId: draftId },
    },
  })

  // Auto-create todo: Collect Debit Card Information (cards arrive ~7 days after intake)
  const clientName = `${record.firstName} ${record.lastName}`
  await prisma.todo.create({
    data: {
      title: 'Collect Debit Card Information',
      description: `Collect Debit Card Information — ${clientName}`,
      issueCategory: 'Collect Debit Card Information',
      clientRecordId: draftId,
      assignedToId: session.user.id,
      createdById: session.user.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      status: 'PENDING',
    },
  })

  revalidatePath('/agent/new-client')
  revalidatePath('/agent/clients')
  revalidatePath('/agent/todo-list')
  revalidatePath('/backoffice/client-management')
  revalidatePath('/backoffice/sales-interaction')

  return { success: true, clientRecordId: draftId }
}

/**
 * Update debit card information for a submitted record.
 * Called from the Upload Card dialog on the sales interaction page.
 * Merges card data into the record's platformData JSON.
 */
export async function updateDebitCardInfo(
  draftId: string,
  data: {
    bankCard?: { cardNumber: string; cvv: string; expiry: string; images: string[] }
    edgeboostCard?: { cardNumber: string; cvv: string; expiry: string; images: string[] }
  },
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  // Allow backoffice/admin or the closing agent
  const role = session.user.role
  const isPrivileged = role === 'ADMIN' || role === 'BACKOFFICE'
  const record = await prisma.clientRecord.findFirst({
    where: isPrivileged ? { id: draftId } : { id: draftId, closerId: session.user.id },
    select: { id: true, platformData: true, firstName: true, lastName: true },
  })

  if (!record) return { success: false, error: 'Draft not found' }

  // Merge card data into platformData
  const platformData = (record.platformData as Record<string, Record<string, unknown>>) || {}

  if (data.bankCard) {
    if (!platformData.onlineBanking) platformData.onlineBanking = {}
    platformData.onlineBanking.cardNumber = data.bankCard.cardNumber
    platformData.onlineBanking.cvv = data.bankCard.cvv
    platformData.onlineBanking.cardExpiry = data.bankCard.expiry
    platformData.onlineBanking.cardImages = data.bankCard.images
  }

  if (data.edgeboostCard) {
    if (!platformData.edgeboost) platformData.edgeboost = {}
    platformData.edgeboost.cardNumber = data.edgeboostCard.cardNumber
    platformData.edgeboost.cvv = data.edgeboostCard.cvv
    platformData.edgeboost.cardExpiry = data.edgeboostCard.expiry
    platformData.edgeboost.cardImages = data.edgeboostCard.images
  }

  await prisma.clientRecord.update({
    where: { id: draftId },
    // Roundtrip through JSON to produce a clean Prisma-compatible JsonValue
    data: { platformData: JSON.parse(JSON.stringify(platformData)) },
  })

  // Log event
  const clientName = `${record.firstName || ''} ${record.lastName || ''}`.trim()
  const cardsUploaded = [
    data.bankCard ? 'Bank' : null,
    data.edgeboostCard ? 'Edgeboost' : null,
  ].filter(Boolean).join(' + ')

  await prisma.eventLog.create({
    data: {
      eventType: 'DEBIT_CARD_UPLOADED',
      description: `Debit card info uploaded for ${clientName}: ${cardsUploaded}`,
      userId: session.user.id,
      metadata: {
        draftId,
        clientRecordId: draftId,
        clientName,
        cardsUploaded,
      },
    },
  })

  revalidatePath('/backoffice/sales-interaction')
  revalidatePath('/backoffice/client-management')

  return { success: true }
}

/**
 * Explicitly mark a review step as approved (backoffice/admin only).
 * Sets backofficeReviewedStep = max(current, stepNumber).
 */
export async function approveReviewStep(draftId: string, stepNumber: number) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'BACKOFFICE') {
    return { success: false, error: 'Not authorized' }
  }

  if (stepNumber < 1 || stepNumber > 4) {
    return { success: false, error: 'Invalid step number' }
  }

  const record = await prisma.clientRecord.findFirst({
    where: { id: draftId },
    select: { id: true, backofficeReviewedStep: true },
  })

  if (!record) return { success: false, error: 'Draft not found' }

  // Only advance, never go backwards
  if (stepNumber <= record.backofficeReviewedStep) {
    return { success: true, reviewedStep: record.backofficeReviewedStep }
  }

  const updated = await prisma.clientRecord.update({
    where: { id: draftId },
    data: { backofficeReviewedStep: stepNumber },
    select: { backofficeReviewedStep: true },
  })

  revalidatePath('/backoffice/sales-interaction')

  return { success: true, reviewedStep: updated.backofficeReviewedStep }
}

export async function getFullRecord(draftId: string) {
  const session = await auth()
  if (!session?.user) return { success: false as const, error: 'Not authenticated' }

  // Backoffice/admin can view any record; agents can only view their own
  const role = session.user.role
  const where = role === 'ADMIN' || role === 'BACKOFFICE'
    ? { id: draftId }
    : { id: draftId, closerId: session.user.id }

  const record = await prisma.clientRecord.findFirst({ where })

  if (!record) return { success: false as const, error: 'Draft not found' }

  return {
    success: true as const,
    draft: {
      ...record,
      idExpiry: record.idExpiry?.toISOString() ?? null,
      dateOfBirth: record.dateOfBirth?.toISOString() ?? null,
      approvedAt: record.approvedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    },
  }
}

export async function deleteClientRecord(draftId: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const record = await prisma.clientRecord.findFirst({
    where: { id: draftId, closerId: session.user.id },
    select: { id: true, status: true, idDocument: true },
  })

  if (!record) return { success: false, error: 'Draft not found' }
  if (record.status !== 'DRAFT') {
    return { success: false, error: 'Cannot delete submitted draft' }
  }
  if (record.idDocument) {
    return { success: false, error: 'Cannot delete draft after ID has been uploaded' }
  }

  // Delete related phone assignments first (FK constraint)
  await prisma.phoneAssignment.deleteMany({
    where: { clientRecordId: draftId },
  })

  await prisma.clientRecord.delete({
    where: { id: draftId },
  })

  revalidatePath('/agent/new-client')

  return { success: true }
}
