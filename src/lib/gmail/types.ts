/** Raw parsed email from Gmail API */
export interface ParsedEmail {
  messageId: string
  threadId: string | null
  from: string
  to: string
  subject: string
  snippet: string
  body: string
  receivedAt: Date
}

/** Detection type from email analysis */
export type DetectionType =
  | 'VIP_REPLY'
  | 'ACCOUNT_VERIFICATION'
  | 'DEPOSIT_MATCH_BONUS'
  | 'FUND_DEPOSIT'
  | 'FUND_WITHDRAWAL'
  | 'PAYPAL_TRANSFER'
  | 'UNKNOWN'

/** Result from a detector */
export interface EmailDetection {
  type: DetectionType
  confidence: number
  data: Record<string, unknown>
}

/** Interface that all detectors implement */
export interface EmailDetector {
  name: string
  detect(email: ParsedEmail): EmailDetection | null
}

/** Result of processing a single email */
export interface ProcessingResult {
  messageId: string
  detection: EmailDetection
  todoCreated: boolean
  todoId?: string
  fundMatched: boolean
  fundAllocationId?: string
}

/** Summary of a sync operation */
export interface SyncSummary {
  emailsFetched: number
  emailsProcessed: number
  todosCreated: number
  fundsMatched: number
  errors: string[]
}
