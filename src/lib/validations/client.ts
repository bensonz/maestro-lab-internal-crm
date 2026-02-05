import { z } from 'zod'

export const createClientSchema = z.object({
  // Basic Info (from ID)
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().optional(),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),

  // Primary Address
  primaryAddress: z.string().min(1, 'Primary address is required'),
  primaryCity: z.string().min(1, 'City is required'),
  primaryState: z.string().min(1, 'State is required'),
  primaryZip: z.string().min(1, 'ZIP is required'),

  // Secondary Address (optional)
  hasSecondAddress: z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean().optional()
  ),
  secondaryAddress: z.string().optional(),
  secondaryCity: z.string().optional(),
  secondaryState: z.string().optional(),
  secondaryZip: z.string().optional(),

  // Compliance questionnaire data stored as JSON
  questionnaire: z.string().optional(),

  // Notes
  notes: z.string().optional(),

  // Agent confirmation - required to submit
  agentConfirmsSuitable: z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean().refine((val) => val === true, {
      message: 'You must confirm client suitability before submitting',
    })
  ),
})

export type CreateClientInput = z.infer<typeof createClientSchema>

// Draft schema - less strict, allows partial data
export const saveDraftSchema = z.object({
  firstName: z.string().optional(),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  primaryAddress: z.string().optional(),
  primaryCity: z.string().optional(),
  primaryState: z.string().optional(),
  primaryZip: z.string().optional(),
  hasSecondAddress: z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean().optional()
  ),
  secondaryAddress: z.string().optional(),
  secondaryCity: z.string().optional(),
  secondaryState: z.string().optional(),
  secondaryZip: z.string().optional(),
  questionnaire: z.string().optional(),
  notes: z.string().optional(),
  agentConfirmsSuitable: z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean().optional()
  ),
})

export type SaveDraftInput = z.infer<typeof saveDraftSchema>
