import { describe, it, expect } from 'vitest'
import { createClientSchema, saveDraftSchema } from '@/lib/validations/client'

describe('createClientSchema', () => {
  const validData = {
    firstName: 'John',
    lastName: 'Doe',
    phone: '555-123-4567',
    email: 'john@example.com',
    primaryAddress: '123 Main St',
    primaryCity: 'Austin',
    primaryState: 'TX',
    primaryZip: '78701',
    agentConfirmsSuitable: true,
  }

  describe('required fields', () => {
    it('validates complete valid data', () => {
      const result = createClientSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('rejects missing firstName', () => {
      const result = createClientSchema.safeParse({
        ...validData,
        firstName: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.firstName).toBeDefined()
      }
    })

    it('rejects missing lastName', () => {
      const result = createClientSchema.safeParse({
        ...validData,
        lastName: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.lastName).toBeDefined()
      }
    })

    it('rejects missing phone', () => {
      const result = createClientSchema.safeParse({
        ...validData,
        phone: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.phone).toBeDefined()
      }
    })

    it('rejects missing primaryAddress', () => {
      const result = createClientSchema.safeParse({
        ...validData,
        primaryAddress: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.primaryAddress).toBeDefined()
      }
    })

    it('rejects missing primaryCity', () => {
      const result = createClientSchema.safeParse({
        ...validData,
        primaryCity: '',
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing primaryState', () => {
      const result = createClientSchema.safeParse({
        ...validData,
        primaryState: '',
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing primaryZip', () => {
      const result = createClientSchema.safeParse({
        ...validData,
        primaryZip: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('email validation', () => {
    it('accepts valid email', () => {
      const result = createClientSchema.safeParse({
        ...validData,
        email: 'test@example.com',
      })
      expect(result.success).toBe(true)
    })

    it('accepts empty email (optional)', () => {
      const result = createClientSchema.safeParse({
        ...validData,
        email: '',
      })
      expect(result.success).toBe(true)
    })

    it('accepts undefined email (optional)', () => {
      const { email: _, ...dataWithoutEmail } = validData
      const result = createClientSchema.safeParse(dataWithoutEmail)
      expect(result.success).toBe(true)
    })

    it('rejects invalid email format', () => {
      const result = createClientSchema.safeParse({
        ...validData,
        email: 'not-an-email',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.email).toBeDefined()
      }
    })
  })

  describe('agent confirmation', () => {
    it('rejects when agentConfirmsSuitable is false', () => {
      const result = createClientSchema.safeParse({
        ...validData,
        agentConfirmsSuitable: false,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(
          result.error.flatten().fieldErrors.agentConfirmsSuitable
        ).toBeDefined()
      }
    })

    it('accepts string "true" (form submission)', () => {
      const result = createClientSchema.safeParse({
        ...validData,
        agentConfirmsSuitable: 'true',
      })
      expect(result.success).toBe(true)
    })

    it('rejects string "false" (form submission)', () => {
      const result = createClientSchema.safeParse({
        ...validData,
        agentConfirmsSuitable: 'false',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('optional fields', () => {
    it('accepts middleName', () => {
      const result = createClientSchema.safeParse({
        ...validData,
        middleName: 'Michael',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.middleName).toBe('Michael')
      }
    })

    it('accepts dateOfBirth', () => {
      const result = createClientSchema.safeParse({
        ...validData,
        dateOfBirth: '1990-05-15',
      })
      expect(result.success).toBe(true)
    })

    it('accepts questionnaire JSON', () => {
      const result = createClientSchema.safeParse({
        ...validData,
        questionnaire: JSON.stringify({ hasCriminalRecord: 'no' }),
      })
      expect(result.success).toBe(true)
    })

    it('accepts notes', () => {
      const result = createClientSchema.safeParse({
        ...validData,
        notes: 'Some internal notes about the client',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('secondary address', () => {
    it('accepts hasSecondAddress as boolean', () => {
      const result = createClientSchema.safeParse({
        ...validData,
        hasSecondAddress: true,
        secondaryAddress: '456 Oak Ave',
        secondaryCity: 'Houston',
        secondaryState: 'TX',
        secondaryZip: '77001',
      })
      expect(result.success).toBe(true)
    })

    it('accepts hasSecondAddress as string "true"', () => {
      const result = createClientSchema.safeParse({
        ...validData,
        hasSecondAddress: 'true',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.hasSecondAddress).toBe(true)
      }
    })
  })
})

describe('saveDraftSchema', () => {
  it('accepts empty/partial data', () => {
    const result = saveDraftSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial form data', () => {
    const result = saveDraftSchema.safeParse({
      firstName: 'John',
      phone: '555-1234',
    })
    expect(result.success).toBe(true)
  })

  it('does not require agentConfirmsSuitable', () => {
    const result = saveDraftSchema.safeParse({
      firstName: 'John',
      lastName: 'Doe',
      agentConfirmsSuitable: false,
    })
    expect(result.success).toBe(true)
  })

  it('does not require address fields', () => {
    const result = saveDraftSchema.safeParse({
      firstName: 'John',
      lastName: 'Doe',
      phone: '555-1234',
    })
    expect(result.success).toBe(true)
  })
})
