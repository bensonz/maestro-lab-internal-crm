import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Auth mock: supports both standalone auth() and wrapper auth(handler) patterns
let mockSession: { user: { id: string; role: string } } | null = null

vi.mock('@/backend/auth', () => ({
  auth: vi.fn((handlerOrNothing?: unknown) => {
    if (typeof handlerOrNothing === 'function') {
      return async (req?: unknown) => {
        const r = (req ?? {}) as Record<string, unknown>
        r.auth = mockSession
        return (handlerOrNothing as (req: unknown) => Promise<unknown>)(r)
      }
    }
    return Promise.resolve(mockSession)
  }),
}))

vi.mock('@/backend/prisma/client', () => ({
  default: {
    client: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    toDo: {
      findMany: vi.fn(),
    },
  },
}))

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'

const mockClient = prisma.client as unknown as {
  findMany: ReturnType<typeof vi.fn>
}
const mockUser = prisma.user as unknown as {
  findMany: ReturnType<typeof vi.fn>
}
const mockToDo = prisma.toDo as unknown as {
  findMany: ReturnType<typeof vi.fn>
}

function mockAuth(userId: string | null, role?: string) {
  mockSession = userId
    ? { user: { id: userId, role: role ?? 'AGENT' } }
    : null
}

function makeRequest(query: string) {
  return new NextRequest(`http://localhost:3000/api/search?q=${encodeURIComponent(query)}`)
}

async function importRoute() {
  const mod = await import('@/app/api/search/route')
  return mod.GET
}

beforeEach(() => {
  vi.clearAllMocks()
  mockClient.findMany.mockResolvedValue([])
  mockUser.findMany.mockResolvedValue([])
  mockToDo.findMany.mockResolvedValue([])
})

describe('GET /api/search', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(null)
    const GET = await importRoute()
    const response = await GET(makeRequest('test'))

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.results).toEqual([])
  })

  it('returns empty results for query shorter than 2 chars', async () => {
    mockAuth('user-1', 'AGENT')
    const GET = await importRoute()
    const response = await GET(makeRequest('a'))

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.results).toEqual([])
    expect(mockClient.findMany).not.toHaveBeenCalled()
  })

  it('searches clients by first name', async () => {
    mockAuth('agent-1', 'AGENT')
    mockClient.findMany.mockResolvedValue([
      {
        id: 'c1',
        firstName: 'John',
        lastName: 'Doe',
        intakeStatus: 'APPROVED',
        email: 'john@test.com',
      },
    ])

    const GET = await importRoute()
    const response = await GET(makeRequest('john'))
    const data = await response.json()

    expect(data.results).toHaveLength(1)
    expect(data.results[0]).toMatchObject({
      type: 'client',
      id: 'c1',
      title: 'John Doe',
    })
  })

  it('searches clients by email', async () => {
    mockAuth('agent-1', 'AGENT')
    mockClient.findMany.mockResolvedValue([
      {
        id: 'c2',
        firstName: 'Jane',
        lastName: 'Smith',
        intakeStatus: 'PENDING',
        email: 'jane@example.com',
      },
    ])

    const GET = await importRoute()
    const response = await GET(makeRequest('jane@example'))
    const data = await response.json()

    expect(data.results).toHaveLength(1)
    expect(data.results[0].title).toBe('Jane Smith')
    expect(data.results[0].subtitle).toBe('jane@example.com')
  })

  it('agent role only sees own clients (agentId filter applied)', async () => {
    mockAuth('agent-1', 'AGENT')

    const GET = await importRoute()
    await GET(makeRequest('test'))

    expect(mockClient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          agentId: 'agent-1',
        }),
      }),
    )
  })

  it('agent role does not get agent results', async () => {
    mockAuth('agent-1', 'AGENT')
    mockClient.findMany.mockResolvedValue([])
    mockToDo.findMany.mockResolvedValue([])

    const GET = await importRoute()
    await GET(makeRequest('test'))

    // user.findMany should NOT be called for agents
    expect(mockUser.findMany).not.toHaveBeenCalled()
  })

  it('backoffice role sees all clients and agents', async () => {
    mockAuth('admin-1', 'BACKOFFICE')
    mockClient.findMany.mockResolvedValue([
      {
        id: 'c1',
        firstName: 'Alice',
        lastName: 'Test',
        intakeStatus: 'APPROVED',
        email: null,
      },
    ])
    mockUser.findMany.mockResolvedValue([
      {
        id: 'a1',
        name: 'Agent Test',
        email: 'agent@test.com',
        tier: 'rookie',
        starLevel: 1,
        isActive: true,
      },
    ])

    const GET = await importRoute()
    const response = await GET(makeRequest('test'))
    const data = await response.json()

    // Should have both client and agent results
    const types = data.results.map((r: { type: string }) => r.type)
    expect(types).toContain('client')
    expect(types).toContain('agent')

    // Client query should NOT have agentId filter
    expect(mockClient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          agentId: expect.any(String),
        }),
      }),
    )
  })

  it('results include correct link paths for agent role', async () => {
    mockAuth('agent-1', 'AGENT')
    mockClient.findMany.mockResolvedValue([
      {
        id: 'c1',
        firstName: 'John',
        lastName: 'Doe',
        intakeStatus: 'APPROVED',
        email: null,
      },
    ])
    mockToDo.findMany.mockResolvedValue([
      {
        id: 't1',
        title: 'Test Todo',
        status: 'PENDING',
        type: 'EXECUTION',
        clientId: 'c1',
      },
    ])

    const GET = await importRoute()
    const response = await GET(makeRequest('test'))
    const data = await response.json()

    const clientResult = data.results.find((r: { type: string }) => r.type === 'client')
    expect(clientResult.link).toBe('/agent/clients/c1')

    const taskResult = data.results.find((r: { type: string }) => r.type === 'task')
    expect(taskResult.link).toBe('/agent/todo-list')
  })

  it('results include correct link paths for backoffice role', async () => {
    mockAuth('admin-1', 'ADMIN')
    mockClient.findMany.mockResolvedValue([
      {
        id: 'c1',
        firstName: 'John',
        lastName: 'Doe',
        intakeStatus: 'APPROVED',
        email: null,
      },
    ])
    mockToDo.findMany.mockResolvedValue([
      {
        id: 't1',
        title: 'Test Todo',
        status: 'PENDING',
        type: 'EXECUTION',
        clientId: 'c1',
      },
    ])

    const GET = await importRoute()
    const response = await GET(makeRequest('test'))
    const data = await response.json()

    const clientResult = data.results.find((r: { type: string }) => r.type === 'client')
    expect(clientResult.link).toBe('/backoffice/client-management')

    const taskResult = data.results.find((r: { type: string }) => r.type === 'task')
    expect(taskResult.link).toBe('/backoffice/todo-list')
  })
})
