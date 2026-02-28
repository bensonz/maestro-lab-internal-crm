'use server'

import prisma from '@/backend/prisma/client'
import { auth } from '@/backend/auth'

/**
 * Fetch recent EventLog entries for the current agent as notifications.
 * Returns events targeted at this user (userId = agent.id) that are
 * notification-worthy (approvals, todo assignments, device events, etc.).
 */
export async function getAgentNotifications() {
  const session = await auth()
  if (!session?.user) return { notifications: [], unreadCount: 0 }

  const agentId = session.user.id

  // Notification-worthy event types for agents
  const notificationTypes = [
    'CLIENT_APPROVED_NOTIFICATION',
    'TODO_ASSIGNED',
    'TODO_COMPLETED',
    'TODO_REVERTED',
    'DEVICE_SIGNED_OUT',
    'DEVICE_RETURNED',
    'DEVICE_REISSUED',
    'STAR_LEVEL_CHANGED',
    'LEADERSHIP_PROMOTED',
    'ALLOCATION_PAID',
  ] as const

  try {
    const events = await prisma.eventLog.findMany({
      where: {
        userId: agentId,
        eventType: { in: [...notificationTypes] },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const notifications = events.map((e) => {
      const meta = (e.metadata ?? {}) as Record<string, unknown>
      const clientId = (meta.clientId as string) ?? null

      // Map event type to notification display
      let title = ''
      let link: string | null = null
      switch (e.eventType) {
        case 'CLIENT_APPROVED_NOTIFICATION':
          title = 'Client Approved'
          link = '/agent/clients'
          break
        case 'TODO_ASSIGNED':
          title = 'New Task Assigned'
          link = '/agent/todo-list'
          break
        case 'TODO_COMPLETED':
          title = 'Task Completed'
          link = '/agent/todo-list'
          break
        case 'TODO_REVERTED':
          title = 'Task Reverted'
          link = '/agent/todo-list'
          break
        case 'DEVICE_SIGNED_OUT':
          title = 'Device Signed Out'
          link = clientId ? `/agent/new-client?draft=${meta.draftId || ''}` : '/agent/todo-list'
          break
        case 'DEVICE_RETURNED':
          title = 'Device Returned'
          link = '/agent/todo-list'
          break
        case 'STAR_LEVEL_CHANGED':
          title = 'Star Level Changed'
          link = '/agent/earnings'
          break
        case 'LEADERSHIP_PROMOTED':
          title = 'Leadership Promotion'
          link = '/agent/earnings'
          break
        case 'ALLOCATION_PAID':
          title = 'Payment Received'
          link = '/agent/earnings'
          break
        default:
          title = 'Notification'
          link = '/agent'
      }

      return {
        id: e.id,
        type: e.eventType,
        title,
        message: e.description,
        link,
        isRead: false, // EventLog doesn't track read status; all shown as unread
        readAt: null as Date | null,
        createdAt: e.createdAt,
      }
    })

    return {
      notifications,
      unreadCount: notifications.length,
    }
  } catch {
    return { notifications: [], unreadCount: 0 }
  }
}
