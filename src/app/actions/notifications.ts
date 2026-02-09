'use server'

import { auth } from '@/backend/auth'
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '@/backend/services/notifications'

export async function getNotifications() {
  const session = await auth()
  if (!session?.user?.id) return { notifications: [], unreadCount: 0 }

  const [notifications, unreadCount] = await Promise.all([
    getUserNotifications(session.user.id, { limit: 20 }),
    getUnreadCount(session.user.id),
  ])

  return { notifications, unreadCount }
}

export async function markNotificationRead(notificationId: string) {
  const session = await auth()
  if (!session?.user?.id) return { success: false }

  await markAsRead(notificationId, session.user.id)
  return { success: true }
}

export async function markAllNotificationsRead() {
  const session = await auth()
  if (!session?.user?.id) return { success: false }

  await markAllAsRead(session.user.id)
  return { success: true }
}
