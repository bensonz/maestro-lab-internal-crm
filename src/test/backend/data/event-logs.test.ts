import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    eventLog: {
      findMany: vi.fn(),
    },
  },
}))
vi.mock('@/backend/prisma/client', () => ({ default: mockPrisma }))

import { getAgentTimeline } from '@/backend/data/event-logs'

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: `evt-${Math.random().toString(36).slice(2, 8)}`,
    eventType: 'USER_UPDATED',
    description: 'Test event',
    userId: 'agent-1',
    user: { name: 'Sarah Chen' },
    metadata: null,
    createdAt: new Date('2026-02-20T10:00:00Z'),
    ...overrides,
  }
}

describe('getAgentTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array when no events exist', async () => {
    mockPrisma.eventLog.findMany.mockResolvedValue([])

    const result = await getAgentTimeline('agent-1')
    expect(result).toEqual([])
    expect(mockPrisma.eventLog.findMany).toHaveBeenCalledTimes(2)
  })

  it('merges own events and about events', async () => {
    const ownEvent = makeEvent({
      id: 'evt-own',
      description: 'Agent logged in',
      eventType: 'LOGIN',
      createdAt: new Date('2026-02-20T10:00:00Z'),
    })
    const aboutEvent = makeEvent({
      id: 'evt-about',
      description: 'Updated Company Phone: 111 → 222',
      eventType: 'USER_UPDATED',
      userId: 'admin-1',
      user: { name: 'Admin User' },
      createdAt: new Date('2026-02-21T10:00:00Z'),
    })

    // First call = own events, second call = about events
    mockPrisma.eventLog.findMany
      .mockResolvedValueOnce([ownEvent])
      .mockResolvedValueOnce([aboutEvent])

    const result = await getAgentTimeline('agent-1')
    expect(result).toHaveLength(2)
    // Newest first
    expect(result[0].event).toBe('Updated Company Phone: 111 → 222')
    expect(result[1].event).toBe('Agent logged in')
  })

  it('deduplicates events by ID', async () => {
    const sharedEvent = makeEvent({ id: 'evt-shared' })

    mockPrisma.eventLog.findMany
      .mockResolvedValueOnce([sharedEvent])
      .mockResolvedValueOnce([sharedEvent])

    const result = await getAgentTimeline('agent-1')
    expect(result).toHaveLength(1)
  })

  it('sorts newest first', async () => {
    const older = makeEvent({
      id: 'evt-1',
      description: 'Older event',
      createdAt: new Date('2026-02-18T10:00:00Z'),
    })
    const newer = makeEvent({
      id: 'evt-2',
      description: 'Newer event',
      createdAt: new Date('2026-02-22T10:00:00Z'),
    })

    mockPrisma.eventLog.findMany
      .mockResolvedValueOnce([older, newer])
      .mockResolvedValueOnce([])

    const result = await getAgentTimeline('agent-1')
    expect(result[0].event).toBe('Newer event')
    expect(result[1].event).toBe('Older event')
  })

  it('maps event types to timeline types correctly', async () => {
    const successEvent = makeEvent({ id: 'evt-s', eventType: 'CLIENT_APPROVED' })
    const warningEvent = makeEvent({ id: 'evt-w', eventType: 'USER_DEACTIVATED' })
    const infoEvent = makeEvent({ id: 'evt-i', eventType: 'LOGIN' })

    mockPrisma.eventLog.findMany
      .mockResolvedValueOnce([successEvent, warningEvent, infoEvent])
      .mockResolvedValueOnce([])

    const result = await getAgentTimeline('agent-1')
    const types = result.map((r) => r.type)
    expect(types).toContain('success')
    expect(types).toContain('warning')
    expect(types).toContain('info')
  })

  it('includes actor name in results', async () => {
    const event = makeEvent({
      id: 'evt-1',
      user: { name: 'Sarah Chen' },
    })

    mockPrisma.eventLog.findMany
      .mockResolvedValueOnce([event])
      .mockResolvedValueOnce([])

    const result = await getAgentTimeline('agent-1')
    expect(result[0].actor).toBe('Sarah Chen')
  })

  it('returns null actor when user is missing', async () => {
    const event = makeEvent({
      id: 'evt-1',
      user: null,
    })

    mockPrisma.eventLog.findMany
      .mockResolvedValueOnce([event])
      .mockResolvedValueOnce([])

    const result = await getAgentTimeline('agent-1')
    expect(result[0].actor).toBeNull()
  })

  it('limits to 50 entries', async () => {
    const events = Array.from({ length: 60 }, (_, i) =>
      makeEvent({
        id: `evt-${i}`,
        createdAt: new Date(2026, 1, 20, i),
      }),
    )

    mockPrisma.eventLog.findMany
      .mockResolvedValueOnce(events)
      .mockResolvedValueOnce([])

    const result = await getAgentTimeline('agent-1')
    expect(result).toHaveLength(50)
  })
})
