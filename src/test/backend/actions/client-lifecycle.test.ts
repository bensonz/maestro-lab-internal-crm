import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/backend/auth', () => ({ auth: vi.fn() }))

vi.mock('@/backend/prisma/client', () => ({
  default: {
    $transaction: vi.fn(),
    client: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    clientPlatform: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      createMany: vi.fn(),
    },
    eventLog: { create: vi.fn(), createMany: vi.fn() },
    notification: { create: vi.fn(), createMany: vi.fn() },
    toDo: {
      updateMany: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/backend/services/notifications', () => ({
  createNotification: vi.fn(),
  notifyRole: vi.fn(),
}))

vi.mock('@/backend/services/commission', () => ({
  createBonusPool: vi.fn(),
}))

vi.mock('@/backend/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// ─── Imports ────────────────────────────────────────────────────────────────

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/backend/services/notifications'
import { createBonusPool } from '@/backend/services/commission'
import {
  approvePrequal,
  rejectPrequal,
  rejectPrequalWithRetry,
  approveClientIntake,
  rejectClientIntake,
} from '@/app/actions/backoffice'
import { transitionClientStatus } from '@/backend/services/status-transition'

// ─── Helpers ────────────────────────────────────────────────────────────────

type MockedAuth = Mock<
  () => Promise<{ user: { id: string; role: string }; expires: string } | null>
>

const mockedAuth = auth as unknown as MockedAuth

function mockAgent(id = 'agent-1') {
  mockedAuth.mockResolvedValue({ user: { id, role: 'AGENT' }, expires: '' })
}

function mockBackoffice(id = 'bo-1') {
  mockedAuth.mockResolvedValue({ user: { id, role: 'BACKOFFICE' }, expires: '' })
}

function mockAdmin(id = 'admin-1') {
  mockedAuth.mockResolvedValue({ user: { id, role: 'ADMIN' }, expires: '' })
}

function mockUnauthenticated() {
  mockedAuth.mockResolvedValue(null)
}

/**
 * Set up the $transaction mock to pass through the callback with a mock tx
 * that delegates to the top-level prisma mock methods.
 */
function setupTransactionPassthrough() {
  vi.mocked(prisma.$transaction).mockImplementation(async (cb: unknown) => {
    const tx = {
      client: prisma.client,
      eventLog: prisma.eventLog,
      toDo: prisma.toDo,
    }
    return (cb as (tx: typeof prisma) => Promise<unknown>)(tx as never)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: approvePrequal
// ─────────────────────────────────────────────────────────────────────────────

describe('approvePrequal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('authentication & authorization', () => {
    it('rejects unauthenticated users', async () => {
      mockUnauthenticated()
      const result = await approvePrequal('client-1')
      expect(result).toEqual({ success: false, error: 'Unauthorized' })
    })

    it('rejects AGENT role', async () => {
      mockAgent()
      const result = await approvePrequal('client-1')
      expect(result).toEqual({ success: false, error: 'Unauthorized' })
    })

    it('allows BACKOFFICE role', async () => {
      mockBackoffice()
      vi.mocked(prisma.clientPlatform.updateMany).mockResolvedValue({ count: 1 } as never)
      vi.mocked(prisma.client.findUnique).mockResolvedValue({
        id: 'client-1',
        intakeStatus: 'PREQUAL_REVIEW',
        agentId: 'agent-1',
        firstName: 'John',
        lastName: 'Doe',
        executionDeadline: null,
      } as never)
      setupTransactionPassthrough()
      vi.mocked(prisma.client.update).mockResolvedValue({} as never)
      vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

      const result = await approvePrequal('client-1')
      expect(result.success).toBe(true)
    })

    it('allows ADMIN role', async () => {
      mockAdmin()
      vi.mocked(prisma.clientPlatform.updateMany).mockResolvedValue({ count: 1 } as never)
      vi.mocked(prisma.client.findUnique).mockResolvedValue({
        id: 'client-1',
        intakeStatus: 'PREQUAL_REVIEW',
        agentId: 'agent-1',
        firstName: 'John',
        lastName: 'Doe',
        executionDeadline: null,
      } as never)
      setupTransactionPassthrough()
      vi.mocked(prisma.client.update).mockResolvedValue({} as never)
      vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

      const result = await approvePrequal('client-1')
      expect(result.success).toBe(true)
    })
  })

  describe('BetMGM verification (bundled)', () => {
    beforeEach(() => {
      mockBackoffice('bo-1')
      vi.mocked(prisma.client.findUnique).mockResolvedValue({
        id: 'client-1',
        intakeStatus: 'PREQUAL_REVIEW',
        agentId: 'agent-1',
        firstName: 'John',
        lastName: 'Doe',
        executionDeadline: null,
      } as never)
      setupTransactionPassthrough()
      vi.mocked(prisma.client.update).mockResolvedValue({} as never)
      vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)
    })

    it('sets BetMGM platform to VERIFIED via updateMany', async () => {
      vi.mocked(prisma.clientPlatform.updateMany).mockResolvedValue({ count: 1 } as never)

      await approvePrequal('client-1')

      expect(prisma.clientPlatform.updateMany).toHaveBeenCalledWith({
        where: {
          clientId: 'client-1',
          platformType: 'BETMGM',
          status: 'PENDING_REVIEW',
        },
        data: expect.objectContaining({
          status: 'VERIFIED',
          reviewedBy: 'bo-1',
        }),
      })
    })

    it('only updates BetMGM platforms in PENDING_REVIEW', async () => {
      vi.mocked(prisma.clientPlatform.updateMany).mockResolvedValue({ count: 0 } as never)

      await approvePrequal('client-1')

      const call = vi.mocked(prisma.clientPlatform.updateMany).mock.calls[0][0]
      expect(call.where).toEqual(
        expect.objectContaining({ status: 'PENDING_REVIEW' }),
      )
    })

    it('sets reviewedAt as a Date', async () => {
      vi.mocked(prisma.clientPlatform.updateMany).mockResolvedValue({ count: 1 } as never)

      await approvePrequal('client-1')

      const call = vi.mocked(prisma.clientPlatform.updateMany).mock.calls[0][0]
      expect(call.data.reviewedAt).toBeInstanceOf(Date)
    })
  })

  describe('client status transition', () => {
    beforeEach(() => {
      mockBackoffice('bo-1')
      vi.mocked(prisma.clientPlatform.updateMany).mockResolvedValue({ count: 1 } as never)
    })

    it('transitions client from PREQUAL_REVIEW to PREQUAL_APPROVED', async () => {
      vi.mocked(prisma.client.findUnique).mockResolvedValue({
        id: 'client-1',
        intakeStatus: 'PREQUAL_REVIEW',
        agentId: 'agent-1',
        firstName: 'John',
        lastName: 'Doe',
        executionDeadline: null,
      } as never)
      setupTransactionPassthrough()
      vi.mocked(prisma.client.update).mockResolvedValue({} as never)
      vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

      const result = await approvePrequal('client-1')

      expect(result).toEqual({ success: true })
      expect(prisma.client.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'client-1' },
          data: expect.objectContaining({ intakeStatus: 'PREQUAL_APPROVED' }),
        }),
      )
    })

    it('returns error if client not found', async () => {
      vi.mocked(prisma.client.findUnique).mockResolvedValue(null)

      const result = await approvePrequal('client-1')

      expect(result).toEqual({ success: false, error: 'Client not found' })
    })

    it('propagates error if transition fails (invalid status)', async () => {
      vi.mocked(prisma.client.findUnique).mockResolvedValue({
        id: 'client-1',
        intakeStatus: 'REJECTED',
        agentId: 'agent-1',
        firstName: 'John',
        lastName: 'Doe',
        executionDeadline: null,
      } as never)

      const result = await approvePrequal('client-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Cannot transition')
    })
  })

  describe('cache revalidation', () => {
    it('revalidates backoffice paths on success', async () => {
      mockBackoffice('bo-1')
      vi.mocked(prisma.clientPlatform.updateMany).mockResolvedValue({ count: 1 } as never)
      vi.mocked(prisma.client.findUnique).mockResolvedValue({
        id: 'client-1',
        intakeStatus: 'PREQUAL_REVIEW',
        agentId: 'agent-1',
        firstName: 'John',
        lastName: 'Doe',
        executionDeadline: null,
      } as never)
      setupTransactionPassthrough()
      vi.mocked(prisma.client.update).mockResolvedValue({} as never)
      vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

      await approvePrequal('client-1')

      expect(revalidatePath).toHaveBeenCalledWith('/backoffice/client-management')
      expect(revalidatePath).toHaveBeenCalledWith('/backoffice/sales-interaction')
      expect(revalidatePath).toHaveBeenCalledWith('/backoffice')
    })

    it('does not revalidate on transition failure', async () => {
      mockBackoffice('bo-1')
      vi.mocked(prisma.clientPlatform.updateMany).mockResolvedValue({ count: 1 } as never)
      vi.mocked(prisma.client.findUnique).mockResolvedValue({
        id: 'client-1',
        intakeStatus: 'REJECTED',
        agentId: 'agent-1',
        firstName: 'John',
        lastName: 'Doe',
        executionDeadline: null,
      } as never)

      await approvePrequal('client-1')

      expect(revalidatePath).not.toHaveBeenCalled()
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: rejectPrequal
// ─────────────────────────────────────────────────────────────────────────────

describe('rejectPrequal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('authentication & authorization', () => {
    it('rejects unauthenticated users', async () => {
      mockUnauthenticated()
      const result = await rejectPrequal('client-1')
      expect(result).toEqual({ success: false, error: 'Unauthorized' })
    })

    it('rejects AGENT role', async () => {
      mockAgent()
      const result = await rejectPrequal('client-1')
      expect(result).toEqual({ success: false, error: 'Unauthorized' })
    })

    it('allows BACKOFFICE role', async () => {
      mockBackoffice()
      vi.mocked(prisma.client.findUnique).mockResolvedValue({
        id: 'client-1',
        intakeStatus: 'PREQUAL_REVIEW',
        agentId: 'agent-1',
        firstName: 'John',
        lastName: 'Doe',
        executionDeadline: null,
      } as never)
      setupTransactionPassthrough()
      vi.mocked(prisma.client.update).mockResolvedValue({} as never)
      vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)
      vi.mocked(prisma.toDo.updateMany).mockResolvedValue({ count: 0 } as never)

      const result = await rejectPrequal('client-1')
      expect(result.success).toBe(true)
    })
  })

  describe('client status transition', () => {
    beforeEach(() => {
      mockBackoffice('bo-1')
      vi.mocked(prisma.client.findUnique).mockResolvedValue({
        id: 'client-1',
        intakeStatus: 'PREQUAL_REVIEW',
        agentId: 'agent-1',
        firstName: 'John',
        lastName: 'Doe',
        executionDeadline: null,
      } as never)
      setupTransactionPassthrough()
      vi.mocked(prisma.client.update).mockResolvedValue({} as never)
      vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)
      vi.mocked(prisma.toDo.updateMany).mockResolvedValue({ count: 0 } as never)
    })

    it('transitions client to REJECTED', async () => {
      await rejectPrequal('client-1')

      expect(prisma.client.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ intakeStatus: 'REJECTED' }),
        }),
      )
    })

    it('includes reason in event log when provided', async () => {
      await rejectPrequal('client-1', 'Bad client')

      expect(prisma.eventLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: expect.stringContaining('Bad client'),
          }),
        }),
      )
    })

    it('omits reason from event log when not provided', async () => {
      await rejectPrequal('client-1')

      const call = vi.mocked(prisma.eventLog.create).mock.calls[0][0]
      expect(call.data.description).not.toContain(':')
    })
  })

  describe('cache revalidation', () => {
    it('revalidates backoffice paths on success', async () => {
      mockBackoffice()
      vi.mocked(prisma.client.findUnique).mockResolvedValue({
        id: 'client-1',
        intakeStatus: 'PREQUAL_REVIEW',
        agentId: 'agent-1',
        firstName: 'John',
        lastName: 'Doe',
        executionDeadline: null,
      } as never)
      setupTransactionPassthrough()
      vi.mocked(prisma.client.update).mockResolvedValue({} as never)
      vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)
      vi.mocked(prisma.toDo.updateMany).mockResolvedValue({ count: 0 } as never)

      await rejectPrequal('client-1')

      expect(revalidatePath).toHaveBeenCalledWith('/backoffice/client-management')
      expect(revalidatePath).toHaveBeenCalledWith('/backoffice/sales-interaction')
      expect(revalidatePath).toHaveBeenCalledWith('/backoffice')
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Section 4: rejectPrequalWithRetry
// ─────────────────────────────────────────────────────────────────────────────

describe('rejectPrequalWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('authentication & authorization', () => {
    it('rejects unauthenticated users', async () => {
      mockUnauthenticated()
      const result = await rejectPrequalWithRetry('client-1')
      expect(result).toEqual({ success: false, error: 'Unauthorized' })
    })

    it('rejects AGENT role', async () => {
      mockAgent()
      const result = await rejectPrequalWithRetry('client-1')
      expect(result).toEqual({ success: false, error: 'Unauthorized' })
    })

    it('allows BACKOFFICE role', async () => {
      mockBackoffice()
      vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
        id: 'cp-1',
        status: 'PENDING_REVIEW',
        client: { firstName: 'John', lastName: 'Doe', agentId: 'agent-1' },
      } as never)
      vi.mocked(prisma.clientPlatform.update).mockResolvedValue({} as never)
      vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

      const result = await rejectPrequalWithRetry('client-1')
      expect(result.success).toBe(true)
    })

    it('allows ADMIN role', async () => {
      mockAdmin()
      vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
        id: 'cp-1',
        status: 'PENDING_REVIEW',
        client: { firstName: 'John', lastName: 'Doe', agentId: 'agent-1' },
      } as never)
      vi.mocked(prisma.clientPlatform.update).mockResolvedValue({} as never)
      vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

      const result = await rejectPrequalWithRetry('client-1')
      expect(result.success).toBe(true)
    })
  })

  describe('precondition validation', () => {
    it('returns error if BetMGM platform not found', async () => {
      mockBackoffice()
      vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue(null)

      const result = await rejectPrequalWithRetry('client-1')
      expect(result).toEqual({
        success: false,
        error: 'BetMGM platform not in PENDING_REVIEW state',
      })
    })

    // Note: findFirst query already filters by status: PENDING_REVIEW,
    // so a non-PENDING_REVIEW platform simply returns null (same as not found)
    it('returns error if BetMGM is not in PENDING_REVIEW (returns null for wrong status)', async () => {
      mockBackoffice()
      // findFirst with status: PENDING_REVIEW filter returns null for VERIFIED platform
      vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue(null)

      const result = await rejectPrequalWithRetry('client-1')
      expect(result.success).toBe(false)
      expect(result.error).toContain('PENDING_REVIEW')
    })
  })

  describe('BetMGM platform update', () => {
    beforeEach(() => {
      mockBackoffice('bo-1')
      vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
        id: 'cp-1',
        status: 'PENDING_REVIEW',
        client: { firstName: 'John', lastName: 'Doe', agentId: 'agent-1' },
      } as never)
      vi.mocked(prisma.clientPlatform.update).mockResolvedValue({} as never)
      vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)
    })

    it('sets BetMGM status to RETRY_PENDING', async () => {
      await rejectPrequalWithRetry('client-1', 'Bad screenshots')

      expect(prisma.clientPlatform.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cp-1' },
          data: expect.objectContaining({ status: 'RETRY_PENDING' }),
        }),
      )
    })

    it('sets retryAfter to ~24 hours from now', async () => {
      const before = Date.now()
      await rejectPrequalWithRetry('client-1')
      const after = Date.now()

      const call = vi.mocked(prisma.clientPlatform.update).mock.calls[0][0]
      const retryAfter = call.data.retryAfter as Date
      const twentyFourHours = 24 * 60 * 60 * 1000
      expect(retryAfter.getTime()).toBeGreaterThanOrEqual(before + twentyFourHours - 1000)
      expect(retryAfter.getTime()).toBeLessThanOrEqual(after + twentyFourHours + 1000)
    })

    it('stores reviewNotes with rejection reason', async () => {
      await rejectPrequalWithRetry('client-1', 'Bad screenshots')

      expect(prisma.clientPlatform.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ reviewNotes: 'Bad screenshots' }),
        }),
      )
    })

    it('stores null reviewNotes when no reason given', async () => {
      await rejectPrequalWithRetry('client-1')

      expect(prisma.clientPlatform.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ reviewNotes: null }),
        }),
      )
    })

    it('records reviewedBy and reviewedAt', async () => {
      await rejectPrequalWithRetry('client-1')

      const call = vi.mocked(prisma.clientPlatform.update).mock.calls[0][0]
      expect(call.data.reviewedBy).toBe('bo-1')
      expect(call.data.reviewedAt).toBeInstanceOf(Date)
    })

    it('increments retryCount', async () => {
      await rejectPrequalWithRetry('client-1')

      expect(prisma.clientPlatform.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ retryCount: { increment: 1 } }),
        }),
      )
    })
  })

  describe('does NOT transition client status', () => {
    it('does not call transitionClientStatus (client stays at PREQUAL_REVIEW)', async () => {
      mockBackoffice()
      vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
        id: 'cp-1',
        status: 'PENDING_REVIEW',
        client: { firstName: 'John', lastName: 'Doe', agentId: 'agent-1' },
      } as never)
      vi.mocked(prisma.clientPlatform.update).mockResolvedValue({} as never)
      vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

      await rejectPrequalWithRetry('client-1')

      // transitionClientStatus calls prisma.client.findUnique — should not happen
      expect(prisma.client.findUnique).not.toHaveBeenCalled()
      // client.update should not be called (no status transition)
      expect(prisma.client.update).not.toHaveBeenCalled()
    })
  })

  describe('event log', () => {
    it('creates PLATFORM_STATUS_CHANGE event', async () => {
      mockBackoffice('bo-1')
      vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
        id: 'cp-1',
        status: 'PENDING_REVIEW',
        client: { firstName: 'John', lastName: 'Doe', agentId: 'agent-1' },
      } as never)
      vi.mocked(prisma.clientPlatform.update).mockResolvedValue({} as never)
      vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

      await rejectPrequalWithRetry('client-1', 'Blurry photos')

      expect(prisma.eventLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'PLATFORM_STATUS_CHANGE',
          oldValue: 'PENDING_REVIEW',
          newValue: 'RETRY_PENDING',
          description: expect.stringContaining('Blurry photos'),
          clientId: 'client-1',
          userId: 'bo-1',
        }),
      })
    })
  })

  describe('agent notification', () => {
    beforeEach(() => {
      mockBackoffice('bo-1')
      vi.mocked(prisma.clientPlatform.update).mockResolvedValue({} as never)
      vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)
    })

    it('notifies the agent about retry availability', async () => {
      vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
        id: 'cp-1',
        status: 'PENDING_REVIEW',
        client: { firstName: 'John', lastName: 'Doe', agentId: 'agent-1' },
      } as never)

      await rejectPrequalWithRetry('client-1', 'Bad quality')

      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'agent-1',
          type: 'PLATFORM_STATUS_CHANGE',
          title: 'BetMGM needs resubmission',
        }),
      )
    })

    it('notification message contains reason and retry info', async () => {
      vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
        id: 'cp-1',
        status: 'PENDING_REVIEW',
        client: { firstName: 'John', lastName: 'Doe', agentId: 'agent-1' },
      } as never)

      await rejectPrequalWithRetry('client-1', 'Bad quality')

      const call = vi.mocked(createNotification).mock.calls[0][0]
      expect(call.message).toContain('24 hours')
      expect(call.message).toContain('Bad quality')
    })

    it('notification link points to new-client page with client param', async () => {
      vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
        id: 'cp-1',
        status: 'PENDING_REVIEW',
        client: { firstName: 'John', lastName: 'Doe', agentId: 'agent-1' },
      } as never)

      await rejectPrequalWithRetry('client-1')

      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          link: '/agent/new-client?client=client-1',
        }),
      )
    })

    it('does not fail if notification throws', async () => {
      vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
        id: 'cp-1',
        status: 'PENDING_REVIEW',
        client: { firstName: 'John', lastName: 'Doe', agentId: 'agent-1' },
      } as never)
      vi.mocked(createNotification).mockRejectedValue(new Error('Network error'))

      const result = await rejectPrequalWithRetry('client-1')

      expect(result).toEqual({ success: true })
    })

    it('does not send notification if agentId is null', async () => {
      vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
        id: 'cp-1',
        status: 'PENDING_REVIEW',
        client: { firstName: 'John', lastName: 'Doe', agentId: null },
      } as never)

      await rejectPrequalWithRetry('client-1')

      expect(createNotification).not.toHaveBeenCalled()
    })
  })

  describe('cache revalidation', () => {
    it('revalidates backoffice paths on success', async () => {
      mockBackoffice()
      vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
        id: 'cp-1',
        status: 'PENDING_REVIEW',
        client: { firstName: 'John', lastName: 'Doe', agentId: 'agent-1' },
      } as never)
      vi.mocked(prisma.clientPlatform.update).mockResolvedValue({} as never)
      vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

      await rejectPrequalWithRetry('client-1')

      expect(revalidatePath).toHaveBeenCalledWith('/backoffice/client-management')
      expect(revalidatePath).toHaveBeenCalledWith('/backoffice/sales-interaction')
      expect(revalidatePath).toHaveBeenCalledWith('/backoffice')
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Section 5 (non-duplicate): approveClientIntake & rejectClientIntake
// ─────────────────────────────────────────────────────────────────────────────

describe('approveClientIntake', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated users', async () => {
    mockUnauthenticated()
    const result = await approveClientIntake('client-1')
    expect(result).toEqual({ success: false, error: 'Unauthorized' })
  })

  it('rejects AGENT role', async () => {
    mockAgent()
    const result = await approveClientIntake('client-1')
    expect(result).toEqual({ success: false, error: 'Unauthorized' })
  })

  it('transitions client to APPROVED from READY_FOR_APPROVAL', async () => {
    mockBackoffice('bo-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-1',
      intakeStatus: 'READY_FOR_APPROVAL',
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      executionDeadline: null,
    } as never)
    setupTransactionPassthrough()
    vi.mocked(prisma.client.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.createMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.toDo.createMany).mockResolvedValue({ count: 0 } as never)

    const result = await approveClientIntake('client-1')

    expect(result.success).toBe(true)
    expect(prisma.client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ intakeStatus: 'APPROVED' }),
      }),
    )
  })

  it('creates bonus pool on APPROVED', async () => {
    mockBackoffice('bo-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-1',
      intakeStatus: 'READY_FOR_APPROVAL',
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      executionDeadline: null,
    } as never)
    setupTransactionPassthrough()
    vi.mocked(prisma.client.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.createMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.toDo.createMany).mockResolvedValue({ count: 0 } as never)

    await approveClientIntake('client-1')

    expect(createBonusPool).toHaveBeenCalledWith('client-1')
  })

  it('sends APPROVAL notification to agent', async () => {
    mockBackoffice('bo-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-1',
      intakeStatus: 'READY_FOR_APPROVAL',
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      executionDeadline: null,
    } as never)
    setupTransactionPassthrough()
    vi.mocked(prisma.client.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.createMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.toDo.createMany).mockResolvedValue({ count: 0 } as never)

    await approveClientIntake('client-1')

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'agent-1',
        type: 'APPROVAL',
        title: 'Client approved',
      }),
    )
  })

  it('revalidates paths including agent path on success', async () => {
    mockBackoffice('bo-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-1',
      intakeStatus: 'READY_FOR_APPROVAL',
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      executionDeadline: null,
    } as never)
    setupTransactionPassthrough()
    vi.mocked(prisma.client.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.createMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.toDo.createMany).mockResolvedValue({ count: 0 } as never)

    await approveClientIntake('client-1')

    expect(revalidatePath).toHaveBeenCalledWith('/agent/clients/client-1')
  })
})

