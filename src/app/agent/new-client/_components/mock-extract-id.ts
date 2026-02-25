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
export interface SsnExtractionResult {
  ssnNumber: string
  confidence: number
}

/**
 * Mock OCR extraction from an SSN document image.
 * Simulates a 1.2s processing delay and returns a fake SSN number.
 * Replace with real OCR service in production.
 */
export async function mockExtractFromSsn(_file: File): Promise<SsnExtractionResult> {
  await new Promise((resolve) => setTimeout(resolve, 1200))

  return {
    ssnNumber: '123-45-6789',
    confidence: 0.93,
  }
}

export interface AddressProofExtractionResult {
  address: string
  confidence: number
}

/**
 * Mock OCR extraction from an address proof document (bank statement, utility bill, etc.).
 * Simulates a 1s processing delay and returns a fake address.
 * Replace with real OCR service in production.
 */
export async function mockExtractFromAddressProof(_file: File): Promise<AddressProofExtractionResult> {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  return {
    address: '456 Oak Avenue, Apt 2B, Brooklyn, NY 11201',
    confidence: 0.88,
  }
}

export interface BankExtractionResult {
  bankName: 'chase' | 'citi' | 'bofa'
  username: string
  password: string
  confidence: number
}

/**
 * Mock OCR extraction from a bank screenshot.
 * Detects bank name, username, password, and PIN from the uploaded screenshot.
 * Replace with real OCR/AI service in production.
 */
export async function mockExtractFromBank(_file: File): Promise<BankExtractionResult> {
  await new Promise((resolve) => setTimeout(resolve, 800))

  return {
    bankName: 'chase',
    username: 'john.smith2026',
    password: 'Ch@se_2026!',
    confidence: 0.91,
  }
}

export interface PayPalExtractionResult {
  balanceWordDetected: boolean
  confidence: number
}

/**
 * Mock OCR extraction from a PayPal balance page screenshot.
 * Detects the word "balance" to confirm the account home page is visible.
 * Replace with real OCR/AI service in production.
 */
export async function mockExtractFromPaypal(_file: File): Promise<PayPalExtractionResult> {
  await new Promise((resolve) => setTimeout(resolve, 800))

  return {
    balanceWordDetected: true,
    confidence: 0.89,
  }
}

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
