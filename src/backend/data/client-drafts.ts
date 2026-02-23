import prisma from '@/backend/prisma/client'

export async function getDraftsByCloser(closerId: string) {
  return prisma.clientDraft.findMany({
    where: { closerId, status: 'DRAFT' },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      step: true,
      updatedAt: true,
      status: true,
      // Step 1 fields (for inner-step progress)
      idDocument: true,
      assignedGmail: true,
      gmailScreenshot: true,
      betmgmCheckPassed: true,
      betmgmRegScreenshot: true,
      betmgmLoginScreenshot: true,
      // Step 2 fields
      ssnDocument: true,
      secondAddress: true,
      hasCriminalRecord: true,
      bankingHistory: true,
      // Step 3 fields
      platformData: true,
      // Step 4 fields
      contractDocument: true,
    },
  })
}

export async function getDraftById(draftId: string) {
  return prisma.clientDraft.findUnique({
    where: { id: draftId },
  })
}

export async function getAllDrafts() {
  return prisma.clientDraft.findMany({
    where: { status: 'DRAFT' },
    orderBy: { updatedAt: 'desc' },
    include: {
      closer: { select: { id: true, name: true } },
    },
  })
}

/** Fetch all drafts (DRAFT + SUBMITTED with PENDING client) for backoffice sales interaction */
export async function getAllDraftsForBackoffice() {
  return prisma.clientDraft.findMany({
    where: {
      OR: [
        { status: 'DRAFT' },
        {
          status: 'SUBMITTED',
          resultClient: { status: 'PENDING' },
        },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      closer: { select: { id: true, name: true } },
    },
  })
}

export async function getDraftByIdForAgent(draftId: string, closerId: string) {
  return prisma.clientDraft.findFirst({
    where: { id: draftId, closerId },
  })
}