describe('rejectClientIntake', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated users', async () => {
    mockUnauthenticated()
    const result = await rejectClientIntake('client-1')
    expect(result).toEqual({ success: false, error: 'Unauthorized' })
  })

  it('rejects AGENT role', async () => {
    mockAgent()
    const result = await rejectClientIntake('client-1')
    expect(result).toEqual({ success: false, error: 'Unauthorized' })
  })

  it('transitions client to REJECTED with reason', async () => {
    mockBackoffice('bo-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-1',
      intakeStatus: 'READY_FOR_APPROVAL',
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      executionDeadline: null,
    } as never)
    setupTransactionPassthrough()
    vi.mocked(prisma.client.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)
    vi.mocked(prisma.toDo.updateMany).mockResolvedValue({ count: 0 } as never)

    const result = await rejectClientIntake('client-1', 'Failed verification')

    expect(result.success).toBe(true)
    expect(prisma.eventLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: expect.stringContaining('Failed verification'),
        }),
      }),
    )
  })

  it('sends REJECTION notification to agent', async () => {
    mockBackoffice('bo-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-1',
      intakeStatus: 'READY_FOR_APPROVAL',
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      executionDeadline: null,
    } as never)
    setupTransactionPassthrough()
    vi.mocked(prisma.client.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)
    vi.mocked(prisma.toDo.updateMany).mockResolvedValue({ count: 0 } as never)

    await rejectClientIntake('client-1')

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'agent-1',
        type: 'REJECTION',
        title: 'Client rejected',
      }),
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Section 6: transitionClientStatus — State Machine Engine
// ─────────────────────────────────────────────────────────────────────────────

