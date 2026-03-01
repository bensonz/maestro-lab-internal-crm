import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock auth
const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }))
vi.mock('@/backend/auth', () => ({ auth: mockAuth }))

// Mock next/cache
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// Mock Prisma
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    todo: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    clientDraft: {
      findUnique: vi.fn(),
    },
    client: {
      findUnique: vi.fn(),
    },
    eventLog: {
      create: vi.fn(),
    },
  },
}))
vi.mock('@/backend/prisma/client', () => ({ default: mockPrisma }))

import { completeTodo, revertTodo, assignTodo } from '@/app/actions/todos'

// ── assignTodo ───────────────────────────────────

describe('assignTodo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.todo.create.mockResolvedValue({ id: 'todo-new' })
    mockPrisma.eventLog.create.mockResolvedValue({})
  })

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await assignTodo('Contact Bank', '2026-03-01', { clientDraftId: 'draft-1' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('rejects AGENT role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'AGENT' } })
    const result = await assignTodo('Contact Bank', '2026-03-01', { clientDraftId: 'draft-1' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('rejects invalid issue category', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    const result = await assignTodo('Invalid Category', '2026-03-01', { clientDraftId: 'draft-1' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid issue category')
  })

  it('accepts new VIP category', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.clientDraft.findUnique.mockResolvedValue({
      id: 'draft-1',
      closerId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      closer: { name: 'Marcus Rivera' },
    })
    const result = await assignTodo('VIP Account — Reply Required', '2026-03-01', { clientDraftId: 'draft-1' })
    expect(result.success).toBe(true)
  })

  it('accepts new fund confirm categories', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.clientDraft.findUnique.mockResolvedValue({
      id: 'draft-1',
      closerId: 'agent-1',
      firstName: 'Jane',
      lastName: 'Smith',
      closer: { name: 'Lisa Wang' },
    })

    const r1 = await assignTodo('Confirm Fund Deposit', '2026-03-01', { clientDraftId: 'draft-1' })
    expect(r1.success).toBe(true)

    const r2 = await assignTodo('Confirm Fund Withdrawal', '2026-03-01', { clientDraftId: 'draft-1' })
    expect(r2.success).toBe(true)
  })

  it('requires either clientDraftId or clientId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    const result = await assignTodo('Contact Bank', '2026-03-01', {})
    expect(result.success).toBe(false)
    expect(result.error).toBe('Client draft or client ID is required')
  })

  it('works with clientDraftId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.clientDraft.findUnique.mockResolvedValue({
      id: 'draft-1',
      closerId: 'agent-1',
      firstName: 'John',
      lastName: 'Doe',
      closer: { name: 'Marcus Rivera' },
    })

    const result = await assignTodo('Contact Bank', '2026-03-01', { clientDraftId: 'draft-1' })
    expect(result.success).toBe(true)
    expect(mockPrisma.todo.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientDraftId: 'draft-1',
        clientId: null,
        assignedToId: 'agent-1',
      }),
    })
  })

  it('works with clientId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.client.findUnique.mockResolvedValue({
      id: 'client-1',
      firstName: 'Jane',
      lastName: 'Smith',
      closerId: 'agent-2',
      closer: { name: 'Lisa Wang' },
    })

    const result = await assignTodo('Contact PayPal', '2026-03-01', { clientId: 'client-1' })
    expect(result.success).toBe(true)
    expect(mockPrisma.todo.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientDraftId: null,
        clientId: 'client-1',
        assignedToId: 'agent-2',
      }),
    })
  })
})

// ── completeTodo ───────────────────────────────────

describe('completeTodo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.eventLog.create.mockResolvedValue({})
    mockPrisma.todo.update.mockResolvedValue({})
  })

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await completeTodo('todo-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('rejects AGENT role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'AGENT' } })
    const result = await completeTodo('todo-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('returns error for empty todoId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    const result = await completeTodo('  ')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Todo ID is required')
  })

  it('returns error if todo not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.todo.findUnique.mockResolvedValue(null)
    const result = await completeTodo('todo-999')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Todo not found')
  })

  it('successfully completes a pending todo with clientDraft', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'BACKOFFICE' } })
    mockPrisma.todo.findUnique.mockResolvedValue({
      id: 'todo-1',
      status: 'PENDING',
      issueCategory: 'Contact Bank',
      clientDraftId: 'draft-1',
      metadata: null,
      clientDraft: { firstName: 'John', lastName: 'Doe' },
      client: null,
      assignedTo: { id: 'a1', name: 'Marcus Rivera' },
      createdBy: { name: 'Nina Patel' },
    })

    const result = await completeTodo('todo-1')
    expect(result.success).toBe(true)
    expect(mockPrisma.eventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        description: expect.stringContaining('John Doe'),
      }),
    })
  })

  it('handles todo with clientId instead of clientDraft', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.todo.findUnique.mockResolvedValue({
      id: 'todo-2',
      status: 'PENDING',
      issueCategory: 'VIP Account — Reply Required',
      clientDraftId: null,
      metadata: null,
      clientDraft: null,
      client: { firstName: 'Jane', lastName: 'Smith' },
      assignedTo: { id: 'a2', name: 'Lisa Wang' },
      createdBy: { name: 'Admin' },
    })

    const result = await completeTodo('todo-2')
    expect(result.success).toBe(true)
    expect(mockPrisma.eventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        description: expect.stringContaining('Jane Smith'),
      }),
    })
  })
})

// ── revertTodo ────────────────────────────────────

describe('revertTodo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.eventLog.create.mockResolvedValue({})
    mockPrisma.todo.update.mockResolvedValue({})
  })

  it('rejects unauthenticated users', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await revertTodo('todo-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('rejects AGENT role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'AGENT' } })
    const result = await revertTodo('todo-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('returns error for empty todoId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    const result = await revertTodo('  ')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Todo ID is required')
  })

  it('returns error if todo is not completed', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.todo.findUnique.mockResolvedValue({
      id: 'todo-1',
      status: 'PENDING',
      clientDraft: { firstName: 'John', lastName: 'Doe' },
      client: null,
      assignedTo: { id: 'a1', name: 'Agent' },
    })
    const result = await revertTodo('todo-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Todo is not completed')
  })

  it('successfully reverts a completed todo', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'BACKOFFICE' } })
    mockPrisma.todo.findUnique.mockResolvedValue({
      id: 'todo-1',
      status: 'COMPLETED',
      issueCategory: 'Contact Bank',
      clientDraftId: 'draft-1',
      metadata: { completedById: 'u2' },
      clientDraft: { firstName: 'John', lastName: 'Doe' },
      client: null,
      assignedTo: { id: 'a1', name: 'Marcus Rivera' },
    })

    const result = await revertTodo('todo-1')
    expect(result.success).toBe(true)
    expect(mockPrisma.todo.update).toHaveBeenCalledWith({
      where: { id: 'todo-1' },
      data: expect.objectContaining({
        status: 'PENDING',
        completedAt: null,
      }),
    })
  })
})
