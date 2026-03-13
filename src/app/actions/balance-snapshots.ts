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

import { isValidStatusForPlatformAsync } from '@/backend/data/status-config'
import type { PlatformStatusEntry } from '@/types/backend-types'

interface UpdateStatusInput {
  clientRecordId: string
  platform: string
  status: string
  limitDetail?: string // "25%" (FD), "$3K" (MGM), "3/4" (CZR)
  limitAmount?: number // Dollar amount for DK/ESPN/365/FAN limited
  limitSports?: string[] // For CZR: ["NBA", "NFL", ...]
}

export async function updateAccountStatus(input: UpdateStatusInput) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const role = session.user.role
  if (!['BACKOFFICE', 'ADMIN', 'FINANCE'].includes(role as string)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  if (!(await isValidStatusForPlatformAsync(input.platform, input.status))) {
    return { success: false, error: `Invalid status "${input.status}" for platform ${input.platform}` }
  }

  try {
    // Read current accountStatuses
    const record = await prisma.clientRecord.findUnique({
      where: { id: input.clientRecordId },
      select: { accountStatuses: true },
    })
    if (!record) return { success: false, error: 'Client record not found' }

    const currentRaw = (record.accountStatuses as Record<string, unknown>) ?? {}

    // Read previous status (handle both old string and new object format)
    const prevEntry = currentRaw[input.platform]
    const previousStatus =
      typeof prevEntry === 'string'
        ? prevEntry
        : (prevEntry as PlatformStatusEntry | undefined)?.status ?? '(none)'

    // Build new entry as PlatformStatusEntry object
    const newEntry: PlatformStatusEntry = { status: input.status }
    if (input.limitDetail) newEntry.limitDetail = input.limitDetail
    if (input.limitAmount != null) newEntry.limitAmount = input.limitAmount
    if (input.limitSports?.length) newEntry.limitSports = input.limitSports

    const updated = { ...currentRaw, [input.platform]: newEntry } as Record<string, unknown>

    await prisma.clientRecord.update({
      where: { id: input.clientRecordId },
      data: { accountStatuses: updated as object },
    })

    await prisma.eventLog.create({
      data: {
        eventType: 'ACCOUNT_STATUS_CHANGED',
        description: `Account status changed: ${input.platform} ${previousStatus} → ${input.status}${input.limitDetail ? ` (${input.limitDetail})` : ''}`,
        userId: session.user.id as string,
        metadata: {
          clientRecordId: input.clientRecordId,
          platform: input.platform,
          previousStatus,
          newStatus: input.status,
          ...(input.limitDetail && { limitDetail: input.limitDetail }),
          ...(input.limitAmount != null && { limitAmount: input.limitAmount }),
          ...(input.limitSports?.length && { limitSports: input.limitSports }),
        },
      },
    })

    revalidatePath('/backoffice/client-management')
    revalidatePath('/backoffice/account-statuses')
    revalidatePath('/backoffice/todo-list')
    return { success: true }
  } catch (error) {
    console.error('[updateAccountStatus] error:', error)
    return { success: false, error: 'Failed to update account status' }
  }
}
