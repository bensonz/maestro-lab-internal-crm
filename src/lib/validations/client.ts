import { z } from 'zod'

// Helper to handle null from FormData.get() - converts null to undefined
const optionalString = z.preprocess(
  (val) => (val === null ? undefined : val),
  z.string().optional()
)

export const createClientSchema = z.object({
  // Basic Info (from ID)
  firstName: z.string().min(1, 'First name is required'),
  middleName: optionalString,
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: optionalString,
  phone: z.string().min(1, 'Phone is required'),
  email: z.preprocess(
    (val) => (val === null ? '' : val),
    z.string().email('Invalid email').optional().or(z.literal(''))
  ),

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
  secondaryAddress: optionalString,
  secondaryCity: optionalString,
  secondaryState: optionalString,
  secondaryZip: optionalString,

  // Compliance questionnaire data stored as JSON
  questionnaire: optionalString,

  // Notes
  notes: optionalString,

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
  firstName: optionalString,
  middleName: optionalString,
  lastName: optionalString,
  dateOfBirth: optionalString,
  phone: optionalString,
  email: optionalString,
  primaryAddress: optionalString,
  primaryCity: optionalString,
  primaryState: optionalString,
  primaryZip: optionalString,
  hasSecondAddress: z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean().optional()
  ),
  secondaryAddress: optionalString,
  secondaryCity: optionalString,
  secondaryState: optionalString,
  secondaryZip: optionalString,
  questionnaire: optionalString,
  notes: optionalString,
  agentConfirmsSuitable: z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean().optional()
  ),
})

export type SaveDraftInput = z.infer<typeof saveDraftSchema>
