import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/backend/prisma/client', () => ({
  default: {
    notification: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}))

import prisma from '@/backend/prisma/client'
import {
  createNotification,
  notifyRole,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '@/backend/services/notifications'

const mockNotification = prisma.notification as unknown as {
  create: ReturnType<typeof vi.fn>
  createMany: ReturnType<typeof vi.fn>
  findMany: ReturnType<typeof vi.fn>
  count: ReturnType<typeof vi.fn>
  updateMany: ReturnType<typeof vi.fn>
}

const mockUser = prisma.user as unknown as {
  findMany: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createNotification', () => {
  it('creates a notification with all fields', async () => {
    const data = {
      userId: 'user-1',
      type: 'APPROVAL',
      title: 'Client approved',
      message: 'Client John Doe has been approved!',
      link: '/agent/clients/client-1',
      eventLogId: 'event-1',
      clientId: 'client-1',
    }

    const expected = { id: 'notif-1', ...data, isRead: false, readAt: null, createdAt: new Date() }
    mockNotification.create.mockResolvedValue(expected)

    const result = await createNotification(data)

    expect(mockNotification.create).toHaveBeenCalledWith({ data })
    expect(result).toEqual(expected)
  })
})

describe('notifyRole', () => {
  it('creates notifications for all users with matching role', async () => {
    mockUser.findMany.mockResolvedValue([
      { id: 'admin-1' },
      { id: 'admin-2' },
    ])
    mockNotification.createMany.mockResolvedValue({ count: 2 })

    const result = await notifyRole({
      role: 'ADMIN',
      type: 'SETTLEMENT_CREATED',
      title: 'Settlement confirmed',
      message: 'Settlement $500 confirmed',
      link: '/backoffice/client-settlement',
    })

    expect(mockUser.findMany).toHaveBeenCalledWith({
      where: { role: { in: ['ADMIN'] }, isActive: true },
      select: { id: true },
    })
    expect(mockNotification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ userId: 'admin-1', type: 'SETTLEMENT_CREATED' }),
        expect.objectContaining({ userId: 'admin-2', type: 'SETTLEMENT_CREATED' }),
      ],
    })
    expect(result).toEqual({ count: 2 })
  })

  it('accepts multiple roles as array', async () => {
    mockUser.findMany.mockResolvedValue([{ id: 'user-1' }])
    mockNotification.createMany.mockResolvedValue({ count: 1 })

    await notifyRole({
      role: ['ADMIN', 'BACKOFFICE'],
      type: 'TEST',
      title: 'Test',
      message: 'Test message',
    })

    expect(mockUser.findMany).toHaveBeenCalledWith({
      where: { role: { in: ['ADMIN', 'BACKOFFICE'] }, isActive: true },
      select: { id: true },
    })
  })

  it('returns empty array when no users match', async () => {
    mockUser.findMany.mockResolvedValue([])

    const result = await notifyRole({
      role: 'FINANCE',
      type: 'TEST',
      title: 'Test',
      message: 'No one here',
    })

    expect(result).toEqual([])
    expect(mockNotification.createMany).not.toHaveBeenCalled()
  })
})

describe('getUserNotifications', () => {
  const now = new Date()
  const notifications = [
    { id: 'n1', userId: 'user-1', isRead: false, createdAt: now },
    { id: 'n2', userId: 'user-1', isRead: true, createdAt: new Date(now.getTime() - 60_000) },
  ]

  it('returns notifications for user sorted by date desc', async () => {
    mockNotification.findMany.mockResolvedValue(notifications)

    const result = await getUserNotifications('user-1')

    expect(mockNotification.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    expect(result).toEqual(notifications)
  })

  it('filters unreadOnly when specified', async () => {
    mockNotification.findMany.mockResolvedValue([notifications[0]])

    const result = await getUserNotifications('user-1', { unreadOnly: true })

    expect(mockNotification.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    expect(result).toHaveLength(1)
  })

  it('respects custom limit', async () => {
    mockNotification.findMany.mockResolvedValue([notifications[0]])

    await getUserNotifications('user-1', { limit: 5 })

    expect(mockNotification.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })
  })
})

describe('getUnreadCount', () => {
  it('returns correct unread count', async () => {
    mockNotification.count.mockResolvedValue(7)

    const result = await getUnreadCount('user-1')

    expect(mockNotification.count).toHaveBeenCalledWith({
      where: { userId: 'user-1', isRead: false },
    })
    expect(result).toBe(7)
  })
})

describe('markAsRead', () => {
  it('sets isRead and readAt for the notification', async () => {
    mockNotification.updateMany.mockResolvedValue({ count: 1 })

    const result = await markAsRead('notif-1', 'user-1')

    expect(mockNotification.updateMany).toHaveBeenCalledWith({
      where: { id: 'notif-1', userId: 'user-1' },
      data: { isRead: true, readAt: expect.any(Date) },
    })
    expect(result).toEqual({ count: 1 })
  })

  it('only marks own notifications (userId guard)', async () => {
    mockNotification.updateMany.mockResolvedValue({ count: 0 })

    const result = await markAsRead('notif-1', 'wrong-user')

    expect(mockNotification.updateMany).toHaveBeenCalledWith({
      where: { id: 'notif-1', userId: 'wrong-user' },
      data: { isRead: true, readAt: expect.any(Date) },
    })
    // count: 0 means no rows matched — the userId guard worked
    expect(result).toEqual({ count: 0 })
  })
})

describe('markAllAsRead', () => {
  it('marks all unread notifications as read for user', async () => {
    mockNotification.updateMany.mockResolvedValue({ count: 3 })

    const result = await markAllAsRead('user-1')

    expect(mockNotification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', isRead: false },
      data: { isRead: true, readAt: expect.any(Date) },
    })
    expect(result).toEqual({ count: 3 })
  })
})
