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
    },
  })
}

export async function getDraftById(draftId: string) {
  return prisma.clientDraft.findUnique({
    where: { id: draftId },
  })
}

export async function getDraftByIdForAgent(draftId: string, closerId: string) {
  return prisma.clientDraft.findFirst({
    where: { id: draftId, closerId },
  })
}