describe('transitionClientStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupTransactionPassthrough()
    vi.mocked(prisma.client.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.createMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.toDo.updateMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.toDo.createMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.toDo.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.toDo.findFirst).mockResolvedValue(null as never)
  })

  function mockClient(intakeStatus: string, agentId = 'agent-1') {
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-1',
      intakeStatus,
      agentId,
      firstName: 'John',
      lastName: 'Doe',
      executionDeadline: null,
    } as never)
  }

  describe('transition validation', () => {
    it('allows PREQUAL_REVIEW → PREQUAL_APPROVED', async () => {
      mockClient('PREQUAL_REVIEW')
      const result = await transitionClientStatus('client-1', 'PREQUAL_APPROVED' as never, 'user-1')
      expect(result.success).toBe(true)
    })

    it('allows PREQUAL_REVIEW → REJECTED', async () => {
      mockClient('PREQUAL_REVIEW')
      const result = await transitionClientStatus('client-1', 'REJECTED' as never, 'user-1')
      expect(result.success).toBe(true)
    })

    it('allows PREQUAL_REVIEW → NEEDS_MORE_INFO', async () => {
      mockClient('PREQUAL_REVIEW')
      const result = await transitionClientStatus('client-1', 'NEEDS_MORE_INFO' as never, 'user-1')
      expect(result.success).toBe(true)
    })

    it('allows PREQUAL_REVIEW → READY_FOR_APPROVAL', async () => {
      mockClient('PREQUAL_REVIEW')
      const result = await transitionClientStatus('client-1', 'READY_FOR_APPROVAL' as never, 'user-1')
      expect(result.success).toBe(true)
    })

    it('blocks PREQUAL_REVIEW → APPROVED', async () => {
      mockClient('PREQUAL_REVIEW')
      const result = await transitionClientStatus('client-1', 'APPROVED' as never, 'user-1')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Cannot transition from PREQUAL_REVIEW to APPROVED')
    })

    it('blocks PREQUAL_REVIEW → PENDING', async () => {
      mockClient('PREQUAL_REVIEW')
      const result = await transitionClientStatus('client-1', 'PENDING' as never, 'user-1')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Cannot transition')
    })

    it('allows PREQUAL_APPROVED → READY_FOR_APPROVAL', async () => {
      mockClient('PREQUAL_APPROVED')
      const result = await transitionClientStatus('client-1', 'READY_FOR_APPROVAL' as never, 'user-1')
      expect(result.success).toBe(true)
    })

    it('allows READY_FOR_APPROVAL → APPROVED', async () => {
      mockClient('READY_FOR_APPROVAL')
      const result = await transitionClientStatus('client-1', 'APPROVED' as never, 'user-1')
      expect(result.success).toBe(true)
    })

    it('allows READY_FOR_APPROVAL → REJECTED', async () => {
      mockClient('READY_FOR_APPROVAL')
      const result = await transitionClientStatus('client-1', 'REJECTED' as never, 'user-1')
      expect(result.success).toBe(true)
    })

    it('blocks REJECTED → any status (terminal)', async () => {
      mockClient('REJECTED')
      const result = await transitionClientStatus('client-1', 'PREQUAL_REVIEW' as never, 'user-1')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Cannot transition from REJECTED')
    })

    it('blocks INACTIVE → any status (terminal)', async () => {
      mockClient('INACTIVE')
      const result = await transitionClientStatus('client-1', 'PENDING' as never, 'user-1')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Cannot transition from INACTIVE')
    })

    it('blocks PARTNERSHIP_ENDED → any status (terminal)', async () => {
      mockClient('PARTNERSHIP_ENDED')
      const result = await transitionClientStatus('client-1', 'APPROVED' as never, 'user-1')
      expect(result.success).toBe(false)
    })

    it('returns error for nonexistent client', async () => {
      vi.mocked(prisma.client.findUnique).mockResolvedValue(null)
      const result = await transitionClientStatus('client-1', 'PREQUAL_APPROVED' as never, 'user-1')
      expect(result).toEqual({ success: false, error: 'Client not found' })
    })
  })

  describe('client update', () => {
    it('updates intakeStatus on client', async () => {
      mockClient('PREQUAL_REVIEW')
      await transitionClientStatus('client-1', 'PREQUAL_APPROVED' as never, 'user-1')

      expect(prisma.client.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'client-1' },
          data: expect.objectContaining({ intakeStatus: 'PREQUAL_APPROVED' }),
        }),
      )
    })

    it('sets statusChangedAt to current time', async () => {
      mockClient('PREQUAL_REVIEW')
      const before = Date.now()
      await transitionClientStatus('client-1', 'PREQUAL_APPROVED' as never, 'user-1')

      const call = vi.mocked(prisma.client.update).mock.calls[0][0]
      const statusChangedAt = call.data.statusChangedAt as Date
      expect(statusChangedAt.getTime()).toBeGreaterThanOrEqual(before - 100)
      expect(statusChangedAt.getTime()).toBeLessThanOrEqual(Date.now() + 100)
    })

    it('sets executionDeadline when entering IN_EXECUTION', async () => {
      mockClient('PHONE_ISSUED')
      await transitionClientStatus('client-1', 'IN_EXECUTION' as never, 'user-1')

      const call = vi.mocked(prisma.client.update).mock.calls[0][0]
      expect(call.data.executionDeadline).toBeInstanceOf(Date)
    })

    it('does not set executionDeadline for non-IN_EXECUTION transitions', async () => {
      mockClient('PREQUAL_REVIEW')
      await transitionClientStatus('client-1', 'PREQUAL_APPROVED' as never, 'user-1')

      const call = vi.mocked(prisma.client.update).mock.calls[0][0]
      expect(call.data).not.toHaveProperty('executionDeadline')
    })
  })

  describe('event log', () => {
    it('creates STATUS_CHANGE event with old and new values', async () => {
      mockClient('PREQUAL_REVIEW')
      await transitionClientStatus('client-1', 'PREQUAL_APPROVED' as never, 'user-1')

      expect(prisma.eventLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'STATUS_CHANGE',
          oldValue: 'PREQUAL_REVIEW',
          newValue: 'PREQUAL_APPROVED',
          clientId: 'client-1',
          userId: 'user-1',
        }),
      })
    })

    it('includes reason in description when provided', async () => {
      mockClient('PREQUAL_REVIEW')
      await transitionClientStatus('client-1', 'REJECTED' as never, 'user-1', {
        reason: 'Bad client',
      })

      const call = vi.mocked(prisma.eventLog.create).mock.calls[0][0]
      expect(call.data.description).toBe(
        'Status changed from PREQUAL_REVIEW to REJECTED: Bad client',
      )
    })

    it('omits reason from description when not provided', async () => {
      mockClient('PREQUAL_REVIEW')
      await transitionClientStatus('client-1', 'REJECTED' as never, 'user-1')

      const call = vi.mocked(prisma.eventLog.create).mock.calls[0][0]
      expect(call.data.description).toBe(
        'Status changed from PREQUAL_REVIEW to REJECTED',
      )
    })
  })

  describe('todo management', () => {
    it('cancels pending todos on REJECTED', async () => {
      mockClient('PREQUAL_REVIEW')
      await transitionClientStatus('client-1', 'REJECTED' as never, 'user-1')

      expect(prisma.toDo.updateMany).toHaveBeenCalledWith({
        where: {
          clientId: 'client-1',
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        data: { status: 'CANCELLED' },
      })
    })

    it('cancels pending todos on INACTIVE', async () => {
      mockClient('PREQUAL_APPROVED')
      await transitionClientStatus('client-1', 'INACTIVE' as never, 'user-1')

      expect(prisma.toDo.updateMany).toHaveBeenCalledWith({
        where: {
          clientId: 'client-1',
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        data: { status: 'CANCELLED' },
      })
    })

    it('does not cancel todos for non-terminal transitions', async () => {
      mockClient('PREQUAL_REVIEW')
      await transitionClientStatus('client-1', 'PREQUAL_APPROVED' as never, 'user-1')

      // toDo.updateMany should NOT have been called with CANCELLED
      const updateManyCalls = vi.mocked(prisma.toDo.updateMany).mock.calls
      const cancelCalls = updateManyCalls.filter(
        (call) => call[0]?.data?.status === 'CANCELLED',
      )
      expect(cancelCalls).toHaveLength(0)
    })

    it('creates PHONE_SIGNOUT and PHONE_RETURN todos on APPROVED', async () => {
      mockClient('READY_FOR_APPROVAL')
      await transitionClientStatus('client-1', 'APPROVED' as never, 'user-1')

      expect(prisma.toDo.createMany).toHaveBeenCalled()
      const call = vi.mocked(prisma.toDo.createMany).mock.calls[0]?.[0]
      const todos = call!.data as { type: string; title: string }[]
      const todoTypes = todos.map((t) => t.type)
      expect(todoTypes).toContain('PHONE_SIGNOUT')
      expect(todoTypes).toContain('PHONE_RETURN')
    })

    it('creates platform upload todos on IN_EXECUTION', async () => {
      mockClient('PHONE_ISSUED')
      await transitionClientStatus('client-1', 'IN_EXECUTION' as never, 'user-1')

      expect(prisma.toDo.createMany).toHaveBeenCalled()
      const call = vi.mocked(prisma.toDo.createMany).mock.calls[0]?.[0]
      const todos = call!.data as { type: string }[]
      const uploadTodos = todos.filter((t) => t.type === 'UPLOAD_SCREENSHOT')
      const execTodos = todos.filter((t) => t.type === 'EXECUTION')
      // 11 platform uploads + 1 execution
      expect(uploadTodos).toHaveLength(11)
      expect(execTodos).toHaveLength(1)
    })

    it('does not create todos if client has no agentId', async () => {
      mockClient('READY_FOR_APPROVAL', null as never)
      await transitionClientStatus('client-1', 'APPROVED' as never, 'user-1')

      expect(prisma.toDo.createMany).not.toHaveBeenCalled()
    })
  })

  describe('commission', () => {
    it('creates bonus pool on APPROVED', async () => {
      mockClient('READY_FOR_APPROVAL')
      await transitionClientStatus('client-1', 'APPROVED' as never, 'user-1')
      expect(createBonusPool).toHaveBeenCalledWith('client-1')
    })

    it('does not create bonus pool on non-APPROVED transitions', async () => {
      mockClient('PREQUAL_REVIEW')
      await transitionClientStatus('client-1', 'REJECTED' as never, 'user-1')
      expect(createBonusPool).not.toHaveBeenCalled()
    })
  })

  describe('notifications', () => {
    it('sends APPROVAL notification to agent on APPROVED', async () => {
      mockClient('READY_FOR_APPROVAL')
      await transitionClientStatus('client-1', 'APPROVED' as never, 'user-1')

      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'agent-1',
          type: 'APPROVAL',
          title: 'Client approved',
          message: expect.stringContaining('John Doe'),
          link: '/agent/clients/client-1',
        }),
      )
    })

    it('sends REJECTION notification to agent on REJECTED', async () => {
      mockClient('PREQUAL_REVIEW')
      await transitionClientStatus('client-1', 'REJECTED' as never, 'user-1')

      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'agent-1',
          type: 'REJECTION',
          title: 'Client rejected',
          message: expect.stringContaining('John Doe'),
        }),
      )
    })

    it('does not send notification for intermediate transitions', async () => {
      mockClient('PREQUAL_REVIEW')
      await transitionClientStatus('client-1', 'PREQUAL_APPROVED' as never, 'user-1')
      expect(createNotification).not.toHaveBeenCalled()
    })

    it('does not fail if notification throws', async () => {
      mockClient('READY_FOR_APPROVAL')
      vi.mocked(createNotification).mockRejectedValue(new Error('Network error'))

      const result = await transitionClientStatus('client-1', 'APPROVED' as never, 'user-1')
      expect(result.success).toBe(true)
    })
  })

  describe('additional transition paths', () => {
    it('allows PENDING → PREQUAL_REVIEW', async () => {
      mockClient('PENDING')
      const result = await transitionClientStatus('client-1', 'PREQUAL_REVIEW' as never, 'user-1')
      expect(result.success).toBe(true)
    })

    it('allows PHONE_ISSUED → IN_EXECUTION', async () => {
      mockClient('PHONE_ISSUED')
      const result = await transitionClientStatus('client-1', 'IN_EXECUTION' as never, 'user-1')
      expect(result.success).toBe(true)
    })

    it('allows APPROVED → PARTNERSHIP_ENDED', async () => {
      mockClient('APPROVED')
      const result = await transitionClientStatus('client-1', 'PARTNERSHIP_ENDED' as never, 'user-1')
      expect(result.success).toBe(true)
    })

    it('allows IN_EXECUTION → READY_FOR_APPROVAL', async () => {
      mockClient('IN_EXECUTION')
      const result = await transitionClientStatus('client-1', 'READY_FOR_APPROVAL' as never, 'user-1')
      expect(result.success).toBe(true)
    })

    it('allows NEEDS_MORE_INFO → IN_EXECUTION and cancels PROVIDE_INFO todos', async () => {
      mockClient('NEEDS_MORE_INFO')
      const result = await transitionClientStatus('client-1', 'IN_EXECUTION' as never, 'user-1')
      expect(result.success).toBe(true)

      // Should cancel PROVIDE_INFO todos
      expect(prisma.toDo.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: { in: ['PROVIDE_INFO'] },
          }),
          data: { status: 'CANCELLED' },
        }),
      )
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Section 8: Full Lifecycle Integration Scenarios
// ─────────────────────────────────────────────────────────────────────────────

