import { z } from 'zod'

const optionalString = z.preprocess(
  (val) => (val === null ? undefined : val),
  z.string().optional(),
)

export const prequalSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  gmailAccount: z
    .string()
    .min(1, 'Gmail account is required')
    .email('Must be a valid email address'),
  gmailPassword: z.string().min(1, 'Gmail password is required'),
  agentConfirmsId: z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean().refine((val) => val === true, {
      message: 'You must confirm ID verification before submitting',
    }),
  ),
  middleName: optionalString,
  dateOfBirth: optionalString,
  idExpiry: optionalString,
  idDocument: optionalString,
  betmgmResult: optionalString,
  betmgmLoginScreenshot: optionalString,
  betmgmDepositScreenshot: optionalString,
})

export type PrequalInput = z.infer<typeof prequalSchema>

export const updateGmailSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  gmailAccount: z
    .string()
    .min(1, 'Gmail account is required')
    .email('Must be a valid email address'),
  gmailPassword: z.string().min(1, 'Gmail password is required'),
})

export type UpdateGmailInput = z.infer<typeof updateGmailSchema>
