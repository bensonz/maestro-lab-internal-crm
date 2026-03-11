'use server'

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { revalidatePath } from 'next/cache'

// ── Record a daily balance snapshot ──────────────────────────

interface RecordSnapshotInput {
  clientRecordId: string
  platform: string
  date: string // YYYY-MM-DD
  balance: number
  screenshotPath?: string
  notes?: string
}

export async function recordBalanceSnapshot(input: RecordSnapshotInput) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = session.user.role
  if (!['BACKOFFICE', 'ADMIN', 'FINANCE'].includes(role as string)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  try {
    const dateValue = new Date(input.date + 'T00:00:00')

    await prisma.balanceSnapshot.upsert({
      where: {
        clientRecordId_platform_date: {
          clientRecordId: input.clientRecordId,
          platform: input.platform,
          date: dateValue,
        },
      },
      update: {
        balance: input.balance,
        screenshotPath: input.screenshotPath ?? undefined,
        notes: input.notes ?? undefined,
      },
      create: {
        clientRecordId: input.clientRecordId,
        platform: input.platform,
        date: dateValue,
        balance: input.balance,
        screenshotPath: input.screenshotPath ?? null,
        notes: input.notes ?? null,
        createdById: session.user.id as string,
      },
    })

    await prisma.eventLog.create({
      data: {
        eventType: 'BALANCE_RECORDED',
        description: `Balance snapshot recorded: ${input.platform} $${input.balance.toLocaleString()} for ${input.date}`,
        userId: session.user.id as string,
        metadata: {
          clientRecordId: input.clientRecordId,
          platform: input.platform,
          date: input.date,
          balance: input.balance,
        },
      },
    })

    revalidatePath('/backoffice/daily-balances')
    revalidatePath('/backoffice/todo-list')
    return { success: true }
  } catch (error) {
    console.error('[recordBalanceSnapshot] error:', error)
    return { success: false, error: 'Failed to record balance snapshot' }
  }
}

// ── Update account status per platform ──────────────────────

interface UpdateStatusInput {
  clientRecordId: string
  platform: string
  status: string // VIP, SEMI_LIMITED, ACTIVE, LIMITED, DEAD
}

const VALID_STATUSES = ['VIP', 'SEMI_LIMITED', 'ACTIVE', 'LIMITED', 'DEAD']

export async function updateAccountStatus(input: UpdateStatusInput) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = session.user.role
  if (!['BACKOFFICE', 'ADMIN', 'FINANCE'].includes(role as string)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  if (!VALID_STATUSES.includes(input.status)) {
    return { success: false, error: `Invalid status: ${input.status}` }
  }

  try {
    // Read current accountStatuses
    const record = await prisma.clientRecord.findUnique({
      where: { id: input.clientRecordId },
      select: { accountStatuses: true },
    })
    if (!record) return { success: false, error: 'Client record not found' }

    const current = (record.accountStatuses as Record<string, string>) ?? {}
    const previous = current[input.platform] ?? 'ACTIVE'
    const updated = { ...current, [input.platform]: input.status }

    await prisma.clientRecord.update({
      where: { id: input.clientRecordId },
      data: { accountStatuses: updated },
    })

    await prisma.eventLog.create({
      data: {
        eventType: 'ACCOUNT_STATUS_CHANGED',
        description: `Account status changed: ${input.platform} ${previous} → ${input.status}`,
        userId: session.user.id as string,
        metadata: {
          clientRecordId: input.clientRecordId,
          platform: input.platform,
          previousStatus: previous,
          newStatus: input.status,
        },
      },
    })

    revalidatePath('/backoffice/client-management')
    revalidatePath('/backoffice/todo-list')
    return { success: true }
  } catch (error) {
    console.error('[updateAccountStatus] error:', error)
    return { success: false, error: 'Failed to update account status' }
  }
}
