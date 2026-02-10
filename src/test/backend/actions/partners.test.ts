import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/backend/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/backend/prisma/client', () => ({
  default: {
    partner: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    client: {
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    eventLog: {
      create: vi.fn(),
    },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { revalidatePath } from 'next/cache'
import {
  createPartner,
  updatePartner,
  deletePartner,
  assignClientToPartner,
  bulkAssignPartner,
} from '@/app/actions/partners'

function mockAuth(userId: string | null, role?: string) {
  vi.mocked(auth).mockResolvedValue(
    userId ? ({ user: { id: userId, role } } as never) : null,
  )
}

// ── createPartner ──────────────────────────────────────────────────

describe('createPartner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.partner.create).mockResolvedValue({} as never)
  })

  it('rejects if not authenticated', async () => {
    mockAuth(null)
    const result = await createPartner({ name: 'Test' })
    expect(result).toEqual({ success: false, error: 'Not authenticated' })
  })

  it('rejects AGENT role', async () => {
    mockAuth('user-1', 'AGENT')
    const result = await createPartner({ name: 'Test' })
    expect(result).toEqual({
      success: false,
      error: 'Insufficient permissions',
    })
  })

  it('rejects FINANCE role', async () => {
    mockAuth('user-1', 'FINANCE')
    const result = await createPartner({ name: 'Test' })
    expect(result).toEqual({
      success: false,
      error: 'Insufficient permissions',
    })
  })

  it('requires name', async () => {
    mockAuth('admin-1', 'ADMIN')
    const result = await createPartner({ name: '' })
    expect(result).toEqual({
      success: false,
      error: 'Partner name is required',
    })
  })

  it('creates partner for ADMIN', async () => {
    mockAuth('admin-1', 'ADMIN')
    const result = await createPartner({
      name: 'Acme Corp',
      contactName: 'John',
      type: 'referral',
    })

    expect(result).toEqual({ success: true })
    expect(prisma.partner.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Acme Corp',
        contactName: 'John',
        type: 'referral',
      }),
    })
    expect(revalidatePath).toHaveBeenCalledWith('/backoffice/partners')
  })

  it('creates partner for BACKOFFICE', async () => {
    mockAuth('bo-1', 'BACKOFFICE')
    const result = await createPartner({ name: 'Partner Inc' })

    expect(result).toEqual({ success: true })
    expect(prisma.partner.create).toHaveBeenCalled()
  })
})

// ── assignClientToPartner ──────────────────────────────────────────

describe('assignClientToPartner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.client.update).mockResolvedValue({} as never)
    vi.mocked(prisma.eventLog.create).mockResolvedValue({} as never)
  })

  it('rejects if not authenticated', async () => {
    mockAuth(null)
    const result = await assignClientToPartner({
      clientId: 'c1',
      partnerId: 'p1',
    })
    expect(result).toEqual({ success: false, error: 'Not authenticated' })
  })

  it('rejects AGENT role', async () => {
    mockAuth('user-1', 'AGENT')
    const result = await assignClientToPartner({
      clientId: 'c1',
      partnerId: 'p1',
    })
    expect(result).toEqual({
      success: false,
      error: 'Insufficient permissions',
    })
  })

  it('updates client partnerId', async () => {
    mockAuth('admin-1', 'ADMIN')
    const result = await assignClientToPartner({
      clientId: 'c1',
      partnerId: 'p1',
    })

    expect(result).toEqual({ success: true })
    expect(prisma.client.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { partnerId: 'p1' },
    })
    expect(prisma.eventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        description: 'Client assigned to partner',
        clientId: 'c1',
      }),
    })
  })

  it('unassigns client when partnerId is null', async () => {
    mockAuth('admin-1', 'ADMIN')
    const result = await assignClientToPartner({
      clientId: 'c1',
      partnerId: null,
    })

    expect(result).toEqual({ success: true })
    expect(prisma.client.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { partnerId: null },
    })
    expect(prisma.eventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        description: 'Client unassigned from partner',
      }),
    })
  })
})

// ── deletePartner ──────────────────────────────────────────────────

describe('deletePartner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.partner.delete).mockResolvedValue({} as never)
  })

  it('prevents deletion with assigned clients', async () => {
    mockAuth('admin-1', 'ADMIN')
    vi.mocked(prisma.client.count).mockResolvedValueOnce(3 as never)

    const result = await deletePartner('p1')
    expect(result).toEqual({
      success: false,
      error: 'Cannot delete partner with 3 assigned client(s). Reassign them first.',
    })
    expect(prisma.partner.delete).not.toHaveBeenCalled()
  })

  it('deletes partner with no assigned clients', async () => {
    mockAuth('admin-1', 'ADMIN')
    vi.mocked(prisma.client.count).mockResolvedValueOnce(0 as never)

    const result = await deletePartner('p1')
    expect(result).toEqual({ success: true })
    expect(prisma.partner.delete).toHaveBeenCalledWith({
      where: { id: 'p1' },
    })
  })
})

// ── bulkAssignPartner ──────────────────────────────────────────────

describe('bulkAssignPartner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects if not authenticated', async () => {
    mockAuth(null)
    const result = await bulkAssignPartner({
      clientIds: ['c1'],
      partnerId: 'p1',
    })
    expect(result).toEqual({
      success: false,
      updated: 0,
      error: 'Not authenticated',
    })
  })

  it('rejects empty client IDs', async () => {
    mockAuth('admin-1', 'ADMIN')
    const result = await bulkAssignPartner({
      clientIds: [],
      partnerId: 'p1',
    })
    expect(result).toEqual({
      success: false,
      updated: 0,
      error: 'No clients selected',
    })
  })

  it('assigns multiple clients', async () => {
    mockAuth('admin-1', 'ADMIN')
    vi.mocked(prisma.client.updateMany).mockResolvedValueOnce({
      count: 3,
    } as never)

    const result = await bulkAssignPartner({
      clientIds: ['c1', 'c2', 'c3'],
      partnerId: 'p1',
    })

    expect(result).toEqual({ success: true, updated: 3 })
    expect(prisma.client.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['c1', 'c2', 'c3'] } },
      data: { partnerId: 'p1' },
    })
  })
})
