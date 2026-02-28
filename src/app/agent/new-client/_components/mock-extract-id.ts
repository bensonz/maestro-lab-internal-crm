export interface IdExtractionResult {
  firstName: string
  lastName: string
  dateOfBirth: string
  address: string
  idExpiry: string
  confidence: number
}

/**
 * Mock OCR extraction from an ID document image.
 * Simulates a 1.5s processing delay and returns fake extracted data.
 * Replace with real OCR service (e.g., AWS Textract, Google Vision) in production.
 */
export async function mockExtractFromId(_file: File): Promise<IdExtractionResult> {
  await new Promise((resolve) => setTimeout(resolve, 1500))

  return {
    firstName: 'John',
    lastName: 'Smith',
    dateOfBirth: '1990-05-15',
    address: '123 Main Street, Los Angeles, CA 90001',
    idExpiry: '2027-08-20',
    confidence: 0.87,
  }
}

export interface GmailExtractionResult {
  emailAddress: string
  password: string
  confidence: number
}

/**
 * Mock OCR extraction from a Gmail registration screenshot.
 * Detects the Gmail address and password shown in the screenshot.
 * Replace with real OCR/AI service in production.
 */
export async function mockExtractFromGmail(_file: File): Promise<GmailExtractionResult> {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  return {
    emailAddress: 'john.smith.2026@gmail.com',
    password: 'Gmail_2026!',
    confidence: 0.91,
  }
}

export interface BetmgmExtractionResult {
  loginEmail: string
  loginPassword: string
  depositWordDetected: boolean
  confidence: number
}

/**
 * Mock OCR extraction from a BetMGM screenshot.
 * For registration screenshots: detects the word "deposit" to confirm successful registration.
 * For login screenshots: detects login credentials and deposit options.
 * Replace with real OCR/AI service in production.
 */
export async function mockExtractFromBetmgm(
  _file: File,
  type: 'registration' | 'login',
): Promise<BetmgmExtractionResult> {
  await new Promise((resolve) => setTimeout(resolve, 1200))

  if (type === 'login') {
    return {
      loginEmail: 'john.smith@gmail.com',
      loginPassword: 'B3tMGM_2026!',
      depositWordDetected: true,
      confidence: 0.82,
    }
  }

  // Registration screenshot — detects "deposit" word to confirm successful registration
  return {
    loginEmail: 'john.smith@gmail.com',
    loginPassword: '',
    depositWordDetected: true,
    confidence: 0.85,
  }
}
