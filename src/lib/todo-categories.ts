/**
 * Shared todo issue categories — importable by both server and client components.
 * Kept separate from the 'use server' actions file so client components can use it.
 */
export const ISSUE_CATEGORIES = [
  'Re-Open Bank Account / Schedule with Client',
  'Contact Bank',
  'Contact PayPal',
  'Platforms Verification',
  'Collect Debit Card Information',
  'VIP Account — Reply Required',
  'Account Verification — Send to Client',
  'Confirm Fund Deposit',
  'Confirm Fund Withdrawal',
] as const

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number]
