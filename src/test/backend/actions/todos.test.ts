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
    eventLog: {
      create: vi.fn(),
    },
  },
}))
vi.mock('@/backend/prisma/client', () => ({ default: mockPrisma }))

import { completeTodo, revertTodo, assignTodo } from '@/app/actions/todos'

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

  it('rejects FINANCE role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'FINANCE' } })
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

  it('returns error if todo is already completed', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.todo.findUnique.mockResolvedValue({
      id: 'todo-1',
      status: 'COMPLETED',
      clientDraft: { firstName: 'John', lastName: 'Doe' },
      assignedTo: { id: 'a1', name: 'Agent' },
      createdBy: { name: 'Admin' },
    })
    const result = await completeTodo('todo-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Todo is not pending')
  })

  it('successfully completes a pending todo', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'BACKOFFICE' } })
    mockPrisma.todo.findUnique.mockResolvedValue({
      id: 'todo-1',
      status: 'PENDING',
      issueCategory: 'Contact Bank',
      clientDraftId: 'draft-1',
      metadata: null,
      clientDraft: { firstName: 'John', lastName: 'Doe' },
      assignedTo: { id: 'a1', name: 'Marcus Rivera' },
      createdBy: { name: 'Nina Patel' },
    })

    const result = await completeTodo('todo-1')

    expect(result.success).toBe(true)

    // Verify todo was updated
    expect(mockPrisma.todo.update).toHaveBeenCalledWith({
      where: { id: 'todo-1' },
      data: expect.objectContaining({
        status: 'COMPLETED',
        completedAt: expect.any(Date),
        metadata: expect.objectContaining({
          completedById: 'u1',
        }),
      }),
    })

    // Verify EventLog was created
    expect(mockPrisma.eventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'TODO_COMPLETED',
        userId: 'u1',
        description: expect.stringContaining('Contact Bank'),
        metadata: expect.objectContaining({
          todoId: 'todo-1',
          clientDraftId: 'draft-1',
          clientName: 'John Doe',
          agentId: 'a1',
          agentName: 'Marcus Rivera',
          issueCategory: 'Contact Bank',
        }),
      }),
    })
  })

  it('preserves existing metadata when completing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.todo.findUnique.mockResolvedValue({
      id: 'todo-1',
      status: 'PENDING',
      issueCategory: 'Contact PayPal',
      clientDraftId: 'draft-1',
      metadata: { existingKey: 'existingValue' },
      clientDraft: { firstName: 'Jane', lastName: null },
      assignedTo: { id: 'a2', name: 'Agent' },
      createdBy: { name: 'Admin' },
    })

    await completeTodo('todo-1')

    expect(mockPrisma.todo.update).toHaveBeenCalledWith({
      where: { id: 'todo-1' },
      data: expect.objectContaining({
        metadata: expect.objectContaining({
          existingKey: 'existingValue',
          completedById: 'u1',
        }),
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

  it('rejects FINANCE role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'FINANCE' } })
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

  it('returns error if todo not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.todo.findUnique.mockResolvedValue(null)
    const result = await revertTodo('todo-999')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Todo not found')
  })

  it('returns error if todo is not completed (still pending)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.todo.findUnique.mockResolvedValue({
      id: 'todo-1',
      status: 'PENDING',
      clientDraft: { firstName: 'John', lastName: 'Doe' },
      assignedTo: { id: 'a1', name: 'Agent' },
    })
    const result = await revertTodo('todo-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Todo is not completed')
  })

  it('successfully reverts a completed todo to pending', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'BACKOFFICE' } })
    mockPrisma.todo.findUnique.mockResolvedValue({
      id: 'todo-1',
      status: 'COMPLETED',
      issueCategory: 'Contact Bank',
      clientDraftId: 'draft-1',
      metadata: { completedById: 'u2' },
      clientDraft: { firstName: 'John', lastName: 'Doe' },
      assignedTo: { id: 'a1', name: 'Marcus Rivera' },
    })

    const result = await revertTodo('todo-1')

    expect(result.success).toBe(true)

    // Verify todo was updated back to PENDING
    expect(mockPrisma.todo.update).toHaveBeenCalledWith({
      where: { id: 'todo-1' },
      data: expect.objectContaining({
        status: 'PENDING',
        completedAt: null,
        metadata: expect.objectContaining({
          completedById: 'u2',
          revertedById: 'u1',
          revertedAt: expect.any(String),
        }),
      }),
    })

    // Verify EventLog was created with revert metadata
    expect(mockPrisma.eventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'TODO_REVERTED',
        userId: 'u1',
        description: expect.stringContaining('reverted to pending'),
        metadata: expect.objectContaining({
          todoId: 'todo-1',
          clientDraftId: 'draft-1',
          clientName: 'John Doe',
          agentId: 'a1',
          agentName: 'Marcus Rivera',
          issueCategory: 'Contact Bank',
          action: 'revert_to_pending',
        }),
      }),
    })
  })

  it('preserves existing metadata when reverting', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } })
    mockPrisma.todo.findUnique.mockResolvedValue({
      id: 'todo-1',
      status: 'COMPLETED',
      issueCategory: 'Platforms Verification',
      clientDraftId: 'draft-1',
      metadata: { completedById: 'u2', customField: 'value' },
      clientDraft: { firstName: 'Jane', lastName: 'Smith' },
      assignedTo: { id: 'a2', name: 'Lisa Wang' },
    })

    await revertTodo('todo-1')

    expect(mockPrisma.todo.update).toHaveBeenCalledWith({
      where: { id: 'todo-1' },
      data: expect.objectContaining({
        metadata: expect.objectContaining({
          completedById: 'u2',
          customField: 'value',
          revertedById: 'u1',
        }),
      }),
    })
  })
})