describe('full lifecycle integration scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupTransactionPassthrough()
    vi.mocked(prisma.client.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.createMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.clientPlatform.updateMany).mockResolvedValue({ count: 1 } as never)
    vi.mocked(prisma.clientPlatform.update).mockResolvedValue({} as never)
    vi.mocked(prisma.toDo.updateMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.toDo.createMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.toDo.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.toDo.findFirst).mockResolvedValue(null as never)
  })

  it('happy path: prequal approve → final approve', async () => {
    // Step 1: Backoffice approves prequal (PREQUAL_REVIEW → PREQUAL_APPROVED)
    mockBackoffice('bo-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-1',
      intakeStatus: 'PREQUAL_REVIEW',
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      executionDeadline: null,
    } as never)

    const result1 = await approvePrequal('client-1')
    expect(result1.success).toBe(true)

    // Verify BetMGM set to VERIFIED
    expect(prisma.clientPlatform.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'VERIFIED' }),
      }),
    )

    // Verify client transitioned to PREQUAL_APPROVED
    expect(prisma.client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ intakeStatus: 'PREQUAL_APPROVED' }),
      }),
    )

    // Step 2: Final approval (READY_FOR_APPROVAL → APPROVED)
    vi.clearAllMocks()
    setupTransactionPassthrough()
    vi.mocked(prisma.client.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.createMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.toDo.createMany).mockResolvedValue({ count: 0 } as never)

    mockBackoffice('bo-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-1',
      intakeStatus: 'READY_FOR_APPROVAL',
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      executionDeadline: null,
    } as never)

    const result2 = await approveClientIntake('client-1')
    expect(result2.success).toBe(true)

    // Verify bonus pool created
    expect(createBonusPool).toHaveBeenCalledWith('client-1')
    // Verify APPROVAL notification sent
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'APPROVAL' }),
    )
  })

  it('reject path: prequal submit → permanent reject', async () => {
    // Step 1: Backoffice permanently rejects
    mockBackoffice('bo-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-1',
      intakeStatus: 'PREQUAL_REVIEW',
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      executionDeadline: null,
    } as never)

    const result = await rejectPrequal('client-1', 'Failed background check')
    expect(result.success).toBe(true)

    // Verify client transitioned to REJECTED
    expect(prisma.client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ intakeStatus: 'REJECTED' }),
      }),
    )

    // Verify REJECTION notification
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'REJECTION' }),
    )

    // Verify pending todos cancelled
    expect(prisma.toDo.updateMany).toHaveBeenCalledWith({
      where: {
        clientId: 'client-1',
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      data: { status: 'CANCELLED' },
    })

    // Verify no further transitions possible
    vi.clearAllMocks()
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-1',
      intakeStatus: 'REJECTED',
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      executionDeadline: null,
    } as never)

    const result2 = await approvePrequal('client-1')
    expect(result2.success).toBe(false)
    expect(result2.error).toContain('Cannot transition')
  })

  it('retry path: reject with retry → resubmit → approve', async () => {
    // Step 1: Backoffice rejects with retry
    mockBackoffice('bo-1')
    vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
      id: 'cp-1',
      status: 'PENDING_REVIEW',
      client: { firstName: 'John', lastName: 'Doe', agentId: 'agent-1' },
    } as never)

    const rejectResult = await rejectPrequalWithRetry('client-1', 'Blurry photos')
    expect(rejectResult.success).toBe(true)

    // Verify BetMGM set to RETRY_PENDING
    expect(prisma.clientPlatform.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'RETRY_PENDING' }),
      }),
    )

    // Verify agent notified
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'agent-1',
        title: 'BetMGM needs resubmission',
      }),
    )

    // client.update and client.findUnique for transitions should NOT have been called
    expect(prisma.client.update).not.toHaveBeenCalled()

    // Step 2: Agent resubmits after cooldown
    vi.clearAllMocks()
    mockAgent('agent-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
    } as never)
    vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
      id: 'cp-1',
      status: 'RETRY_PENDING',
      retryAfter: new Date(Date.now() - 1000), // cooldown passed
      retryCount: 1,
    } as never)
    vi.mocked(prisma.clientPlatform.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

    // Import retry function
    const { retryBetmgmSubmission } = await import('@/app/actions/betmgm-retry')
    const retryResult = await retryBetmgmSubmission(
      'client-1',
      'success',
      ['https://blob.vercel.com/new-login.png'],
    )
    expect(retryResult.success).toBe(true)

    // Verify BetMGM back to PENDING_REVIEW
    expect(prisma.clientPlatform.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PENDING_REVIEW' }),
      }),
    )

    // Step 3: Backoffice approves prequal
    vi.clearAllMocks()
    setupTransactionPassthrough()
    vi.mocked(prisma.client.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)
    vi.mocked(prisma.clientPlatform.updateMany).mockResolvedValue({ count: 1 } as never)

    mockBackoffice('bo-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-1',
      intakeStatus: 'PREQUAL_REVIEW',
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      executionDeadline: null,
    } as never)

    const approveResult = await approvePrequal('client-1')
    expect(approveResult.success).toBe(true)
  })

  it('blocks retry when cooldown has not expired', async () => {
    // Set up retry with cooldown still active
    mockAgent('agent-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
    } as never)
    vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
      id: 'cp-1',
      status: 'RETRY_PENDING',
      retryAfter: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12h remaining
      retryCount: 1,
    } as never)

    const { retryBetmgmSubmission } = await import('@/app/actions/betmgm-retry')
    const result = await retryBetmgmSubmission(
      'client-1',
      'success',
      ['https://blob.vercel.com/screenshot.png'],
    )

    expect(result.success).toBe(false)
    expect(result.message).toBe('Retry cooldown has not expired yet')
  })

  it('handles failed BetMGM result same as success for state machine', async () => {
    // The agent reports failed, but backoffice can still approve
    mockBackoffice('bo-1')
    vi.mocked(prisma.clientPlatform.updateMany).mockResolvedValue({ count: 1 } as never)
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-1',
      intakeStatus: 'PREQUAL_REVIEW',
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      executionDeadline: null,
    } as never)

    // BetMGM is PENDING_REVIEW regardless of agent result
    const result = await approvePrequal('client-1')
    expect(result.success).toBe(true)

    // BetMGM gets VERIFIED
    expect(prisma.clientPlatform.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'VERIFIED' }),
      }),
    )
  })

  it('can permanently reject after retry cycle', async () => {
    // Step 1: Reject with retry
    mockBackoffice('bo-1')
    vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
      id: 'cp-1',
      status: 'PENDING_REVIEW',
      client: { firstName: 'John', lastName: 'Doe', agentId: 'agent-1' },
    } as never)
    vi.mocked(prisma.clientPlatform.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

    await rejectPrequalWithRetry('client-1', 'Bad photos')

    // Step 2: Agent resubmits
    vi.clearAllMocks()
    mockAgent('agent-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
    } as never)
    vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
      id: 'cp-1',
      status: 'RETRY_PENDING',
      retryAfter: new Date(Date.now() - 1000),
      retryCount: 1,
    } as never)
    vi.mocked(prisma.clientPlatform.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

    const { retryBetmgmSubmission } = await import('@/app/actions/betmgm-retry')
    await retryBetmgmSubmission('client-1', 'success', ['screenshot.png'])

    // Step 3: Backoffice permanently rejects
    vi.clearAllMocks()
    setupTransactionPassthrough()
    vi.mocked(prisma.client.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)
    vi.mocked(prisma.toDo.updateMany).mockResolvedValue({ count: 0 } as never)

    mockBackoffice('bo-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-1',
      intakeStatus: 'PREQUAL_REVIEW',
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      executionDeadline: null,
    } as never)

    const result = await rejectPrequal('client-1', 'Still bad')
    expect(result.success).toBe(true)

    expect(prisma.client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ intakeStatus: 'REJECTED' }),
      }),
    )
  })

  it('supports multiple retry cycles before final approval', async () => {
    // Cycle 1: reject with retry
    mockBackoffice('bo-1')
    vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
      id: 'cp-1',
      status: 'PENDING_REVIEW',
      client: { firstName: 'John', lastName: 'Doe', agentId: 'agent-1' },
    } as never)
    vi.mocked(prisma.clientPlatform.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

    await rejectPrequalWithRetry('client-1', 'Try again')

    // Cycle 1: agent resubmits
    vi.clearAllMocks()
    mockAgent('agent-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
    } as never)
    vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
      id: 'cp-1',
      status: 'RETRY_PENDING',
      retryAfter: new Date(Date.now() - 1000),
      retryCount: 1,
    } as never)
    vi.mocked(prisma.clientPlatform.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

    const { retryBetmgmSubmission } = await import('@/app/actions/betmgm-retry')
    const retry1 = await retryBetmgmSubmission('client-1', 'success', ['s1.png'])
    expect(retry1.success).toBe(true)

    // Verify retryCount incremented: retryCount was 1, so update sets it to 2
    expect(prisma.clientPlatform.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ retryCount: 2 }),
      }),
    )

    // Cycle 2: reject with retry again
    vi.clearAllMocks()
    mockBackoffice('bo-1')
    vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
      id: 'cp-1',
      status: 'PENDING_REVIEW',
      client: { firstName: 'John', lastName: 'Doe', agentId: 'agent-1' },
    } as never)
    vi.mocked(prisma.clientPlatform.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

    await rejectPrequalWithRetry('client-1', 'Still not good')

    // Cycle 2: agent resubmits
    vi.clearAllMocks()
    mockAgent('agent-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
    } as never)
    vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
      id: 'cp-1',
      status: 'RETRY_PENDING',
      retryAfter: new Date(Date.now() - 1000),
      retryCount: 2,
    } as never)
    vi.mocked(prisma.clientPlatform.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)

    const retry2 = await retryBetmgmSubmission('client-1', 'success', ['s2.png'])
    expect(retry2.success).toBe(true)

    // Verify retryCount now 3
    expect(prisma.clientPlatform.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ retryCount: 3 }),
      }),
    )

    // Final: backoffice approves
    vi.clearAllMocks()
    setupTransactionPassthrough()
    vi.mocked(prisma.client.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)
    vi.mocked(prisma.clientPlatform.updateMany).mockResolvedValue({ count: 1 } as never)

    mockBackoffice('bo-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-1',
      intakeStatus: 'PREQUAL_REVIEW',
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      executionDeadline: null,
    } as never)

    const approveResult = await approvePrequal('client-1')
    expect(approveResult.success).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Section 9: Authorization Matrix
