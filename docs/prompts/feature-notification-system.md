# Feature — Notification System

> **One-liner:** Add a Notification model, auto-generate notifications from event logs, and wire the bell icon in both top bars to a real dropdown showing unread/read notifications with mark-as-read and mark-all-read actions.

---

## Context

- Event logs are already created throughout the app (22+ call sites across actions and services)
- The bell icon exists in both top bars but is non-functional:
  - `~/Work/Personal/crm-project/app/src/app/agent/_components/agent-top-bar.tsx`
  - `~/Work/Personal/crm-project/app/src/app/backoffice/_components/backoffice-top-bar.tsx`
- EventLog model: `~/Work/Personal/crm-project/app/prisma/schema.prisma` — has `eventType`, `description`, `clientId`, `userId`, `createdAt`
- UI patterns: `~/Work/Personal/crm-project/app/src/app/backoffice/commissions/_components/commissions-view.tsx` for card/badge patterns

---

## Part 1 — Schema

### File: `~/Work/Personal/crm-project/app/prisma/schema.prisma` (MODIFY)

Add after the EventLog model:

```prisma
model Notification {
  id          String    @id @default(cuid())
  userId      String                          // recipient
  user        User      @relation("UserNotifications", fields: [userId], references: [id])

  type        String                          // maps to EventType values
  title       String                          // short summary
  message     String                          // full description
  link        String?                         // optional URL to navigate to (e.g. "/agent/clients/abc123")

  // Source reference
  eventLogId  String?
  eventLog    EventLog? @relation(fields: [eventLogId], references: [id])
  clientId    String?

  isRead      Boolean   @default(false)
  readAt      DateTime?
  createdAt   DateTime  @default(now())

  @@index([userId, isRead])
  @@index([userId, createdAt])
  @@index([eventLogId])
}
```

Add to the **User** model relations:

```prisma
notifications     Notification[] @relation("UserNotifications")
```

Add to the **EventLog** model:

```prisma
notifications     Notification[]
```

---

## Part 2 — Notification Service

### File: `~/Work/Personal/crm-project/app/src/backend/services/notifications.ts` (CREATE)

```typescript
import prisma from '@/backend/prisma/client'

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
  return prisma.notification.create({ data: params })
}

/**
 * Create notifications for multiple users (e.g., all backoffice staff).
 */
export async function notifyRole(params: {
  role: string | string[]   // e.g. 'BACKOFFICE' or ['ADMIN', 'BACKOFFICE']
  type: string
  title: string
  message: string
  link?: string
  eventLogId?: string
  clientId?: string
}) {
  const roles = Array.isArray(params.role) ? params.role : [params.role]
  const users = await prisma.user.findMany({
    where: { role: { in: roles }, isActive: true },
    select: { id: true },
  })

  if (users.length === 0) return []

  return prisma.notification.createMany({
    data: users.map(u => ({
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
export async function getUserNotifications(userId: string, options?: {
  unreadOnly?: boolean
  limit?: number
}) {
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
```

---

## Part 3 — Server Actions

### File: `~/Work/Personal/crm-project/app/src/app/actions/notifications.ts` (CREATE)

```typescript
'use server'

import { auth } from '@/backend/auth'
import { getUserNotifications, getUnreadCount, markAsRead, markAllAsRead } from '@/backend/services/notifications'
import { revalidatePath } from 'next/cache'

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
```

---

## Part 4 — Wire Notifications into Key Actions

Add notification creation to the most important event flows. Don't modify every single action — just the high-value ones:

### File: `~/Work/Personal/crm-project/app/src/backend/services/status-transition.ts` (MODIFY)

When a client is approved (status → APPROVED):
- Notify the agent: "Client {name} has been approved!"
- Link: `/agent/clients/{clientId}`

When a client is rejected:
- Notify the agent: "Client {name} was rejected"
- Link: `/agent/clients/{clientId}`

### File: `~/Work/Personal/crm-project/app/src/app/actions/settlements.ts` (MODIFY)

When a settlement is confirmed/rejected:
- Notify ADMIN + BACKOFFICE roles: "Settlement {amount} {confirmed/rejected}"
- Link: `/backoffice/client-settlement`

### File: `~/Work/Personal/crm-project/app/src/app/actions/todos.ts` (MODIFY)

When a todo is created and assigned:
- Notify the assigned agent: "New task: {title}"
- Link: `/agent/todo-list`

### File: `~/Work/Personal/crm-project/app/src/app/actions/extensions.ts` (MODIFY)

When an extension request is created:
- Notify ADMIN + BACKOFFICE: "Extension request from {agentName} for {clientName}"
- Link: `/backoffice/todo-list`

When approved/rejected:
- Notify the requesting agent: "Extension request {approved/rejected}"
- Link: `/agent/clients/{clientId}`

