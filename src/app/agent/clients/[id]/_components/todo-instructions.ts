import { PlatformType } from '@/types'

export interface ToDoInstruction {
  mustDo: string[]
  mustNotDo: string[]
  screenshotGuidance: {
    page: string
    section: string
    success: string
  }
  successCriteria: string
}

// Instructions by platform type
export const platformInstructions: Record<string, ToDoInstruction> = {
  // PayPal Setup (Step 3)
  [PlatformType.PAYPAL]: {
    mustDo: [
      'Create PayPal account using company email',
      'Upload TWO screenshots: login credentials + homepage with balance',
      'Bulk upload supported - AI will detect which is which',
    ],
    mustNotDo: ['Use personal email for PayPal', 'Upload only one screenshot'],
    screenshotGuidance: {
      page: 'PayPal Login + Dashboard',
      section: 'Login screen AND Account Overview',
      success:
        'Two screenshots: 1) Email/password visible, 2) Homepage showing balance',
    },
    successCriteria:
      'Both screenshots verified: login credentials + homepage with balance',
  },

  // Edgeboost Registration (Step 3)
  [PlatformType.EDGEBOOST]: {
    mustDo: [
      'Upload TWO screenshots: login credentials + address submission',
      'Bulk upload supported - AI will auto-detect content',
      "Ensure address matches client's primary address",
    ],
    mustNotDo: [
      'Use expired documents',
      'Submit blurry or unreadable screenshots',
    ],
    screenshotGuidance: {
      page: 'Edgeboost Login + Address',
      section: 'Login Screen AND Address Verification Page',
      success: 'Two screenshots showing credentials and address form submitted',
    },
    successCriteria:
      'Both screenshots uploaded: login credentials + address submission page',
  },

  // Bank Account Created (Step 2)
  [PlatformType.BANK]: {
    mustDo: [
      'Verify bank account opened at selected bank',
      'Upload online banking login screenshot',
      'Confirm PIN matches suggested PIN',
    ],
    mustNotDo: ['Use different bank than selected', 'Share PIN with client'],
    screenshotGuidance: {
      page: 'Online Banking Login',
      section: 'Account dashboard showing username',
      success: 'Screenshot showing successful login with username visible',
    },
    successCriteria:
      'Screenshot showing successful login with username visible',
  },

  // Sports betting platforms - generic instructions
  [PlatformType.DRAFTKINGS]: {
    mustDo: [
      'Create account using company email',
      'Upload registration confirmation screenshot',
      'Verify account is fully activated',
    ],
    mustNotDo: ['Use personal email', 'Place any bets before verification'],
    screenshotGuidance: {
      page: 'DraftKings Account',
      section: 'Account dashboard or profile page',
      success: 'Screenshot showing account username and verified status',
    },
    successCriteria: 'Account created and verified with company email',
  },

  [PlatformType.FANDUEL]: {
    mustDo: [
      'Create account using company email',
      'Upload registration confirmation screenshot',
      'Verify identity if prompted',
    ],
    mustNotDo: ['Use personal email', 'Skip identity verification steps'],
    screenshotGuidance: {
      page: 'FanDuel Account',
      section: 'Account settings or profile',
      success: 'Screenshot showing account is active and verified',
    },
    successCriteria: 'Account created and verified with company email',
  },

  [PlatformType.BETMGM]: {
    mustDo: [
      'Create account using company email',
      'Complete all verification steps',
      'Upload account dashboard screenshot',
    ],
    mustNotDo: ['Use personal email', 'Submit incomplete registration'],
    screenshotGuidance: {
      page: 'BetMGM Account',
      section: 'Account dashboard',
      success: 'Screenshot showing verified account status',
    },
    successCriteria: 'Account created, verified, and ready for use',
  },

  [PlatformType.CAESARS]: {
    mustDo: [
      'Create account using company email',
      'Complete identity verification',
      'Upload confirmation screenshot',
    ],
    mustNotDo: ['Use personal email', 'Skip any verification steps'],
    screenshotGuidance: {
      page: 'Caesars Sportsbook',
      section: 'Account profile',
      success: 'Screenshot showing active account',
    },
    successCriteria: 'Account fully verified and active',
  },

  [PlatformType.BALLYBET]: {
    mustDo: [
      'Create account using company email',
      'Verify account as required',
      'Upload account screenshot',
    ],
    mustNotDo: [
      'Use personal information',
      'Deposit funds before verification',
    ],
    screenshotGuidance: {
      page: 'Bally Bet Account',
      section: 'Account dashboard',
      success: 'Screenshot showing verified account',
    },
    successCriteria: 'Account created and verified',
  },

  [PlatformType.BETRIVERS]: {
    mustDo: [
      'Create account using company email',
      'Complete verification process',
      'Upload confirmation screenshot',
    ],
    mustNotDo: ['Use personal email', 'Skip document verification'],
    screenshotGuidance: {
      page: 'BetRivers Account',
      section: 'Profile or settings page',
      success: 'Screenshot showing account is active',
    },
    successCriteria: 'Account verified and ready',
  },

  [PlatformType.FANATICS]: {
    mustDo: [
      'Create account using company email',
      'Complete all registration steps',
      'Upload account confirmation',
    ],
    mustNotDo: ['Use personal email', 'Submit incomplete information'],
    screenshotGuidance: {
      page: 'Fanatics Sportsbook',
      section: 'Account page',
      success: 'Screenshot showing active account',
    },
    successCriteria: 'Account created and active',
  },

  [PlatformType.BET365]: {
    mustDo: [
      'Create account using company email',
      'Complete identity verification',
      'Upload verification screenshot',
    ],
    mustNotDo: ['Use personal account', 'Skip verification steps'],
    screenshotGuidance: {
      page: 'Bet365 Account',
      section: 'Account dashboard',
      success: 'Screenshot showing verified account',
    },
    successCriteria: 'Account verified and active',
  },
}

// Default instructions for unknown platform types
export const defaultInstructions: ToDoInstruction = {
  mustDo: [
    'Complete all required registration steps',
    'Use company-provided email and information',
    'Upload confirmation screenshot',
  ],
  mustNotDo: ['Use personal information', 'Skip any verification steps'],
  screenshotGuidance: {
    page: 'Platform Account',
    section: 'Account dashboard or confirmation page',
    success: 'Screenshot showing account is created and active',
  },
  successCriteria: 'Account successfully created and verified',
}

export function getInstructionsForPlatform(
  platformType: string | null,
): ToDoInstruction {
  if (!platformType) return defaultInstructions
  return platformInstructions[platformType] || defaultInstructions
}
