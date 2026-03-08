import prisma from '@/backend/prisma/client'

/**
 * Find ClientRecords that have a deviceReservationDate set, are still in DRAFT status,
 * and do NOT have an active (SIGNED_OUT) PhoneAssignment.
 */
export async function getPendingDeviceRequests() {
  return prisma.clientRecord.findMany({
    where: {
      deviceReservationDate: { not: null },
      status: 'DRAFT',
      phoneAssignments: {
        none: { status: 'SIGNED_OUT' },
      },
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      closer: { select: { id: true, name: true } },
    },
  })
}

/**
 * Fetch the most recent PhoneAssignment for a specific record (any status).
 * Returns assignment info for display even after device is returned.
 */
export async function getAssignmentForRecord(recordId: string) {
  return prisma.phoneAssignment.findFirst({
    where: { clientRecordId: recordId },
    orderBy: { signedOutAt: 'desc' },
    select: {
      phoneNumber: true,
      signedOutAt: true,
      dueBackAt: true,
      status: true,
    },
  })
}

/**
 * Fetch all PhoneAssignments with status SIGNED_OUT, ordered by dueBackAt ascending (most urgent first).
 */
export async function getActivePhoneAssignments() {
  return prisma.phoneAssignment.findMany({
    where: { status: 'SIGNED_OUT' },
    orderBy: { dueBackAt: 'asc' },
    include: {
      clientRecord: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          step: true,
        },
      },
      agent: { select: { id: true, name: true } },
      signedOutBy: { select: { id: true, name: true } },
    },
  })
}

/**
 * Fetch the most recent RETURNED PhoneAssignment per record.
 * Used to show Undo/Re-issue button on step-4 rows.
 */
export async function getReturnedPhoneAssignments() {
  return prisma.phoneAssignment.findMany({
    where: { status: 'RETURNED' },
    orderBy: { returnedAt: 'desc' },
    select: {
      id: true,
      clientRecordId: true,
      phoneNumber: true,
      carrier: true,
    },
  })
}