// ─────────────────────────────────────────────────────────────────────────────

describe('authorization matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('backoffice actions reject AGENT role', () => {
    const backofficeActions = [
      { name: 'approvePrequal', fn: () => approvePrequal('client-1') },
      { name: 'rejectPrequal', fn: () => rejectPrequal('client-1') },
      { name: 'rejectPrequalWithRetry', fn: () => rejectPrequalWithRetry('client-1') },
      { name: 'approveClientIntake', fn: () => approveClientIntake('client-1') },
      { name: 'rejectClientIntake', fn: () => rejectClientIntake('client-1') },
    ]

    for (const { name, fn } of backofficeActions) {
      it(`${name} rejects AGENT role`, async () => {
        mockAgent()
        const result = await fn()
        expect(result).toEqual({ success: false, error: 'Unauthorized' })
      })
    }
  })

  describe('backoffice actions reject unauthenticated', () => {
    const backofficeActions = [
      { name: 'approvePrequal', fn: () => approvePrequal('client-1') },
      { name: 'rejectPrequal', fn: () => rejectPrequal('client-1') },
      { name: 'rejectPrequalWithRetry', fn: () => rejectPrequalWithRetry('client-1') },
      { name: 'approveClientIntake', fn: () => approveClientIntake('client-1') },
      { name: 'rejectClientIntake', fn: () => rejectClientIntake('client-1') },
    ]

    for (const { name, fn } of backofficeActions) {
      it(`${name} rejects unauthenticated users`, async () => {
        mockUnauthenticated()
        const result = await fn()
        expect(result).toEqual({ success: false, error: 'Unauthorized' })
      })
    }
  })

  describe('backoffice actions allow ADMIN role', () => {
    beforeEach(() => {
      mockAdmin('admin-1')
      setupTransactionPassthrough()
      vi.mocked(prisma.client.findUnique).mockResolvedValue({
        id: 'client-1',
        intakeStatus: 'PREQUAL_REVIEW',
        agentId: 'agent-1',
        firstName: 'John',
        lastName: 'Doe',
        executionDeadline: null,
      } as never)
      vi.mocked(prisma.client.update).mockResolvedValue({} as never)
      vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)
      vi.mocked(prisma.eventLog.createMany).mockResolvedValue({ count: 0 } as never)
      vi.mocked(prisma.toDo.updateMany).mockResolvedValue({ count: 0 } as never)
      vi.mocked(prisma.toDo.createMany).mockResolvedValue({ count: 0 } as never)
      vi.mocked(prisma.toDo.findMany).mockResolvedValue([] as never)
      vi.mocked(prisma.toDo.findFirst).mockResolvedValue(null as never)
      vi.mocked(prisma.clientPlatform.updateMany).mockResolvedValue({ count: 1 } as never)
    })

    it('approvePrequal allows ADMIN', async () => {
      const result = await approvePrequal('client-1')
      expect(result.success).toBe(true)
    })

    it('rejectPrequal allows ADMIN', async () => {
      const result = await rejectPrequal('client-1')
      expect(result.success).toBe(true)
    })

    it('rejectPrequalWithRetry allows ADMIN', async () => {
      vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
        id: 'cp-1',
        status: 'PENDING_REVIEW',
        client: { firstName: 'John', lastName: 'Doe', agentId: 'agent-1' },
      } as never)
      vi.mocked(prisma.clientPlatform.update).mockResolvedValue({} as never)

      const result = await rejectPrequalWithRetry('client-1')
      expect(result.success).toBe(true)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Section 10: Notification Coverage
// ─────────────────────────────────────────────────────────────────────────────

describe('notification coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupTransactionPassthrough()
    vi.mocked(prisma.client.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.createMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.toDo.updateMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.toDo.createMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.toDo.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.toDo.findFirst).mockResolvedValue(null as never)
    vi.mocked(prisma.clientPlatform.updateMany).mockResolvedValue({ count: 1 } as never)
    vi.mocked(prisma.clientPlatform.update).mockResolvedValue({} as never)
  })

  it('rejectPrequal sends REJECTION notification to agent via transitionClientStatus', async () => {
    mockBackoffice('bo-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-1',
      intakeStatus: 'PREQUAL_REVIEW',
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      executionDeadline: null,
    } as never)

    await rejectPrequal('client-1', 'Bad client')

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'agent-1',
        type: 'REJECTION',
        title: 'Client rejected',
        message: expect.stringContaining('John Doe'),
        link: '/agent/clients/client-1',
      }),
    )
  })

  it('rejectPrequalWithRetry sends PLATFORM_STATUS_CHANGE notification to agent', async () => {
    mockBackoffice('bo-1')
    vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
      id: 'cp-1',
      status: 'PENDING_REVIEW',
      client: { firstName: 'Jane', lastName: 'Smith', agentId: 'agent-2' },
    } as never)

    await rejectPrequalWithRetry('client-1', 'Out of focus')

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'agent-2',
        type: 'PLATFORM_STATUS_CHANGE',
        title: 'BetMGM needs resubmission',
        message: expect.stringContaining('Out of focus'),
      }),
    )
  })

  it('approveClientIntake sends APPROVAL notification to agent', async () => {
    mockBackoffice('bo-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-1',
      intakeStatus: 'READY_FOR_APPROVAL',
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      executionDeadline: null,
    } as never)

    await approveClientIntake('client-1')

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'agent-1',
        type: 'APPROVAL',
        title: 'Client approved',
        message: expect.stringContaining('John Doe'),
      }),
    )
  })

  it('rejectClientIntake sends REJECTION notification to agent', async () => {
    mockBackoffice('bo-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-1',
      intakeStatus: 'READY_FOR_APPROVAL',
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      executionDeadline: null,
    } as never)

    await rejectClientIntake('client-1', 'Failed review')

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'agent-1',
        type: 'REJECTION',
        title: 'Client rejected',
      }),
    )
  })

  it('approvePrequal does NOT send notification directly (transition to PREQUAL_APPROVED has no notification)', async () => {
    mockBackoffice('bo-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-1',
      intakeStatus: 'PREQUAL_REVIEW',
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      executionDeadline: null,
    } as never)

    await approvePrequal('client-1')

    // transitionClientStatus only sends notifications for APPROVED and REJECTED
    // PREQUAL_APPROVED is intermediate — no notification
    expect(createNotification).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Section 11: Event Log Coverage
// ─────────────────────────────────────────────────────────────────────────────

describe('event log coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupTransactionPassthrough()
    vi.mocked(prisma.client.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.createMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.toDo.updateMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.toDo.createMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.toDo.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.toDo.findFirst).mockResolvedValue(null as never)
    vi.mocked(prisma.clientPlatform.updateMany).mockResolvedValue({ count: 1 } as never)
    vi.mocked(prisma.clientPlatform.update).mockResolvedValue({} as never)
  })

  it('approvePrequal creates STATUS_CHANGE event (PREQUAL_REVIEW → PREQUAL_APPROVED)', async () => {
    mockBackoffice('bo-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-1',
      intakeStatus: 'PREQUAL_REVIEW',
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      executionDeadline: null,
    } as never)

    await approvePrequal('client-1')

    expect(prisma.eventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'STATUS_CHANGE',
        oldValue: 'PREQUAL_REVIEW',
        newValue: 'PREQUAL_APPROVED',
        description: expect.stringContaining('Status changed'),
      }),
    })
  })

  it('rejectPrequal creates STATUS_CHANGE event with reason', async () => {
    mockBackoffice('bo-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-1',
      intakeStatus: 'PREQUAL_REVIEW',
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      executionDeadline: null,
    } as never)

    await rejectPrequal('client-1', 'Background check failed')

    expect(prisma.eventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'STATUS_CHANGE',
        oldValue: 'PREQUAL_REVIEW',
        newValue: 'REJECTED',
        description: expect.stringContaining('Background check failed'),
      }),
    })
  })

  it('rejectPrequalWithRetry creates PLATFORM_STATUS_CHANGE event', async () => {
    mockBackoffice('bo-1')
    vi.mocked(prisma.clientPlatform.findFirst).mockResolvedValue({
      id: 'cp-1',
      status: 'PENDING_REVIEW',
      client: { firstName: 'John', lastName: 'Doe', agentId: 'agent-1' },
    } as never)

    await rejectPrequalWithRetry('client-1', 'Blurry')

    expect(prisma.eventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'PLATFORM_STATUS_CHANGE',
        oldValue: 'PENDING_REVIEW',
        newValue: 'RETRY_PENDING',
        description: expect.stringContaining('Blurry'),
      }),
    })
  })

  it('approveClientIntake creates STATUS_CHANGE event (READY_FOR_APPROVAL → APPROVED)', async () => {
    mockBackoffice('bo-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-1',
      intakeStatus: 'READY_FOR_APPROVAL',
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      executionDeadline: null,
    } as never)

    await approveClientIntake('client-1')

    expect(prisma.eventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'STATUS_CHANGE',
        oldValue: 'READY_FOR_APPROVAL',
        newValue: 'APPROVED',
      }),
    })
  })

  it('rejectClientIntake creates STATUS_CHANGE event with reason', async () => {
    mockBackoffice('bo-1')
    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: 'client-1',
      intakeStatus: 'READY_FOR_APPROVAL',
      agentId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      executionDeadline: null,
    } as never)

    await rejectClientIntake('client-1', 'Doc mismatch')

    expect(prisma.eventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'STATUS_CHANGE',
        oldValue: 'READY_FOR_APPROVAL',
        newValue: 'REJECTED',
        description: expect.stringContaining('Doc mismatch'),
      }),
    })
  })
})
