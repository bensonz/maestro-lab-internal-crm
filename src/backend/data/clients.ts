import prisma from '@/backend/prisma/client'

export async function countApprovedClients(closerId: string): Promise<number> {
  return prisma.client.count({
    where: { closerId, status: 'APPROVED' },
  })
}

export async function getClientById(clientId: string) {
  return prisma.client.findUnique({
    where: { id: clientId },
    include: {
      closer: { select: { id: true, name: true, email: true, starLevel: true } },
      bonusPool: {
        include: {
          allocations: {
            include: {
              agent: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  })
}

export async function getClientsByCloser(closerId: string) {
  const clients = await prisma.client.findMany({
    where: { closerId },
    orderBy: { createdAt: 'desc' },
    include: {
      closer: { select: { zelle: true } },
      bonusPool: { select: { id: true, status: true, totalAmount: true } },
      fromDraft: {
        select: {
          id: true,
          dateOfBirth: true,
          address: true,
          currentAddress: true,
          createdAt: true,
          updatedAt: true,
          status: true,
        },
      },
    },
  })

  // Fetch phone assignments for drafts
  const draftIds = clients
    .map((c) => c.fromDraft?.id)
    .filter((id): id is string => !!id)

  const phoneAssignments = draftIds.length > 0
    ? await prisma.phoneAssignment.findMany({
        where: { clientDraftId: { in: draftIds } },
        orderBy: { signedOutAt: 'desc' },
        select: {
          clientDraftId: true,
          phoneNumber: true,
        },
      })
    : []

  const draftPhoneMap = new Map<string, string>()
  for (const pa of phoneAssignments) {
    if (!draftPhoneMap.has(pa.clientDraftId)) {
      draftPhoneMap.set(pa.clientDraftId, pa.phoneNumber)
    }
  }

  return clients.map((c) => ({
    ...c,
    _phone: c.fromDraft?.id ? draftPhoneMap.get(c.fromDraft.id) ?? null : null,
  }))
}

export async function getAllClients() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      closer: { select: { id: true, name: true } },
      bonusPool: { select: { id: true, status: true, totalAmount: true } },
      fromDraft: true,
    },
  })

  // Fetch phone assignments for drafts that have them
  const draftIds = clients
    .map((c) => c.fromDraft?.id)
    .filter((id): id is string => !!id)

  const phoneAssignments = draftIds.length > 0
    ? await prisma.phoneAssignment.findMany({
        where: { clientDraftId: { in: draftIds } },
        orderBy: { signedOutAt: 'desc' },
        select: {
          clientDraftId: true,
          phoneNumber: true,
          carrier: true,
        },
      })
    : []

  // Map draft ID → latest phone assignment
  const draftPhoneMap = new Map<string, { phoneNumber: string; carrier: string | null }>()
  for (const pa of phoneAssignments) {
    if (!draftPhoneMap.has(pa.clientDraftId)) {
      draftPhoneMap.set(pa.clientDraftId, { phoneNumber: pa.phoneNumber, carrier: pa.carrier })
    }
  }

  return clients.map((c) => ({
    ...c,
    _phoneAssignment: c.fromDraft?.id ? draftPhoneMap.get(c.fromDraft.id) ?? null : null,
  }))
}

/**
 * Fetch a single client with full draft data for the detail page.
 */
export async function getClientWithDraft(clientId: string) {
  return prisma.client.findUnique({
    where: { id: clientId },
    include: {
      closer: { select: { id: true, name: true, email: true, starLevel: true } },
      bonusPool: {
        include: {
          allocations: {
            include: {
              agent: { select: { id: true, name: true } },
            },
          },
        },
      },
      fromDraft: true,
    },
  })
}

/**
 * Fetch event logs for a specific client.
 */
export async function getClientEventLogs(clientId: string) {
  // Get events that mention this client ID in metadata
  return prisma.eventLog.findMany({
    where: {
      OR: [
        { metadata: { path: ['clientId'], equals: clientId } },
        // Also search for draft-related events by checking if client has a linked draft
      ],
    },
    include: {
      user: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}
