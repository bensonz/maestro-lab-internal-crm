import prisma from '@/backend/prisma/client'

// ── Functions migrated from client-drafts.ts ─────────────────────────

export async function getRecordsByCloser(closerId: string) {
  return prisma.clientRecord.findMany({
    where: {
      closerId,
      status: { in: ['DRAFT', 'SUBMITTED'] },
    },
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

export async function getRecordById(recordId: string) {
  return prisma.clientRecord.findUnique({
    where: { id: recordId },
  })
}

export async function getAllDraftRecords() {
  return prisma.clientRecord.findMany({
    where: { status: 'DRAFT' },
    orderBy: { updatedAt: 'desc' },
    include: {
      closer: { select: { id: true, name: true } },
    },
  })
}

/** Fetch all records (DRAFT + SUBMITTED) for backoffice sales interaction */
export async function getAllRecordsForBackoffice() {
  return prisma.clientRecord.findMany({
    where: {
      status: { in: ['DRAFT', 'SUBMITTED'] },
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      closer: { select: { id: true, name: true } },
    },
  })
}

/** Fetch APPROVED records for backoffice reviewed section */
export async function getApprovedRecordsForBackoffice() {
  return prisma.clientRecord.findMany({
    where: {
      status: 'APPROVED',
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      closerId: true,
      approvedAt: true,
      updatedAt: true,
      closer: { select: { id: true, name: true } },
    },
    take: 50,
  })
}

export async function getRecordByIdForAgent(recordId: string, closerId: string) {
  return prisma.clientRecord.findFirst({
    where: { id: recordId, closerId },
  })
}

/** Fetch a single record with all related data for the agent client detail view */
export async function getRecordDetailForAgent(recordId: string, closerId: string) {
  return prisma.clientRecord.findFirst({
    where: { id: recordId, closerId },
    include: {
      closer: { select: { id: true, name: true, email: true } },
      bonusPool: {
        include: {
          allocations: {
            include: {
              agent: { select: { id: true, name: true } },
            },
          },
        },
      },
      phoneAssignments: {
        orderBy: { signedOutAt: 'desc' },
        take: 1,
        select: {
          phoneNumber: true,
          deviceId: true,
          signedOutAt: true,
          returnedAt: true,
          status: true,
        },
      },
      todos: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          issueCategory: true,
          dueDate: true,
          status: true,
          metadata: true,
          createdAt: true,
        },
      },
    },
  })
}

// ── Functions migrated from clients.ts ───────────────────────────────

export async function countApprovedRecords(closerId: string): Promise<number> {
  return prisma.clientRecord.count({
    where: { closerId, status: 'APPROVED' },
  })
}

export async function getRecordWithBonusPool(recordId: string) {
  return prisma.clientRecord.findUnique({
    where: { id: recordId },
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

/** Fetch approved/submitted records by closer for the agent portal "My Clients" */
export async function getApprovedRecordsByCloser(closerId: string) {
  const records = await prisma.clientRecord.findMany({
    where: {
      closerId,
      status: { not: 'DRAFT' },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      closer: { select: { zelle: true } },
      bonusPool: { select: { id: true, status: true, totalAmount: true } },
    },
  })

  // Fetch phone assignments for records
  const recordIds = records.map((r) => r.id)

  const phoneAssignments = recordIds.length > 0
    ? await prisma.phoneAssignment.findMany({
        where: { clientRecordId: { in: recordIds } },
        orderBy: { signedOutAt: 'desc' },
        select: {
          clientRecordId: true,
          phoneNumber: true,
        },
      })
    : []

  const recordPhoneMap = new Map<string, string>()
  for (const pa of phoneAssignments) {
    if (!recordPhoneMap.has(pa.clientRecordId)) {
      recordPhoneMap.set(pa.clientRecordId, pa.phoneNumber)
    }
  }

  return records.map((r) => ({
    ...r,
    _phone: recordPhoneMap.get(r.id) ?? null,
  }))
}

/** Fetch all approved records for backoffice client management */
export async function getAllApprovedRecords() {
  const records = await prisma.clientRecord.findMany({
    where: {
      status: 'APPROVED',
    },
    orderBy: { createdAt: 'desc' },
    include: {
      closer: { select: { id: true, name: true, zelle: true } },
      bonusPool: { select: { id: true, status: true, totalAmount: true } },
      transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  })

  // Fetch phone assignments for records
  const recordIds = records.map((r) => r.id)

  const phoneAssignments = recordIds.length > 0
    ? await prisma.phoneAssignment.findMany({
        where: { clientRecordId: { in: recordIds } },
        orderBy: { signedOutAt: 'desc' },
        select: {
          clientRecordId: true,
          phoneNumber: true,
          carrier: true,
        },
      })
    : []

  // Map record ID -> latest phone assignment
  const recordPhoneMap = new Map<string, { phoneNumber: string; carrier: string | null }>()
  for (const pa of phoneAssignments) {
    if (!recordPhoneMap.has(pa.clientRecordId)) {
      recordPhoneMap.set(pa.clientRecordId, { phoneNumber: pa.phoneNumber, carrier: pa.carrier })
    }
  }

  return records.map((r) => ({
    ...r,
    _phoneAssignment: recordPhoneMap.get(r.id) ?? null,
  }))
}

/**
 * Fetch a single record with full details for the detail page.
 */
export async function getRecordWithDetails(recordId: string) {
  return prisma.clientRecord.findUnique({
    where: { id: recordId },
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

/**
 * Fetch event logs for a specific client record.
 */
export async function getRecordEventLogs(clientRecordId: string) {
  // Get events that mention this record ID in metadata
  return prisma.eventLog.findMany({
    where: {
      OR: [
        { metadata: { path: ['clientRecordId'], equals: clientRecordId } },
        { metadata: { path: ['clientId'], equals: clientRecordId } },
        { metadata: { path: ['draftId'], equals: clientRecordId } },
      ],
    },
    include: {
      user: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}
