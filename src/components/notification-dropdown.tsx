'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/app/actions/notifications'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  isRead: boolean
  readAt: Date | null
  createdAt: Date
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay === 1) return 'yesterday'
  if (diffDay < 7) return `${diffDay}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getNotificationIcon(type: string): string {
  switch (type) {
    case 'APPROVAL':
      return '✓'
    case 'REJECTION':
      return '✗'
    case 'SETTLEMENT_CREATED':
      return '$'
    case 'DEADLINE_EXTENDED':
      return '⏰'
    case 'TODO_COMPLETED':
      return '✓'
    case 'TODO_CREATED':
      return '📋'
    default:
      return '•'
  }
}

export function NotificationDropdown() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)

  const fetchNotifications = useCallback(() => {
    startTransition(async () => {
      const result = await getNotifications()
      setNotifications(result.notifications as Notification[])
      setUnreadCount(result.unreadCount)
    })
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    if (isOpen) return // Don't poll while dropdown is open
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [isOpen, fetchNotifications])

  function handleOpenChange(open: boolean) {
    setIsOpen(open)
    if (open) {
      fetchNotifications()
    }
  }

  function handleNotificationClick(notification: Notification) {
    if (!notification.isRead) {
      startTransition(async () => {
        await markNotificationRead(notification.id)
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id
              ? { ...n, isRead: true, readAt: new Date() }
              : n,
          ),
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      })
    }
    if (notification.link) {
      setIsOpen(false)
      router.push(notification.link)
    }
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead()
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date() })),
      )
      setUnreadCount(0)
    })
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="notification-bell"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span
              className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary animate-pulse"
              data-testid="notification-badge"
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 max-h-96 overflow-y-auto"
        data-testid="notification-dropdown"
      >
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground"
              onClick={handleMarkAllRead}
              disabled={isPending}
              data-testid="mark-all-read-btn"
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div
            className="px-3 py-8 text-center text-sm text-muted-foreground"
            data-testid="notification-empty"
          >
            No notifications
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={cn(
                'flex cursor-pointer items-start gap-3 px-3 py-2.5',
                !notification.isRead && 'border-l-2 border-primary bg-muted/30',
                notification.isRead && 'text-muted-foreground',
              )}
              onClick={() => handleNotificationClick(notification)}
              data-testid={`notification-item-${notification.id}`}
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs">
                {getNotificationIcon(notification.type)}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-sm leading-tight',
                    !notification.isRead && 'font-medium',
                  )}
                >
                  {notification.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                  {notification.message}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {formatRelativeTime(notification.createdAt)}
                  </span>
                  {!notification.isRead && (
                    <Check className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
