'use server'

import { auth } from '@/backend/auth'
import { revalidatePath } from 'next/cache'
import { closeClient, verifyZeroBalances } from '@/backend/services/closure'
import { UserRole } from '@/types'

const ALLOWED_ROLES: string[] = [UserRole.ADMIN, UserRole.BACKOFFICE]

export async function closeClientAction(data: {
  clientId: string
  reason: string
  proofUrls?: string[]
  skipBalanceCheck?: boolean
}) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  // Only ADMIN and BACKOFFICE can close clients
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  // Only ADMIN can skip balance check
  if (data.skipBalanceCheck && session.user.role !== UserRole.ADMIN) {
    return { success: false, error: 'Only admins can skip balance verification' }
  }

  const result = await closeClient({
    clientId: data.clientId,
    closedById: session.user.id,
    reason: data.reason,
    proofUrls: data.proofUrls,
    skipBalanceCheck: data.skipBalanceCheck,
  })

  if (result.success) {
    revalidatePath('/backoffice/client-management')
    revalidatePath(`/agent/clients/${data.clientId}`)
    revalidatePath('/backoffice')
  }

  return result
}

export async function checkBalancesAction(clientId: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const result = await verifyZeroBalances(clientId)
  return { success: true, ...result }
}
