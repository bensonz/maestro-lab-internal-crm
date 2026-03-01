import prisma from '@/backend/prisma/client'
import { format } from 'date-fns'
import type { TodoTimelineEntry } from '@/types/backend-types'

/**
 * Aggregation function for the backoffice Action Hub.
 * Runs all queries in parallel for performance.
 */
export async function getActionHubData() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const tomorrowEnd = new Date(todayStart)
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 2)

  const [
    pendingTodos,
    overdueDevices,
    deviceReservations,
    submittedDrafts,
    draftsByStep,
    todayAllocations,
    yesterdayAllocCount,
    recentTimeline,
    tomorrowDueTodos,
    unconfirmedAllocations,
  ] = await Promise.all([
    // Pending todos (sorted by due date, overdue first)
    prisma.todo.findMany({
      where: { status: 'PENDING' },
      include: {
        clientDraft: {
          select: { id: true, firstName: true, lastName: true },
        },
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    }),

    // Overdue devices (SIGNED_OUT + dueBackAt < now)
    prisma.phoneAssignment.findMany({
      where: {
        status: 'SIGNED_OUT',
        dueBackAt: { lt: now },
      },
      include: {
        agent: { select: { id: true, name: true } },
        clientDraft: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { dueBackAt: 'asc' },
    }),

    // Device reservations waiting (draft has reservation date but no active SIGNED_OUT assignment)
    prisma.clientDraft.findMany({
      where: {
        deviceReservationDate: { not: null },
        status: 'DRAFT',
        phoneAssignments: {
          none: { status: 'SIGNED_OUT' },
        },
      },
      include: {
        closer: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),

    // Step-4 SUBMITTED drafts (ready to approve)
    prisma.clientDraft.findMany({
      where: {
        status: 'SUBMITTED',
        resultClient: { status: 'PENDING' },
      },
      include: {
        closer: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),

    // Draft counts by step (active drafts only)
    prisma.clientDraft.groupBy({
      by: ['step'],
      where: { status: 'DRAFT' },
      _count: true,
    }),

    // Today's fund allocations
    prisma.fundAllocation.findMany({
      where: { createdAt: { gte: todayStart } },
      include: {
        recordedBy: { select: { id: true, name: true } },
        confirmedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),

    // Yesterday's allocation count
    prisma.fundAllocation.count({
      where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
    }),

    // Activity timeline (recent events)
    getActionHubTimeline(),

    // Todos due tomorrow (for closing rundown)
    prisma.todo.count({
      where: {
        status: 'PENDING',
        dueDate: { gte: todayStart, lt: tomorrowEnd },
      },
    }),

    // Unconfirmed fund allocations count
    prisma.fundAllocation.count({
      where: { confirmationStatus: 'UNCONFIRMED' },
    }),
  ])

  return {
    pendingTodos,
    overdueDevices,
    deviceReservations,
    submittedDrafts,
    draftsByStep,
    todayAllocations,
    yesterdayAllocCount,
    recentTimeline,
    tomorrowDueTodos,
    unconfirmedAllocations,
  }
}

/**
 * Activity timeline for the Action Hub — includes todo, device, fund, and approval events.
 */
async function getActionHubTimeline(): Promise<TodoTimelineEntry[]> {
  const events = await prisma.eventLog.findMany({
    where: {
      eventType: {
        in: [
          'TODO_ASSIGNED',
          'TODO_COMPLETED',
          'TODO_REVERTED',
          'DEVICE_SIGNED_OUT',
          'DEVICE_RETURNED',
          'DEVICE_REISSUED',
          'CLIENT_APPROVED',
          'CLIENT_APPROVAL_REVERTED',
          'FUND_ALLOCATED',
        ],
      },
    },
    include: {
      user: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const actionMap: Record<string, TodoTimelineEntry['action']> = {
    TODO_ASSIGNED: 'assigned',
    TODO_COMPLETED: 'completed',
    TODO_REVERTED: 'reverted',
    DEVICE_SIGNED_OUT: 'device_out',
    DEVICE_RETURNED: 'device_returned',
    DEVICE_REISSUED: 'device_reissued',
    CLIENT_APPROVED: 'client_approved',
    CLIENT_APPROVAL_REVERTED: 'client_reverted',
    FUND_ALLOCATED: 'assigned', // reuse 'assigned' visual style
  }

  const typeMap: Record<string, 'info' | 'success' | 'warning'> = {
    TODO_ASSIGNED: 'info',
    TODO_COMPLETED: 'success',
    TODO_REVERTED: 'warning',
    DEVICE_SIGNED_OUT: 'info',
    DEVICE_RETURNED: 'success',
    DEVICE_REISSUED: 'warning',
    CLIENT_APPROVED: 'success',
    CLIENT_APPROVAL_REVERTED: 'warning',
    FUND_ALLOCATED: 'info',
  }

  return events.map((e) => ({
    id: e.id,
    date: format(e.createdAt, 'MMM d, yyyy'),
    time: format(e.createdAt, 'h:mm a'),
    event: e.description,
    type: typeMap[e.eventType] ?? 'info',
    actor: e.user?.name ?? null,
    action: actionMap[e.eventType] ?? 'assigned',
  }))
}
