import { z } from 'zod'

// Step 1: Pre-Qual — name required, rest optional for draft saving
export const clientStep1Schema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  idDocument: z.string().optional().or(z.literal('')),
  idNumber: z.string().max(50).optional().or(z.literal('')),
  idExpiry: z.string().optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  livesAtDifferentAddress: z.boolean().optional(),
  currentAddress: z.string().max(500).optional().or(z.literal('')),
  differentAddressDuration: z.string().max(50).optional().or(z.literal('')),
  differentAddressProof: z.string().max(500).optional().or(z.literal('')),
  assignedGmail: z.string().email('Invalid Gmail').optional().or(z.literal('')),
  gmailPassword: z.string().max(200).optional().or(z.literal('')),
  gmailScreenshot: z.string().optional().or(z.literal('')),
  betmgmCheckPassed: z.boolean().optional(),
  betmgmLogin: z.string().max(200).optional().or(z.literal('')),
  betmgmPassword: z.string().max(200).optional().or(z.literal('')),
  betmgmRegScreenshot: z.string().optional().or(z.literal('')),
  betmgmLoginScreenshot: z.string().optional().or(z.literal('')),
})

// Step 2: Background — all optional except hasCriminalRecord
export const clientStep2Schema = z.object({
  ssnDocument: z.string().optional().or(z.literal('')),
  ssnNumber: z.string().max(20).optional().or(z.literal('')),
  citizenship: z.string().max(100).optional().or(z.literal('')),
  missingIdType: z.string().max(100).optional().or(z.literal('')),
  secondAddress: z.string().max(500).optional().or(z.literal('')),
  secondAddressProof: z.string().optional().or(z.literal('')),
  hasCriminalRecord: z.boolean(),
  criminalRecordNotes: z.string().max(1000).optional().or(z.literal('')),
  bankingHistory: z.string().max(500).optional().or(z.literal('')),
  bankNegativeBalance: z.boolean().optional(),
  paypalHistory: z.string().max(500).optional().or(z.literal('')),
  paypalSsnLinked: z.boolean().optional(),
  paypalBrowserVerified: z.boolean().optional(),
  occupation: z.string().max(200).optional().or(z.literal('')),
  annualIncome: z.string().max(50).optional().or(z.literal('')),
  employmentStatus: z.string().max(50).optional().or(z.literal('')),
  maritalStatus: z.string().max(50).optional().or(z.literal('')),
  creditScoreRange: z.string().max(50).optional().or(z.literal('')),
  dependents: z.string().max(10).optional().or(z.literal('')),
  educationLevel: z.string().max(50).optional().or(z.literal('')),
  householdAwareness: z.string().max(50).optional().or(z.literal('')),
  familyTechSupport: z.string().max(50).optional().or(z.literal('')),
  financialAutonomy: z.string().max(50).optional().or(z.literal('')),
  digitalComfort: z.string().max(50).optional().or(z.literal('')),
  deviceReservationDate: z.string().max(20).optional().or(z.literal('')),
  sportsbookHistory: z.string().max(500).optional().or(z.literal('')),
  sportsbookUsedBefore: z.boolean().optional(),
  sportsbookUsedList: z.string().max(500).optional().or(z.literal('')),
  sportsbookStatuses: z.string().max(2000).optional().or(z.literal('')),
})

// Step 3: Platform data validation
const platformEntrySchema = z.object({
  platform: z.string(),
  username: z.string().optional().or(z.literal('')),
  accountId: z.string().optional().or(z.literal('')),
  screenshot: z.string().optional().or(z.literal('')),
  status: z.string().optional().or(z.literal('')),
})

export const clientStep3Schema = z.object({
  platformData: z.array(platformEntrySchema).optional(),
})

// Step 4: Contract — required for submission
export const clientStep4Schema = z.object({
  contractDocument: z.string().min(1, 'Contract document is required'),
})

// Full validation for final submission
export const clientDraftSubmitSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  contractDocument: z.string().min(1, 'Contract document is required'),
})

export type ClientStep1Input = z.infer<typeof clientStep1Schema>
export type ClientStep2Input = z.infer<typeof clientStep2Schema>
export type ClientStep3Input = z.infer<typeof clientStep3Schema>
export type ClientStep4Input = z.infer<typeof clientStep4Schema>
