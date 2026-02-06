'use server'

import { auth } from '@/backend/auth'
import { transitionClientStatus } from '@/backend/services/status-transition'
import { detectAndMarkOverdueClients } from '@/backend/services/overdue-detection'
import { IntakeStatus, UserRole } from '@/types'
import { revalidatePath } from 'next/cache'

const BACKOFFICE_ROLES: string[] = [UserRole.BACKOFFICE, UserRole.ADMIN]

function revalidateAll(clientId: string) {
  revalidatePath('/backoffice/sales-interaction')
  revalidatePath('/backoffice')
  revalidatePath(`/agent/clients/${clientId}`)
  revalidatePath('/agent/clients')
}

export async function changeClientStatus(
  clientId: string,
  newStatus: IntakeStatus,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id || !BACKOFFICE_ROLES.includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  const result = await transitionClientStatus(clientId, newStatus, session.user.id, { reason })

  if (result.success) {
    revalidateAll(clientId)
  }

  return result
}

export async function issuePhone(
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id || !BACKOFFICE_ROLES.includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  const result = await transitionClientStatus(clientId, IntakeStatus.PHONE_ISSUED, session.user.id)

  if (result.success) {
    revalidateAll(clientId)
  }

  return result
}

export async function startExecution(
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id || !BACKOFFICE_ROLES.includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  const result = await transitionClientStatus(clientId, IntakeStatus.IN_EXECUTION, session.user.id)

  if (result.success) {
    revalidateAll(clientId)
  }

  return result
}

export async function requestClientMoreInfo(
  clientId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id || !BACKOFFICE_ROLES.includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  const result = await transitionClientStatus(
    clientId,
    IntakeStatus.NEEDS_MORE_INFO,
    session.user.id,
    { reason }
  )

  if (result.success) {
    revalidateAll(clientId)
  }

  return result
}

export async function rejectClient(
  clientId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id || !BACKOFFICE_ROLES.includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  const result = await transitionClientStatus(
    clientId,
    IntakeStatus.REJECTED,
    session.user.id,
    { reason }
  )

  if (result.success) {
    revalidateAll(clientId)
  }

  return result
}

export async function checkOverdueClients(): Promise<{
  success: boolean
  marked: number
  error?: string
}> {
  const session = await auth()
  if (!session?.user?.id || !BACKOFFICE_ROLES.includes(session.user.role)) {
    return { success: false, marked: 0, error: 'Unauthorized' }
  }

  try {
    const result = await detectAndMarkOverdueClients()

    revalidatePath('/backoffice')
    revalidatePath('/agent/clients')

    return { success: true, marked: result.marked }
  } catch (error) {
    console.error('Check overdue error:', error)
    return { success: false, marked: 0, error: 'Failed to check overdue clients' }
  }
}

export async function resumeExecution(
  clientId: string,
  newDeadlineDays?: number
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id || !BACKOFFICE_ROLES.includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  const days = newDeadlineDays ?? 3

  const result = await transitionClientStatus(
    clientId,
    IntakeStatus.IN_EXECUTION,
    session.user.id,
    {
      reason: `Resumed execution with ${days} business day deadline`,
      executionDeadlineDays: days,
    }
  )

  if (result.success) {
    revalidateAll(clientId)
  }

  return result
}