Import and use `createNotification` and `notifyRole` from `~/Work/Personal/crm-project/app/src/backend/services/notifications.ts`. Keep the notification calls lightweight — if they fail, don't block the main action (wrap in try/catch or fire-and-forget).

---

## Part 5 — Notification Dropdown UI

### File: `~/Work/Personal/crm-project/app/src/components/notification-dropdown.tsx` (CREATE)

A shared client component used by both top bars:

```tsx
'use client'

import { useState, useEffect, useTransition } from 'react'
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
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/app/actions/notifications'
```

**Behavior:**
- On mount and on dropdown open: call `getNotifications()` to fetch latest
- Show unread count badge (pulsing dot if > 0, hide if 0)
- Dropdown shows up to 20 notifications, most recent first
- Each notification shows: icon (based on type), title, relative time (e.g., "2h ago"), read/unread styling
- Click a notification: mark as read + navigate to `link` if present
- "Mark all as read" button at bottom of dropdown
- Unread notifications have a left border accent (e.g., `border-l-2 border-primary`)
- Read notifications are dimmed (`text-muted-foreground`)
- Empty state: "No notifications" centered text

**Time formatting:** Use relative time (just now, 5m ago, 2h ago, yesterday, Feb 8). Keep it simple — a small helper function, no external dependency needed.

### File: `~/Work/Personal/crm-project/app/src/app/agent/_components/agent-top-bar.tsx` (MODIFY)

Replace the static Bell button with `<NotificationDropdown />`.

### File: `~/Work/Personal/crm-project/app/src/app/backoffice/_components/backoffice-top-bar.tsx` (MODIFY)

Replace the static Bell button with `<NotificationDropdown />`.

---

## Part 6 — Tests

### File: `~/Work/Personal/crm-project/app/src/test/backend/services/notifications.test.ts` (CREATE)

Test the notification service (≥8 tests):
1. `createNotification` — creates with all fields
2. `getUserNotifications` — returns notifications for user, sorted by date desc
3. `getUserNotifications` — unreadOnly filter works
4. `getUserNotifications` — respects limit
5. `getUnreadCount` — returns correct count
6. `markAsRead` — sets isRead and readAt
7. `markAsRead` — only marks own notifications (userId guard)
8. `markAllAsRead` — marks all unread as read for user

### File: `~/Work/Personal/crm-project/app/src/test/backend/actions/notifications.test.ts` (CREATE)

Test the server actions (≥4 tests):
1. `getNotifications` — returns empty for unauthenticated
2. `getNotifications` — returns notifications and count
3. `markNotificationRead` — auth guard
4. `markAllNotificationsRead` — marks all as read

---

## Constraints

- Do NOT modify any existing event log creation calls — notifications are additive
- Notification creation should never block the main action — use try/catch if needed
- Do NOT add external dependencies for time formatting — write a simple relative time helper
- Use absolute paths in all file references
- All code must pass `npm run build` and `npm test`

---

## Files Summary

| File | Action |
|------|--------|
| `~/Work/Personal/crm-project/app/prisma/schema.prisma` | Modify — add Notification model + relations |
| `~/Work/Personal/crm-project/app/src/backend/services/notifications.ts` | Create — notification service |
| `~/Work/Personal/crm-project/app/src/app/actions/notifications.ts` | Create — server actions |
| `~/Work/Personal/crm-project/app/src/components/notification-dropdown.tsx` | Create — shared dropdown UI |
| `~/Work/Personal/crm-project/app/src/app/agent/_components/agent-top-bar.tsx` | Modify — use NotificationDropdown |
| `~/Work/Personal/crm-project/app/src/app/backoffice/_components/backoffice-top-bar.tsx` | Modify — use NotificationDropdown |
| `~/Work/Personal/crm-project/app/src/backend/services/status-transition.ts` | Modify — add approval/rejection notifications |
| `~/Work/Personal/crm-project/app/src/app/actions/settlements.ts` | Modify — add settlement notifications |
| `~/Work/Personal/crm-project/app/src/app/actions/todos.ts` | Modify — add todo assignment notifications |
| `~/Work/Personal/crm-project/app/src/app/actions/extensions.ts` | Modify — add extension request notifications |
| `~/Work/Personal/crm-project/app/src/test/backend/services/notifications.test.ts` | Create |
| `~/Work/Personal/crm-project/app/src/test/backend/actions/notifications.test.ts` | Create |

## Verification
```bash
cd ~/Work/Personal/crm-project/app && npx prisma validate
cd ~/Work/Personal/crm-project/app && npm run build
cd ~/Work/Personal/crm-project/app && npm test    # current 319 + new ≥12 = ≥331
```
