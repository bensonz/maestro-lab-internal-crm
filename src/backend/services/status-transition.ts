import prisma from '@/backend/prisma/client'
import {
  IntakeStatus,
  EventType,
  ToDoType,
  ToDoStatus,
  PlatformType,
} from '@/types'
import { ALL_PLATFORMS, getPlatformName } from '@/lib/platforms'

// ─── Allowed Transitions ──────────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<IntakeStatus, IntakeStatus[]> = {
  [IntakeStatus.PENDING]: [IntakeStatus.PHONE_ISSUED, IntakeStatus.REJECTED, IntakeStatus.INACTIVE],
  [IntakeStatus.PHONE_ISSUED]: [IntakeStatus.IN_EXECUTION, IntakeStatus.INACTIVE],
  [IntakeStatus.IN_EXECUTION]: [
    IntakeStatus.READY_FOR_APPROVAL,
    IntakeStatus.NEEDS_MORE_INFO,
    IntakeStatus.PENDING_EXTERNAL,
    IntakeStatus.EXECUTION_DELAYED,
    IntakeStatus.INACTIVE,
  ],
  [IntakeStatus.NEEDS_MORE_INFO]: [IntakeStatus.IN_EXECUTION, IntakeStatus.INACTIVE],
  [IntakeStatus.PENDING_EXTERNAL]: [IntakeStatus.IN_EXECUTION, IntakeStatus.INACTIVE],
  [IntakeStatus.EXECUTION_DELAYED]: [IntakeStatus.IN_EXECUTION, IntakeStatus.INACTIVE],
  [IntakeStatus.READY_FOR_APPROVAL]: [
    IntakeStatus.APPROVED,
    IntakeStatus.REJECTED,
    IntakeStatus.NEEDS_MORE_INFO,
  ],
  [IntakeStatus.APPROVED]: [],
  [IntakeStatus.REJECTED]: [],
  [IntakeStatus.INACTIVE]: [],
}

// ─── Business Day Helper ──────────────────────────────────────────────────────

export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dayOfWeek = result.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) added++
  }
  return result
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// ─── Todo Generation Rules ────────────────────────────────────────────────────

interface TodoTemplate {
  type: ToDoType
  title: string
  priority: number
  dueDate: Date
  platformType?: PlatformType
  stepNumber?: number
}

function getTodosForStatus(
  newStatus: IntakeStatus,
  executionDeadline: Date
): TodoTemplate[] {
  const now = new Date()

  switch (newStatus) {
    case IntakeStatus.PHONE_ISSUED:
      return [
        { type: ToDoType.VERIFICATION, title: 'Verify client identity documents', priority: 2, dueDate: addDays(now, 1) },
        { type: ToDoType.VERIFICATION, title: 'Set up bank account', priority: 1, dueDate: addDays(now, 2) },
      ]

    case IntakeStatus.IN_EXECUTION:
      return [
        ...ALL_PLATFORMS.map((platform, index) => ({
          type: ToDoType.UPLOAD_SCREENSHOT as ToDoType,
          title: `Upload screenshot for ${getPlatformName(platform)}`,
          priority: 1,
          dueDate: executionDeadline,
          platformType: platform,
          stepNumber: index + 1,
        })),
        { type: ToDoType.EXECUTION, title: 'Complete all platform registrations', priority: 2, dueDate: executionDeadline },
      ]

    case IntakeStatus.NEEDS_MORE_INFO:
      return [
        { type: ToDoType.PROVIDE_INFO, title: 'Provide additional information requested', priority: 2, dueDate: addDays(now, 2) },
      ]

    case IntakeStatus.APPROVED:
      return [
        { type: ToDoType.PHONE_SIGNOUT, title: 'Sign out of all platform accounts on phone', priority: 2, dueDate: addDays(now, 1) },
        { type: ToDoType.PHONE_RETURN, title: 'Return company phone', priority: 1, dueDate: addDays(now, 2) },
      ]

    default:
      return []
  }
}

// ─── Main Transition Function ─────────────────────────────────────────────────

