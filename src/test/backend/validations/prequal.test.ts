import { describe, it, expect } from 'vitest'
import { prequalSchema, updateGmailSchema } from '@/lib/validations/prequal'

describe('prequalSchema', () => {
  const validData = {
    firstName: 'John',
    lastName: 'Doe',
    gmailAccount: 'john.doe@gmail.com',
    gmailPassword: 'SecurePass123',
    agentConfirmsId: 'true',
  }

  it('passes with valid data', () => {
    const result = prequalSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('requires firstName', () => {
    const result = prequalSchema.safeParse({ ...validData, firstName: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.firstName).toBeDefined()
    }
  })

  it('requires lastName', () => {
    const result = prequalSchema.safeParse({ ...validData, lastName: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.lastName).toBeDefined()
    }
  })

  it('requires valid gmail email', () => {
    const result = prequalSchema.safeParse({
      ...validData,
      gmailAccount: 'not-an-email',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.flatten().fieldErrors.gmailAccount,
      ).toBeDefined()
    }
  })

  it('requires gmailPassword', () => {
    const result = prequalSchema.safeParse({
      ...validData,
      gmailPassword: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.flatten().fieldErrors.gmailPassword,
      ).toBeDefined()
    }
  })

  it('requires agentConfirmsId to be true', () => {
    const result = prequalSchema.safeParse({
      ...validData,
      agentConfirmsId: 'false',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.flatten().fieldErrors.agentConfirmsId,
      ).toBeDefined()
    }
  })

  it('preprocesses agentConfirmsId string "true" to boolean true', () => {
    const result = prequalSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.agentConfirmsId).toBe(true)
    }
  })

  it('allows optional middleName', () => {
    const result = prequalSchema.safeParse({
      ...validData,
      middleName: 'Michael',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.middleName).toBe('Michael')
    }
  })

  it('allows optional dateOfBirth', () => {
    const result = prequalSchema.safeParse({
      ...validData,
      dateOfBirth: '1985-06-15',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.dateOfBirth).toBe('1985-06-15')
    }
  })

  it('allows optional idExpiry', () => {
    const result = prequalSchema.safeParse({
      ...validData,
      idExpiry: '2030-12-31',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.idExpiry).toBe('2030-12-31')
    }
  })

  it('handles null values by converting to undefined', () => {
    const result = prequalSchema.safeParse({
      ...validData,
      middleName: null,
      dateOfBirth: null,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.middleName).toBeUndefined()
      expect(result.data.dateOfBirth).toBeUndefined()
    }
  })
})

describe('updateGmailSchema', () => {
  it('passes with valid data', () => {
    const result = updateGmailSchema.safeParse({
      clientId: 'client-123',
      gmailAccount: 'new@gmail.com',
      gmailPassword: 'newpass',
    })
    expect(result.success).toBe(true)
  })

  it('requires clientId', () => {
    const result = updateGmailSchema.safeParse({
      clientId: '',
      gmailAccount: 'new@gmail.com',
      gmailPassword: 'newpass',
    })
    expect(result.success).toBe(false)
  })

  it('requires valid gmail email', () => {
    const result = updateGmailSchema.safeParse({
      clientId: 'client-123',
      gmailAccount: 'invalid',
      gmailPassword: 'newpass',
    })
    expect(result.success).toBe(false)
  })

  it('requires gmailPassword', () => {
    const result = updateGmailSchema.safeParse({
      clientId: 'client-123',
      gmailAccount: 'new@gmail.com',
      gmailPassword: '',
    })
    expect(result.success).toBe(false)
  })
})
