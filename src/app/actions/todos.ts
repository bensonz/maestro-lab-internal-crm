'use server'

import prisma from '@/backend/prisma/client'
import { auth } from '@/backend/auth'
import { revalidatePath } from 'next/cache'

import { ISSUE_CATEGORIES, type IssueCategory } from '@/lib/todo-categories'

export async function assignTodo(
  issueCategory: string,
  dueDate: string,
  target: { clientRecordId: string },
) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'BACKOFFICE') {
    return { success: false, error: 'Unauthorized' }
  }

  // Validate issue category
  if (!ISSUE_CATEGORIES.includes(issueCategory as IssueCategory)) {
    return { success: false, error: 'Invalid issue category' }
  }

  const { clientRecordId } = target
  if (!clientRecordId?.trim()) {
    return { success: false, error: 'Client record ID is required' }
  }

  if (!dueDate?.trim()) {
    return { success: false, error: 'Due date is required' }
  }

  const parsedDueDate = new Date(dueDate)
  if (isNaN(parsedDueDate.getTime())) {
    return { success: false, error: 'Invalid due date' }
  }

  // Look up the client record to get agent and client name
  const record = await prisma.clientRecord.findUnique({
    where: { id: clientRecordId },
    select: {
      id: true,
      closerId: true,
      firstName: true,
      lastName: true,
      closer: { select: { name: true } },
    },
  })
  if (!record) return { success: false, error: 'Client record not found' }

  const clientName = [record.firstName, record.lastName].filter(Boolean).join(' ') || 'Unknown Client'
  const agentId = record.closerId
  const agentName = record.closer.name

  // Create todo + event log
  const todo = await prisma.todo.create({
    data: {
      title: issueCategory,
      description: `${issueCategory} — ${clientName}`,
      issueCategory,
      clientRecordId: record.id,
      assignedToId: agentId,
      createdById: session.user.id,
      dueDate: parsedDueDate,
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'TODO_ASSIGNED',
      description: `To-do assigned: "${issueCategory}" for ${clientName} to ${agentName}`,
      userId: session.user.id,
      metadata: {
        todoId: todo.id,
        clientRecordId: record.id,
        clientName,
        agentId,
        agentName,
        issueCategory,
        dueDate,
      },
    },
  })

  revalidatePath('/backoffice/sales-interaction')
  revalidatePath('/agent/todo-list')

  return { success: true, todoId: todo.id }
}

export async function completeTodo(todoId: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'BACKOFFICE') {
    return { success: false, error: 'Unauthorized' }
  }

  if (!todoId?.trim()) {
    return { success: false, error: 'Todo ID is required' }
  }

  const todo = await prisma.todo.findUnique({
    where: { id: todoId },
    include: {
      clientRecord: { select: { firstName: true, lastName: true } },
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
  })

  if (!todo) return { success: false, error: 'Todo not found' }
  if (todo.status !== 'PENDING') return { success: false, error: 'Todo is not pending' }

  const clientName = [
    todo.clientRecord?.firstName,
    todo.clientRecord?.lastName,
  ].filter(Boolean).join(' ') || 'Unknown'

  await prisma.todo.update({
    where: { id: todoId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      metadata: {
        ...(todo.metadata && typeof todo.metadata === 'object' ? todo.metadata as Record<string, unknown> : {}),
        completedById: session.user.id,
      },
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'TODO_COMPLETED',
      description: `To-do completed: "${todo.issueCategory}" for ${clientName} (agent: ${todo.assignedTo.name})`,
      userId: session.user.id,
      metadata: {
        todoId: todo.id,
        clientRecordId: todo.clientRecordId,
        clientName,
        agentId: todo.assignedTo.id,
        agentName: todo.assignedTo.name,
        issueCategory: todo.issueCategory,
      },
    },
  })

  revalidatePath('/backoffice/sales-interaction')
  revalidatePath('/agent/todo-list')

  return { success: true }
}

export async function revertTodo(todoId: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'BACKOFFICE') {
    return { success: false, error: 'Unauthorized' }
  }

  if (!todoId?.trim()) {
    return { success: false, error: 'Todo ID is required' }
  }

  const todo = await prisma.todo.findUnique({
    where: { id: todoId },
    include: {
      clientRecord: { select: { firstName: true, lastName: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  })

  if (!todo) return { success: false, error: 'Todo not found' }
  if (todo.status !== 'COMPLETED') return { success: false, error: 'Todo is not completed' }

  const clientName = [
    todo.clientRecord?.firstName,
    todo.clientRecord?.lastName,
  ].filter(Boolean).join(' ') || 'Unknown'

  await prisma.todo.update({
    where: { id: todoId },
    data: {
      status: 'PENDING',
      completedAt: null,
      metadata: {
        ...(todo.metadata && typeof todo.metadata === 'object' ? todo.metadata as Record<string, unknown> : {}),
        revertedById: session.user.id,
        revertedAt: new Date().toISOString(),
      },
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'TODO_REVERTED',
      description: `To-do reverted to pending: "${todo.issueCategory}" for ${clientName} (agent: ${todo.assignedTo.name})`,
      userId: session.user.id,
      metadata: {
        todoId: todo.id,
        clientRecordId: todo.clientRecordId,
        clientName,
        agentId: todo.assignedTo.id,
        agentName: todo.assignedTo.name,
        issueCategory: todo.issueCategory,
        action: 'revert_to_pending',
      },
    },
  })

  revalidatePath('/backoffice/sales-interaction')
  revalidatePath('/agent/todo-list')

  return { success: true }
}
