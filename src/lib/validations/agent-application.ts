import { z } from 'zod'

export const agentApplicationSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name is too long'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name is too long'),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .max(20, 'Phone number is too long'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  citizenship: z.string().min(1, 'Legal status is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  idExpiry: z.string().optional(),
  zelle: z.string().optional(),
  referredByName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export type AgentApplicationInput = z.infer<typeof agentApplicationSchema>

// Step 1: Account — email, phone, password
export const step1Schema = z.object({
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

// Step 2: Identity — ID upload, name, gender, DOB, legal status, ID expiry
export const step2Schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  citizenship: z.string().min(1, 'Legal status is required'),
  idExpiry: z.string().optional(),
})

// Step 3: Details — address proof, address, city/state/zip, zelle, referred by
export const step3Schema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  zelle: z.string().optional(),
  referredByName: z.string().optional(),
})
