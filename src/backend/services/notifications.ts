import prisma from '@/backend/prisma/client'
import logger from '@/backend/logger'

/**
 * Create a notification for a specific user.
 * Called after event logs are created.
 */
export async function createNotification(params: {
  userId: string
  type: string
  title: string
  message: string
  link?: string
  eventLogId?: string
  clientId?: string
}) {
  logger.info('Creating notification', { userId: params.userId, type: params.type })
  return prisma.notification.create({ data: params })
}

/**
 * Create notifications for multiple users (e.g., all backoffice staff).
 */
export async function notifyRole(params: {
  role: string | string[]
  type: string
  title: string
  message: string
  link?: string
  eventLogId?: string
  clientId?: string
}) {
  const roles = Array.isArray(params.role) ? params.role : [params.role]
  const users = await prisma.user.findMany({
    where: { role: { in: roles as never[] }, isActive: true },
    select: { id: true },
  })

  if (users.length === 0) {
    logger.warn('notifyRole found 0 matching users', { roles, type: params.type })
    return []
  }

  logger.info('Sending role notifications', { roles, type: params.type, userCount: users.length })
  return prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
      eventLogId: params.eventLogId,
      clientId: params.clientId,
    })),
  })
}

/**
 * Get notifications for a user.
 */
export async function getUserNotifications(
  userId: string,
  options?: {
    unreadOnly?: boolean
    limit?: number
  },
) {
  return prisma.notification.findMany({
    where: {
      userId,
      ...(options?.unreadOnly ? { isRead: false } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 20,
  })
}

/**
 * Get unread count for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  })
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true, readAt: new Date() },
  })
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  })
}
