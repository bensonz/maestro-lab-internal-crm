'use server'

import prisma from '@/backend/prisma/client'
import { auth } from '@/backend/auth'
import { revalidatePath } from 'next/cache'

import { ISSUE_CATEGORIES, type IssueCategory } from '@/lib/todo-categories'

export async function assignTodo(
  issueCategory: string,
  dueDate: string,
  target: { clientDraftId?: string; clientId?: string },
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

  const { clientDraftId, clientId } = target
  if (!clientDraftId?.trim() && !clientId?.trim()) {
    return { success: false, error: 'Client draft or client ID is required' }
  }

  if (!dueDate?.trim()) {
    return { success: false, error: 'Due date is required' }
  }

  const parsedDueDate = new Date(dueDate)
  if (isNaN(parsedDueDate.getTime())) {
    return { success: false, error: 'Invalid due date' }
  }

  let clientName = 'Unknown Client'
  let agentId: string
  let agentName: string
  let resolvedDraftId: string | undefined
  let resolvedClientId: string | undefined

  if (clientDraftId?.trim()) {
    // Look up the draft to get agent and client name
    const draft = await prisma.clientDraft.findUnique({
      where: { id: clientDraftId },
      select: {
        id: true,
        closerId: true,
        firstName: true,
        lastName: true,
        closer: { select: { name: true } },
      },
    })
    if (!draft) return { success: false, error: 'Client draft not found' }

    clientName = [draft.firstName, draft.lastName].filter(Boolean).join(' ') || 'Unknown Client'
    agentId = draft.closerId
    agentName = draft.closer.name
    resolvedDraftId = draft.id
  } else {
    // Look up the client to get closer agent
    const client = await prisma.client.findUnique({
      where: { id: clientId! },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        closerId: true,
        closer: { select: { name: true } },
      },
    })
    if (!client) return { success: false, error: 'Client not found' }

    clientName = [client.firstName, client.lastName].filter(Boolean).join(' ') || 'Unknown Client'
    agentId = client.closerId
    agentName = client.closer.name
    resolvedClientId = client.id
  }

  // Create todo + event log
  const todo = await prisma.todo.create({
    data: {
      title: issueCategory,
      description: `${issueCategory} — ${clientName}`,
      issueCategory,
      clientDraftId: resolvedDraftId ?? null,
      clientId: resolvedClientId ?? null,
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
        clientDraftId: resolvedDraftId,
        clientId: resolvedClientId,
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
      clientDraft: { select: { firstName: true, lastName: true } },
      client: { select: { firstName: true, lastName: true } },
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
  })

  if (!todo) return { success: false, error: 'Todo not found' }
  if (todo.status !== 'PENDING') return { success: false, error: 'Todo is not pending' }

  const clientName = [
    todo.clientDraft?.firstName ?? todo.client?.firstName,
    todo.clientDraft?.lastName ?? todo.client?.lastName,
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
        clientDraftId: todo.clientDraftId,
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
      clientDraft: { select: { firstName: true, lastName: true } },
      client: { select: { firstName: true, lastName: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  })

  if (!todo) return { success: false, error: 'Todo not found' }
  if (todo.status !== 'COMPLETED') return { success: false, error: 'Todo is not completed' }

  const clientName = [
    todo.clientDraft?.firstName ?? todo.client?.firstName,
    todo.clientDraft?.lastName ?? todo.client?.lastName,
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
        clientDraftId: todo.clientDraftId,
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
