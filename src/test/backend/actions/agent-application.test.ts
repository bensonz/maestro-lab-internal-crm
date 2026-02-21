import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('$2a$12$mockhash'),
}))

// Mock Prisma — use vi.hoisted to avoid hoisting issues
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
    },
    agentApplication: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    eventLog: {
      create: vi.fn(),
    },
  },
}))
vi.mock('@/backend/prisma/client', () => ({ default: mockPrisma }))

import { submitAgentApplication } from '@/app/actions/agent-application'

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const defaults: Record<string, string> = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '(555) 123-4567',
    password: 'password123',
    confirmPassword: 'password123',
    citizenship: 'us_citizen',
  }
  const fd = new FormData()
  for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
    fd.set(key, value)
  }
  return fd
}

describe('submitAgentApplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.agentApplication.findFirst.mockResolvedValue(null)
    mockPrisma.agentApplication.create.mockResolvedValue({
      id: 'app-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
    })
    mockPrisma.eventLog.create.mockResolvedValue({ id: 'ev-1' })
  })

  it('validates missing required fields', async () => {
    const fd = new FormData()
    fd.set('firstName', '')
    fd.set('lastName', '')
    fd.set('email', '')
    fd.set('phone', '')
    fd.set('password', '')
    fd.set('confirmPassword', '')

    const result = await submitAgentApplication(fd)

    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
    expect(result.errors?.firstName).toBeDefined()
    expect(result.errors?.email).toBeDefined()
  })

  it('validates invalid email', async () => {
    const fd = buildFormData({ email: 'not-an-email' })
    const result = await submitAgentApplication(fd)

    expect(result.success).toBe(false)
    expect(result.errors?.email).toBeDefined()
  })

  it('validates short password', async () => {
    const fd = buildFormData({ password: '123', confirmPassword: '123' })
    const result = await submitAgentApplication(fd)

    expect(result.success).toBe(false)
    expect(result.errors?.password).toBeDefined()
  })

  it('validates password mismatch', async () => {
    const fd = buildFormData({ confirmPassword: 'different123' })
    const result = await submitAgentApplication(fd)

    expect(result.success).toBe(false)
    expect(result.errors?.confirmPassword).toBeDefined()
  })

  it('rejects duplicate email in User table', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'john.doe@example.com' })

    const fd = buildFormData()
    const result = await submitAgentApplication(fd)

    expect(result.success).toBe(false)
    expect(result.errors?.email?.[0]).toContain('already exists')
  })

  it('rejects duplicate email in pending Application table', async () => {
    mockPrisma.agentApplication.findFirst.mockResolvedValue({
      id: 'app-existing',
      email: 'john.doe@example.com',
      status: 'PENDING',
    })

    const fd = buildFormData()
    const result = await submitAgentApplication(fd)

    expect(result.success).toBe(false)
    expect(result.errors?.email?.[0]).toContain('pending application')
  })

  it('creates application and event log on success', async () => {
    const fd = buildFormData()
    const result = await submitAgentApplication(fd)

    expect(result.success).toBe(true)
    expect(result.applicationId).toBe('app-1')
    expect(mockPrisma.agentApplication.create).toHaveBeenCalledTimes(1)
    expect(mockPrisma.eventLog.create).toHaveBeenCalledTimes(1)

    const createCall = mockPrisma.agentApplication.create.mock.calls[0][0]
    expect(createCall.data.firstName).toBe('John')
    expect(createCall.data.lastName).toBe('Doe')
    expect(createCall.data.email).toBe('john.doe@example.com')
    expect(createCall.data.password).toBe('$2a$12$mockhash')
  })

  it('passes optional fields correctly', async () => {
    const fd = buildFormData({
      gender: 'male',
      citizenship: 'US',
      zelle: 'john@zelle.com',
      referredByName: 'Marcus Rivera',
    })
    const result = await submitAgentApplication(fd)

    expect(result.success).toBe(true)

    const createCall = mockPrisma.agentApplication.create.mock.calls[0][0]
    expect(createCall.data.gender).toBe('male')
    expect(createCall.data.citizenship).toBe('US')
    expect(createCall.data.zelle).toBe('john@zelle.com')
    expect(createCall.data.referredByName).toBe('Marcus Rivera')
  })

  it('persists addressDocument when provided', async () => {
    const fd = buildFormData()
    fd.set('idDocument', '/uploads/id-photo.jpg')
    fd.set('addressDocument', '/uploads/address-proof.jpg')

    const result = await submitAgentApplication(fd)

    expect(result.success).toBe(true)

    const createCall = mockPrisma.agentApplication.create.mock.calls[0][0]
    expect(createCall.data.idDocument).toBe('/uploads/id-photo.jpg')
    expect(createCall.data.addressDocument).toBe('/uploads/address-proof.jpg')
  })

  it('sets addressDocument to null when not provided', async () => {
    const fd = buildFormData()
    const result = await submitAgentApplication(fd)

    expect(result.success).toBe(true)

    const createCall = mockPrisma.agentApplication.create.mock.calls[0][0]
    expect(createCall.data.addressDocument).toBeNull()
  })
})
