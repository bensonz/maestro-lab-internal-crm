'use server'

import prisma from '@/backend/prisma/client'
import { auth } from '@/backend/auth'
import { revalidatePath } from 'next/cache'

const ISSUE_CATEGORIES = [
  'Re-Open Bank Account / Schedule with Client',
  'Contact Bank',
  'Contact PayPal',
  'Platforms Verification',
] as const

type IssueCategory = (typeof ISSUE_CATEGORIES)[number]

export async function assignTodo(
  clientDraftId: string,
  issueCategory: string,
  dueDate: string,
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

  if (!clientDraftId?.trim()) {
    return { success: false, error: 'Client draft is required' }
  }

  if (!dueDate?.trim()) {
    return { success: false, error: 'Due date is required' }
  }

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

  const clientName = [draft.firstName, draft.lastName].filter(Boolean).join(' ') || 'Unknown Client'
  const parsedDueDate = new Date(dueDate)

  if (isNaN(parsedDueDate.getTime())) {
    return { success: false, error: 'Invalid due date' }
  }

  // Create todo + event log in a transaction
  const todo = await prisma.todo.create({
    data: {
      title: issueCategory,
      description: `${issueCategory} — ${clientName}`,
      issueCategory,
      clientDraftId: draft.id,
      assignedToId: draft.closerId,
      createdById: session.user.id,
      dueDate: parsedDueDate,
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'TODO_ASSIGNED',
      description: `To-do assigned: "${issueCategory}" for ${clientName} to ${draft.closer.name}`,
      userId: session.user.id,
      metadata: {
        todoId: todo.id,
        clientDraftId: draft.id,
        clientName,
        agentId: draft.closerId,
        agentName: draft.closer.name,
        issueCategory,
        dueDate,
      },
    },
  })

  revalidatePath('/backoffice/sales-interaction')
  revalidatePath('/agent/todo-list')

  return { success: true, todoId: todo.id }
}
