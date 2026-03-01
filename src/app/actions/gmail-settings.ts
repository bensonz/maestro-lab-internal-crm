'use server'

import prisma from '@/backend/prisma/client'
import { auth } from '@/backend/auth'
import { processNewEmails } from '@/lib/gmail/processor'
import { getAuthUrl } from '@/lib/gmail/client'

export async function getGmailStatus() {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Admin only' }
  }

  const integration = await prisma.gmailIntegration.findFirst({
    where: { isActive: true },
    select: {
      id: true,
      inboxEmail: true,
      lastSyncAt: true,
      isActive: true,
      createdAt: true,
    },
  })

  if (!integration) {
    return { success: true, connected: false }
  }

  // Get today's stats
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [processedToday, todosCreatedToday, fundsMatchedToday] = await Promise.all([
    prisma.processedEmail.count({
      where: { createdAt: { gte: todayStart } },
    }),
    prisma.processedEmail.count({
      where: {
        createdAt: { gte: todayStart },
        todoId: { not: null },
      },
    }),
    prisma.processedEmail.count({
      where: {
        createdAt: { gte: todayStart },
        fundAllocationId: { not: null },
      },
    }),
  ])

  return {
    success: true,
    connected: true,
    inboxEmail: integration.inboxEmail,
    lastSyncAt: integration.lastSyncAt,
    connectedAt: integration.createdAt,
    stats: {
      processedToday,
      todosCreatedToday,
      fundsMatchedToday,
    },
  }
}

export async function getGmailAuthUrl() {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Admin only' }
  }

  try {
    const url = getAuthUrl()
    return { success: true, url }
  } catch {
    return { success: false, error: 'Gmail OAuth not configured. Check GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REDIRECT_URI environment variables.' }
  }
}

export async function disconnectGmail() {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Admin only' }
  }

  await prisma.gmailIntegration.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  })

  return { success: true }
}

export async function triggerManualSync() {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  if (session.user.role !== 'ADMIN' && session.user.role !== 'BACKOFFICE') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const summary = await processNewEmails()
    return { success: true, summary }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: msg }
  }
}
