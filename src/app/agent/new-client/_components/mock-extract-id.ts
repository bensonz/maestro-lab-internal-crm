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

export interface BankAccountExtractionResult {
  routingNumber: string
  accountNumber: string
  confidence: number
}

/**
 * Mock OCR extraction from a bank account/routing number screenshot.
 * Detects routing and account numbers from the uploaded screenshot.
 * Replace with real OCR/AI service in production.
 */
export async function mockExtractFromBankAccount(_file: File): Promise<BankAccountExtractionResult> {
  await new Promise((resolve) => setTimeout(resolve, 800))

  return {
    routingNumber: '021000021',
    accountNumber: '123456789012',
    confidence: 0.88,
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

export interface PlatformExtractionResult {
  detectedUsername: string
  detectedPassword: string
  confidence: number
}

/**
 * Mock OCR extraction from a platform registration/login screenshot.
 * Detects the username and password shown in the screenshot.
 * In production: replace with real OCR/AI service that reads the actual image.
 * Returns the suggested values (no mismatch) in this mock.
 */
export async function mockExtractFromPlatform(
  _file: File,
  suggestedUsername: string,
  suggestedPassword: string,
): Promise<PlatformExtractionResult> {
  await new Promise((resolve) => setTimeout(resolve, 600))
  return {
    detectedUsername: suggestedUsername,
    detectedPassword: suggestedPassword,
    confidence: 0.85,
  }
}

import type { PlatformType } from '@/types'

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

// ─── Platform Detection (Bulk Upload OCR) ─────────────────

export interface PlatformDetectionResult {
  platform: PlatformType
  confidence: number
}

/**
 * Mock OCR detection: which platform does a screenshot belong to?
 * In production, this would use image recognition / text extraction
 * to identify platform logos, URLs, or names in the screenshot.
 *
 * Mock strategy: uses filename patterns for deterministic testing,
 * falls back to random platform assignment.
 */
const PLATFORM_FILENAME_PATTERNS: Record<string, PlatformType> = {
  draftkings: 'DRAFTKINGS',
  dk: 'DRAFTKINGS',
  fanduel: 'FANDUEL',
  fd: 'FANDUEL',
  betmgm: 'BETMGM',
  mgm: 'BETMGM',
  caesars: 'CAESARS',
  czr: 'CAESARS',
  fanatics: 'FANATICS',
  ballybet: 'BALLYBET',
  bally: 'BALLYBET',
  betrivers: 'BETRIVERS',
  bet365: 'BET365',
  paypal: 'PAYPAL',
  bank: 'BANK',
  chase: 'BANK',
  citi: 'BANK',
  bofa: 'BANK',
  edgeboost: 'EDGEBOOST',
}

const SPORTS_PLATFORMS: PlatformType[] = [
  'DRAFTKINGS', 'FANDUEL', 'BETMGM', 'CAESARS',
  'FANATICS', 'BALLYBET', 'BETRIVERS', 'BET365',
]

export async function mockDetectPlatformFromScreenshot(
  file: File,
): Promise<PlatformDetectionResult> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  const name = file.name.toLowerCase().replace(/[^a-z0-9]/g, '')

  // Check filename patterns for deterministic testing
  for (const [pattern, platform] of Object.entries(PLATFORM_FILENAME_PATTERNS)) {
    if (name.includes(pattern)) {
      return { platform, confidence: 0.92 }
    }
  }

  // Fallback: cycle through sports platforms based on filename hash
  let hash = 0
  for (let i = 0; i < file.name.length; i++) {
    hash = ((hash << 5) - hash + file.name.charCodeAt(i)) | 0
  }
  const idx = Math.abs(hash) % SPORTS_PLATFORMS.length
  return { platform: SPORTS_PLATFORMS[idx], confidence: 0.55 }
}

// ─── Address Detection from Screenshot OCR ─────────────────

export interface AddressDetectionResult {
  detectedAddress: string | null
  confidence: number
}

/**
 * Mock address detection from platform screenshots.
 * In production, this would use OCR to read address fields
 * visible on platform registration/profile pages.
 *
 * Mock strategy: returns deterministic addresses per platform
 * to simulate the progressive address discovery pattern.
 * - Most platforms share the ID address (123 Main Street)
 * - PayPal returns a different address (second address detected)
 * - BET365 returns a third address (edge case)
 */
const MOCK_PLATFORM_ADDRESSES: Partial<Record<PlatformType, string>> = {
  // Most platforms match the ID address
  DRAFTKINGS: '123 Main Street, Los Angeles, CA 90001',
  FANDUEL: '123 Main Street, Los Angeles, CA 90001',
  BETMGM: '123 Main Street, Los Angeles, CA 90001',
  CAESARS: '123 Main St., Los Angeles, CA 90001', // abbreviation variant — should match
  FANATICS: '123 Main Street, Los Angeles, CA 90001',
  BALLYBET: '123 Main Street, Los Angeles, CA 90001',
  BETRIVERS: '123 Main Street, Los Angeles, CA 90001',
  // PayPal has a different address (second address)
  PAYPAL: '456 Oak Avenue, Apt 2B, Brooklyn, NY 11201',
  // BET365 has a third address (edge case)
  BET365: '789 Elm Drive, Unit 5, Chicago, IL 60601',
  // Bank/EdgeBoost share the ID address
  BANK: '123 Main Street, Los Angeles, CA 90001',
  EDGEBOOST: '123 Main Street, Los Angeles, CA 90001',
}

export async function mockExtractAddressFromScreenshot(
  _file: File,
  platform: PlatformType,
): Promise<AddressDetectionResult> {
  await new Promise((resolve) => setTimeout(resolve, 400))

  const address = MOCK_PLATFORM_ADDRESSES[platform] ?? null

  return {
    detectedAddress: address,
    confidence: address ? 0.82 : 0,
  }
}
