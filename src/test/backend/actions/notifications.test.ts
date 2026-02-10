import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'

vi.mock('@/backend/auth', () => ({
  auth: vi.fn(),
}))

type MockedAuth = Mock<
  () => Promise<{ user: { id: string; role: string }; expires: string } | null>
>

vi.mock('@/backend/services/notifications', () => ({
  getUserNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
}))

import { auth } from '@/backend/auth'
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '@/backend/services/notifications'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/app/actions/notifications'

const mockedAuth = auth as unknown as MockedAuth
const mockedGetUserNotifications = getUserNotifications as ReturnType<typeof vi.fn>
const mockedGetUnreadCount = getUnreadCount as ReturnType<typeof vi.fn>
const mockedMarkAsRead = markAsRead as ReturnType<typeof vi.fn>
const mockedMarkAllAsRead = markAllAsRead as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getNotifications', () => {
  it('returns empty for unauthenticated user', async () => {
    mockedAuth.mockResolvedValue(null)

    const result = await getNotifications()

    expect(result).toEqual({ notifications: [], unreadCount: 0 })
    expect(mockedGetUserNotifications).not.toHaveBeenCalled()
  })

  it('returns notifications and unread count for authenticated user', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'AGENT' },
      expires: '2099-01-01',
    })

    const notifications = [
      {
        id: 'n1',
        type: 'APPROVAL',
        title: 'Client approved',
        message: 'Client John Doe approved',
        isRead: false,
        createdAt: new Date(),
      },
    ]
    mockedGetUserNotifications.mockResolvedValue(notifications)
    mockedGetUnreadCount.mockResolvedValue(1)

    const result = await getNotifications()

    expect(mockedGetUserNotifications).toHaveBeenCalledWith('user-1', { limit: 20 })
    expect(mockedGetUnreadCount).toHaveBeenCalledWith('user-1')
    expect(result).toEqual({ notifications, unreadCount: 1 })
  })
})

describe('markNotificationRead', () => {
  it('returns failure for unauthenticated user', async () => {
    mockedAuth.mockResolvedValue(null)

    const result = await markNotificationRead('notif-1')

    expect(result).toEqual({ success: false })
    expect(mockedMarkAsRead).not.toHaveBeenCalled()
  })

  it('marks notification as read for authenticated user', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'AGENT' },
      expires: '2099-01-01',
    })
    mockedMarkAsRead.mockResolvedValue({ count: 1 })

    const result = await markNotificationRead('notif-1')

    expect(mockedMarkAsRead).toHaveBeenCalledWith('notif-1', 'user-1')
    expect(result).toEqual({ success: true })
  })
})

describe('markAllNotificationsRead', () => {
  it('returns failure for unauthenticated user', async () => {
    mockedAuth.mockResolvedValue(null)

    const result = await markAllNotificationsRead()

    expect(result).toEqual({ success: false })
    expect(mockedMarkAllAsRead).not.toHaveBeenCalled()
  })

  it('marks all notifications as read for authenticated user', async () => {
    mockedAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'AGENT' },
      expires: '2099-01-01',
    })
    mockedMarkAllAsRead.mockResolvedValue({ count: 5 })

    const result = await markAllNotificationsRead()

    expect(mockedMarkAllAsRead).toHaveBeenCalledWith('user-1')
    expect(result).toEqual({ success: true })
  })
})