export async function transitionClientStatus(
  clientId: string,
  newStatus: IntakeStatus,
  userId: string,
  options?: {
    reason?: string
    metadata?: Record<string, unknown>
    executionDeadlineDays?: number
  }
): Promise<{ success: boolean; error?: string }> {
  // 1. Fetch client
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      intakeStatus: true,
      agentId: true,
      firstName: true,
      lastName: true,
      executionDeadline: true,
    },
  })

  if (!client) {
    return { success: false, error: 'Client not found' }
  }

  // 2. Validate transition
  const allowed = ALLOWED_TRANSITIONS[client.intakeStatus] ?? []
  if (!allowed.includes(newStatus)) {
    return {
      success: false,
      error: `Cannot transition from ${client.intakeStatus} to ${newStatus}`,
    }
  }

  // 3. Calculate execution deadline if entering IN_EXECUTION
  const deadlineDays = options?.executionDeadlineDays ?? 3
  const executionDeadline =
    newStatus === IntakeStatus.IN_EXECUTION
      ? addBusinessDays(new Date(), deadlineDays)
      : (client.executionDeadline ?? addBusinessDays(new Date(), deadlineDays))

  // 4. Determine todos to create
  const todoTemplates = getTodosForStatus(newStatus, executionDeadline)
  const isTerminalStatus =
    newStatus === IntakeStatus.REJECTED ||
    newStatus === IntakeStatus.INACTIVE

  try {
    await prisma.$transaction(async (tx) => {
      // Update client status
      await tx.client.update({
        where: { id: clientId },
        data: {
          intakeStatus: newStatus,
          statusChangedAt: new Date(),
          ...(newStatus === IntakeStatus.IN_EXECUTION && { executionDeadline }),
        },
      })

      // Create event log
      await tx.eventLog.create({
        data: {
          eventType: EventType.STATUS_CHANGE,
          description: `Status changed from ${client.intakeStatus} to ${newStatus}${options?.reason ? `: ${options.reason}` : ''}`,
          clientId,
          userId,
          oldValue: client.intakeStatus,
          newValue: newStatus,
          metadata: (options?.metadata as Record<string, string>) ?? undefined,
        },
      })

      // Cancel pending todos for terminal statuses
      if (isTerminalStatus) {
        await tx.toDo.updateMany({
          where: {
            clientId,
            status: { in: [ToDoStatus.PENDING, ToDoStatus.IN_PROGRESS] },
          },
          data: {
            status: ToDoStatus.CANCELLED,
          },
        })
      }

      // Cancel status-specific todos when leaving certain states
      const todosToCancel: Partial<Record<IntakeStatus, ToDoType[]>> = {
        [IntakeStatus.NEEDS_MORE_INFO]: [ToDoType.PROVIDE_INFO],
        [IntakeStatus.PENDING_EXTERNAL]: [ToDoType.PROVIDE_INFO],
      }

      const cancelTypes = todosToCancel[client.intakeStatus]
      if (cancelTypes) {
        await tx.toDo.updateMany({
          where: {
            clientId,
            type: { in: cancelTypes },
            status: { in: [ToDoStatus.PENDING, ToDoStatus.IN_PROGRESS] },
          },
          data: {
            status: ToDoStatus.CANCELLED,
          },
        })
      }

      // Create new todos (with duplicate prevention for UPLOAD_SCREENSHOT)
      if (todoTemplates.length > 0 && client.agentId) {
        let templatesToCreate = todoTemplates

        // Duplicate prevention for IN_EXECUTION re-entry
        if (newStatus === IntakeStatus.IN_EXECUTION) {
          const existingScreenshotTodos = await tx.toDo.findMany({
            where: {
              clientId,
              type: ToDoType.UPLOAD_SCREENSHOT,
              status: { not: ToDoStatus.CANCELLED },
            },
            select: { platformType: true },
          })

          const existingPlatforms = new Set(
            existingScreenshotTodos.map((t) => t.platformType).filter(Boolean)
          )

          const existingExecTodo = await tx.toDo.findFirst({
            where: {
              clientId,
              type: ToDoType.EXECUTION,
              status: { not: ToDoStatus.CANCELLED },
            },
          })

          templatesToCreate = todoTemplates.filter((t) => {
            if (t.type === ToDoType.UPLOAD_SCREENSHOT && t.platformType) {
              return !existingPlatforms.has(t.platformType)
            }
            if (t.type === ToDoType.EXECUTION) {
              return !existingExecTodo
            }
            return true
          })
        }

        if (templatesToCreate.length > 0) {
          await tx.toDo.createMany({
            data: templatesToCreate.map((t) => ({
              title: t.title,
              type: t.type,
              priority: t.priority,
              dueDate: t.dueDate,
              platformType: t.platformType ?? null,
              stepNumber: t.stepNumber ?? null,
              clientId,
              assignedToId: client.agentId,
              createdById: userId,
            })),
          })

          // Log TODO_CREATED events for timeline visibility
          await tx.eventLog.createMany({
            data: templatesToCreate.map((t) => ({
              eventType: EventType.TODO_CREATED,
              description: t.title,
              clientId,
              userId,
            })),
          })
        }
      }
    })

    return { success: true }
  } catch (error) {
    console.error('Status transition error:', error)
    return { success: false, error: 'Failed to transition status' }
  }
}
