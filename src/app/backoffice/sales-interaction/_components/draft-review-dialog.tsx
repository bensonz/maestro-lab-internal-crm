'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  CheckCircle2,
  Minus,
  KeyRound,
  MapPin,
  Save,
  AlertTriangle,
  Shield,
  Trophy,
  XCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ALL_PLATFORMS, PLATFORM_INFO } from '@/lib/platforms'
import { getFullDraft, saveClientDraft } from '@/app/actions/client-drafts'
import { approveClient } from '@/app/actions/clients'
import { calculateRiskScore } from '@/lib/risk-score'
import { toast } from 'sonner'
import { EditableText, EditableDate, EditableCheckbox } from './draft-editable-fields'

/* ═══════════════════════════════════════════════════════════
   Full Draft Data Interface
   ═══════════════════════════════════════════════════════════ */

interface FullDraftData {
  id: string
  status: string
  step: number
  // Step 1: Pre-Qual
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  idDocument: string | null
  idNumber: string | null
  idExpiry: string | null
  dateOfBirth: string | null
  address: string | null
  assignedGmail: string | null
  gmailPassword: string | null
  gmailScreenshot: string | null
  betmgmCheckPassed: boolean | null
  betmgmLogin: string | null
  betmgmPassword: string | null
  betmgmRegScreenshot: string | null
  betmgmLoginScreenshot: string | null
  livesAtDifferentAddress: boolean | null
  currentAddress: string | null
  differentAddressDuration: string | null
  differentAddressProof: string | null
  // Step 2: Background
  ssnDocument: string | null
  ssnNumber: string | null
  citizenship: string | null
  missingIdType: string | null
  secondAddress: string | null
  secondAddressProof: string | null
  hasCriminalRecord: boolean | null
  criminalRecordNotes: string | null
  bankingHistory: string | null
  bankNegativeBalance: boolean | null
  paypalHistory: string | null
  paypalSsnLinked: boolean | null
  paypalBrowserVerified: boolean | null
  sportsbookHistory: string | null
  sportsbookUsedBefore: boolean | null
  sportsbookUsedList: string | null
  sportsbookStatuses: string | null
  occupation: string | null
  annualIncome: string | null
  employmentStatus: string | null
  maritalStatus: string | null
  creditScoreRange: string | null
  dependents: string | null
  educationLevel: string | null
  householdAwareness: string | null
  familyTechSupport: string | null
  financialAutonomy: string | null
  digitalComfort: string | null
  // Step 3: Platforms
  platformData: Record<string, { username?: string; accountId?: string; screenshot?: string; screenshots?: string[]; pin?: string; bank?: string; bankPhoneEmailConfirmed?: boolean; cardNumber?: string; cvv?: string; cardExpiry?: string; cardImages?: string[] }> | null
  generatedCredentials: Record<string, unknown> | null
  discoveredAddresses: Array<{ address: string; source: string; confirmedByAgent?: boolean }> | null
  // Step 4: Contract
  contractDocument: string | null
  agentConfidenceLevel: string | null
  clientHidingInfo: boolean | null
  clientHidingInfoNotes: string | null
  // Risk flags
  paypalPreviouslyUsed: boolean
  addressMismatch: boolean
  debankedHistory: boolean
  debankedBank: string | null
  undisclosedInfo: boolean
  // Backoffice review tracking
  backofficeReviewedStep: number
  // Meta
  closerId: string
  resultClientId: string | null
  createdAt: string
  updatedAt: string
}

/* ═══════════════════════════════════════════════════════════
   Label Maps
   ═══════════════════════════════════════════════════════════ */

const CITIZENSHIP_LABELS: Record<string, string> = {
  us_citizen: 'U.S. Citizen', permanent_resident: 'Permanent Resident',
  visa_holder: 'Visa Holder', other: 'Other',
}
const EMPLOYMENT_LABELS: Record<string, string> = {
  employed: 'Employed', self_employed: 'Self-Employed',
  unemployed: 'Unemployed', student: 'Student', retired: 'Retired',
}
const MARITAL_LABELS: Record<string, string> = {
  single: 'Single', married: 'Married', divorced: 'Divorced', widowed: 'Widowed',
}
const INCOME_LABELS: Record<string, string> = {
  under_25k: 'Under $25K', '25k_50k': '$25K-$50K', '50k_75k': '$50K-$75K',
  '75k_100k': '$75K-$100K', '100k_150k': '$100K-$150K', over_150k: 'Over $150K',
}
const CREDIT_LABELS: Record<string, string> = {
  excellent: 'Excellent', good: 'Good', fair: 'Fair', poor: 'Poor', unknown: 'Unknown',
}
const EDUCATION_LABELS: Record<string, string> = {
  high_school: 'High School', associates: "Associate's",
  bachelors: "Bachelor's", masters: "Master's", doctorate: 'Doctorate',
}
const HOUSEHOLD_LABELS: Record<string, string> = {
  supportive: 'Supportive', aware_neutral: 'Neutral',
  not_aware: 'Not Aware', not_applicable: 'N/A',
}
const FAMILY_SUPPORT_LABELS: Record<string, string> = {
  willing_to_help: 'Willing', available_uninvolved: 'Uninvolved',
  no: 'No', prefer_not_to_involve: "Won't Involve",
}
const AUTONOMY_LABELS: Record<string, string> = {
  fully_independent: 'Independent', shared_with_spouse: 'Shared',
  dependent_on_others: 'Dependent',
}
const DIGITAL_COMFORT_LABELS: Record<string, string> = {
  very_comfortable: 'Comfortable', needs_some_guidance: 'Needs Guidance',
  needs_significant_help: 'Needs Help',
}
const SPORTSBOOK_LABELS: Record<string, string> = {
  draftkings: 'DraftKings', fanduel: 'FanDuel', betmgm: 'BetMGM',
  caesars: 'Caesars', fanatics: 'Fanatics', ballybet: 'Bally Bet',
  betrivers: 'BetRivers', bet365: 'Bet365',
}
const BANK_LABELS: Record<string, string> = {
  chase: 'Chase', citi: 'Citi', bofa: 'Bank of America', wells_fargo: 'Wells Fargo',
  td_bank: 'TD Bank', capital_one: 'Capital One', us_bank: 'U.S. Bank', pnc: 'PNC',
}
const MISSING_ID_LABELS: Record<string, string> = {
  ssn: 'SSN', passport: 'Passport', state_id: 'State ID', drivers_license: "Driver's License",
}
const CONFIDENCE_LABELS: Record<string, string> = {
  high: 'High', medium: 'Medium', low: 'Low',
}
const DURATION_LABELS: Record<string, string> = {
  less_than_6mo: 'Less than 6 months', more_than_6mo: 'More than 6 months',
}
const ADDRESS_PROOF_LABELS: Record<string, string> = {
  bank_statement: 'Bank Statement', utility_bill: 'Utility Bill',
  lease_agreement: 'Lease Agreement', other: 'Other', none: 'None',
}

const CREDENTIAL_DISPLAY_NAMES: Record<string, string> = {
  GMAIL: 'Gmail', BETMGM: 'BetMGM', PAYPAL: 'PayPal', BANK: 'Online Banking',
  EDGEBOOST: 'EdgeBoost', DRAFTKINGS: 'DraftKings', FANDUEL: 'FanDuel',
  CAESARS: 'Caesars', FANATICS: 'Fanatics', BALLYBET: 'Bally Bet',
  BETRIVERS: 'BetRivers', BET365: 'Bet365',
}

/* ═══════════════════════════════════════════════════════════
   Helper Components
   ═══════════════════════════════════════════════════════════ */

const STEP_DEFS = [
  { number: 1, label: 'Pre-Qual' },
  { number: 2, label: 'Background' },
  { number: 3, label: 'Platforms' },
  { number: 4, label: 'Contract' },
] as const

function computeAge(dateOfBirth: string | null): string {
  if (!dateOfBirth) return ''
  const dob = new Date(dateOfBirth)
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const m = now.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--
  return `(${age}y)`
}

function ImageThumb({ src, alt }: { src: string | null; alt: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className="max-h-44 w-full rounded border border-border object-contain"
      />
    )
  }
  return (
    <div className="flex h-28 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground">
      Not uploaded
    </div>
  )
}

function InfoBadge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'warning' | 'destructive' | 'success' }) {
  const styles = {
    default: 'border-border bg-muted/50 text-muted-foreground',
    warning: 'border-warning/30 bg-warning/10 text-warning',
    destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
    success: 'border-success/30 bg-success/10 text-success',
  }
  return <span className={cn('inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium', styles[variant])}>{children}</span>
}

function InfoRow({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <p className={cn('mt-0.5 text-xs font-medium', mono && 'font-mono', !value && 'text-muted-foreground')}>
        {value || '\u2014'}
      </p>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{children}</p>
}

/** Color a risk assessment answer */
function assessmentVariant(value: string | null, goodValues: string[]): 'success' | 'warning' | 'destructive' | 'default' {
  if (!value) return 'default'
  if (goodValues.includes(value)) return 'success'
  // Known bad values
  const badValues = ['not_aware', 'no', 'dependent_on_others', 'needs_significant_help']
  if (badValues.includes(value)) return 'destructive'
  return 'warning'
}

/* ═══════════════════════════════════════════════════════════
   State Management
   ═══════════════════════════════════════════════════════════ */

type DialogState = {
  draft: FullDraftData | null
  loading: boolean
  error: string | null
  step: 1 | 2 | 3 | 4
  loadedDraftId: string | null
  approving: boolean
  editedFields: Record<string, unknown>
  editedPlatformData: Record<string, Record<string, unknown>> | null
  isSaving: boolean
  hasChanges: boolean
}

type DialogAction =
  | { type: 'FETCH_START'; draftId: string }
  | { type: 'FETCH_SUCCESS'; draft: FullDraftData }
  | { type: 'FETCH_ERROR'; error: string }
  | { type: 'SET_STEP'; step: 1 | 2 | 3 | 4 }
  | { type: 'APPROVE_START' }
  | { type: 'APPROVE_DONE' }
  | { type: 'SET_FIELD'; field: string; value: unknown }
  | { type: 'SET_PLATFORM_FIELD'; platform: string; field: string; value: unknown }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS'; draft: FullDraftData }
  | { type: 'SAVE_ERROR' }
  | { type: 'RESET' }

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...INITIAL_STATE, loading: true, loadedDraftId: action.draftId }
    case 'FETCH_SUCCESS':
      return { ...state, draft: action.draft, loading: false }
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.error }
    case 'SET_STEP':
      return { ...state, step: action.step }
    case 'APPROVE_START':
      return { ...state, approving: true }
    case 'APPROVE_DONE':
      return { ...state, approving: false }
    case 'SET_FIELD':
      return {
        ...state,
        editedFields: { ...state.editedFields, [action.field]: action.value },
        hasChanges: true,
      }
    case 'SET_PLATFORM_FIELD': {
      const current = state.editedPlatformData || {}
      const platformEntry = current[action.platform] || {}
      return {
        ...state,
        editedPlatformData: {
          ...current,
          [action.platform]: { ...platformEntry, [action.field]: action.value },
        },
        hasChanges: true,
      }
    }
    case 'SAVE_START':
      return { ...state, isSaving: true }
    case 'SAVE_SUCCESS':
      return { ...state, isSaving: false, hasChanges: false, editedFields: {}, editedPlatformData: null, draft: action.draft }
    case 'SAVE_ERROR':
      return { ...state, isSaving: false }
    case 'RESET':
      return INITIAL_STATE
  }
}

const INITIAL_STATE: DialogState = {
  draft: null,
  loading: false,
  error: null,
  step: 1,
  loadedDraftId: null,
  approving: false,
  editedFields: {},
  editedPlatformData: null,
  isSaving: false,
  hasChanges: false,
}

/** Get the effective value for a field: edited value if changed, otherwise draft value */
function getField<T>(draft: FullDraftData, editedFields: Record<string, unknown>, field: keyof FullDraftData): T {
  if (field in editedFields) return editedFields[field] as T
  return draft[field] as T
}

/* ═══════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════ */

interface DraftReviewDialogProps {
  draftId: string | null
  draftName: string
  resultClientId?: string | null
  initialStep?: 1 | 2 | 3 | 4
  /** When true, auto-scroll to debit cards section on Step 3 load */
  scrollToDebitCards?: boolean
  onClose: () => void
}

export function DraftReviewDialog({ draftId, draftName, resultClientId, initialStep, scrollToDebitCards, onClose }: DraftReviewDialogProps) {
  const router = useRouter()
  const [state, dispatch] = useReducer(dialogReducer, INITIAL_STATE)
  const { draft, loading, error, step, loadedDraftId, approving, editedFields, editedPlatformData, isSaving, hasChanges } = state
  const fetchingRef = useRef<string | null>(null)
  const contentScrollRef = useRef<HTMLDivElement>(null)

  const handleApprove = async () => {
    if (!resultClientId) return
    dispatch({ type: 'APPROVE_START' })
    try {
      const result = await approveClient(resultClientId)
      dispatch({ type: 'APPROVE_DONE' })
      if (result.success) {
        toast.success(`${draftName} approved! $400 bonus pool created (${result.distributedSlices} slices distributed, ${result.recycledSlices} recycled). Agent notified.`)
        onClose()
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to approve')
      }
    } catch {
      dispatch({ type: 'APPROVE_DONE' })
      toast.error('Failed to approve client — please try again')
    }
  }

  const handleSave = useCallback(async () => {
    if (!draft || !hasChanges) return
    dispatch({ type: 'SAVE_START' })

    const payload: Record<string, unknown> = { ...editedFields }

    if (editedPlatformData) {
      const mergedPlatformData = { ...(draft.platformData || {}) }
      for (const [platform, fields] of Object.entries(editedPlatformData)) {
        mergedPlatformData[platform] = {
          ...(mergedPlatformData[platform] || {}),
          ...fields,
        }
      }
      payload.platformData = mergedPlatformData
    }

    const result = await saveClientDraft(draft.id, payload)
    if (result.success) {
      const freshResult = await getFullDraft(draft.id)
      if (freshResult.success) {
        dispatch({ type: 'SAVE_SUCCESS', draft: freshResult.draft as unknown as FullDraftData })
      } else {
        dispatch({ type: 'SAVE_SUCCESS', draft: { ...draft, ...editedFields } as FullDraftData })
      }
      toast.success('Changes saved')
      router.refresh()
    } else {
      dispatch({ type: 'SAVE_ERROR' })
      toast.error(result.error || 'Failed to save changes')
    }
  }, [draft, hasChanges, editedFields, editedPlatformData, router])

  // Advance to next step and persist the reviewed-step marker
  const handleNextStep = useCallback(async () => {
    if (!draft) return
    const nextStep = Math.min(step + 1, 4) as 1 | 2 | 3 | 4
    const newReviewed = Math.max(step, draft.backofficeReviewedStep ?? 0)
    dispatch({ type: 'SET_STEP', step: nextStep })
    // Persist reviewed progress (fire-and-forget)
    if (newReviewed > (draft.backofficeReviewedStep ?? 0)) {
      saveClientDraft(draft.id, { backofficeReviewedStep: newReviewed }).then(() => {
        // Update local draft so badge refreshes
        dispatch({ type: 'FETCH_SUCCESS', draft: { ...draft, backofficeReviewedStep: newReviewed } })
      })
    }
  }, [draft, step])

  const setField = useCallback((field: string, value: unknown) => {
    dispatch({ type: 'SET_FIELD', field, value })
  }, [])

  const setPlatformField = useCallback((platform: string, field: string, value: unknown) => {
    dispatch({ type: 'SET_PLATFORM_FIELD', platform, field, value })
  }, [])

  // Fetch draft data when draftId changes
  useEffect(() => {
    if (!draftId) {
      dispatch({ type: 'RESET' })
      fetchingRef.current = null
      return
    }
    if (draftId === loadedDraftId || draftId === fetchingRef.current) return
    fetchingRef.current = draftId
    dispatch({ type: 'FETCH_START', draftId })
    getFullDraft(draftId).then((result) => {
      if (result.success) {
        const d = result.draft as unknown as FullDraftData
        dispatch({ type: 'FETCH_SUCCESS', draft: d })
        const maxStep = d.step
        if (initialStep && initialStep !== 1 && initialStep <= maxStep) {
          // Explicit initialStep from Approve (4) or Upload Card (3)
          dispatch({ type: 'SET_STEP', step: initialStep })
        } else if (!initialStep || initialStep === 1) {
          // Auto-resume: open at next unreviewed step
          const reviewed = d.backofficeReviewedStep ?? 0
          const resumeStep = Math.min(reviewed + 1, maxStep) as 1 | 2 | 3 | 4
          if (resumeStep > 1) {
            dispatch({ type: 'SET_STEP', step: resumeStep })
          }
        }
      } else {
        dispatch({ type: 'FETCH_ERROR', error: result.error ?? 'Failed to load draft' })
      }
    })
  }, [draftId, loadedDraftId, initialStep])

  // Helper to get effective platform data (merged with edits)
  const getPlatformData = useCallback((platform: string) => {
    const base = (draft?.platformData as Record<string, Record<string, unknown>> | null)?.[platform] || {}
    const edits = editedPlatformData?.[platform] || {}
    return { ...base, ...edits } as { username?: string; accountId?: string; screenshot?: string; screenshots?: string[]; pin?: string; bank?: string; bankPhoneEmailConfirmed?: boolean; cardNumber?: string; cvv?: string; cardExpiry?: string; cardImages?: string[] }
  }, [draft?.platformData, editedPlatformData])

  // Compute risk assessment from draft flags
  const riskAssessment = useMemo<ReturnType<typeof calculateRiskScore> | null>(() => {
    if (!draft) return null
    return calculateRiskScore({
      idExpiryDaysRemaining: draft.idExpiry
        ? Math.floor((new Date(draft.idExpiry).getTime() - Date.now()) / 86400000)
        : null,
      paypalPreviouslyUsed: getField<boolean>(draft, editedFields, 'paypalPreviouslyUsed'),
      multipleAddresses: getField<boolean>(draft, editedFields, 'addressMismatch'),
      debankedHistory: getField<boolean>(draft, editedFields, 'debankedHistory'),
      criminalRecord: getField<boolean | null>(draft, editedFields, 'hasCriminalRecord') ?? false,
      missingIdCount: draft.missingIdType ? draft.missingIdType.split(',').filter(Boolean).length : 0,
      householdAwareness: draft.householdAwareness ?? '',
      familyTechSupport: draft.familyTechSupport ?? '',
      financialAutonomy: draft.financialAutonomy ?? '',
      credentialMismatches: {},
      discoveredAddressCount: (draft.discoveredAddresses ?? []).length,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, editedFields])

  // Auto-scroll to debit cards section when opening Step 3 via Upload Card button
  useEffect(() => {
    if (scrollToDebitCards && step === 3 && draft && !loading) {
      // Wait for content to render, then scroll to debit cards
      const timer = setTimeout(() => {
        const el = contentScrollRef.current
        if (el) {
          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
        }
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [scrollToDebitCards, step, draft, loading])

  const maxStep = draft?.step ?? 1

  return (
    <Dialog open={!!draftId} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[85vh] max-w-5xl overflow-hidden p-0" data-testid="draft-review-dialog">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="text-sm">
            Review — {draftName}
            {hasChanges && <span className="ml-2 text-[10px] font-normal text-warning">Unsaved changes</span>}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="py-8 text-center text-sm text-destructive">{error}</div>
        )}

        {draft && !loading && (
          <div className="flex max-h-[calc(85vh-120px)] min-h-0">
            {/* ═══ LEFT: Risk Mini-Panel ═══ */}
            <div className="w-48 min-w-48 shrink-0 overflow-y-auto border-r border-border bg-muted/20 p-3 space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <Shield className="h-3 w-3" />
                Risk Assessment
              </div>

              {riskAssessment && (
                <>
                  {/* Risk level badge */}
                  {(() => {
                    const cfg = {
                      low: { color: 'text-success', bg: 'border-success/30 bg-success/10', Icon: CheckCircle2 },
                      medium: { color: 'text-warning', bg: 'border-warning/30 bg-warning/10', Icon: AlertTriangle },
                      high: { color: 'text-destructive', bg: 'border-destructive/30 bg-destructive/10', Icon: XCircle },
                    }[riskAssessment.level]
                    return (
                      <div className={cn('flex items-center gap-1.5 rounded-md border p-2', cfg.bg, cfg.color)} data-testid="risk-level-badge">
                        <cfg.Icon className="h-4 w-4 shrink-0" />
                        <span className="text-xs font-semibold capitalize">{riskAssessment.level} Risk</span>
                      </div>
                    )
                  })()}

                  {/* Risk flags */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-muted-foreground">Risk Factors</span>
                    {(() => {
                      const flags = riskAssessment.flags
                      const entries: { label: string; active: boolean; severity: 'high' | 'medium' | 'info' }[] = [
                        { label: 'Criminal Record', active: !!flags.criminalRecord, severity: 'high' },
                        { label: 'De-banked', active: !!flags.debankedHistory, severity: 'high' },
                        { label: 'ID Expiring', active: flags.idExpiryRisk !== 'none', severity: 'medium' },
                        { label: 'PayPal Used', active: !!flags.paypalPreviouslyUsed, severity: 'medium' },
                        { label: 'Missing IDs', active: (flags.missingIdCount ?? 0) > 0, severity: 'medium' },
                        { label: 'Multi Address', active: (flags.discoveredAddressCount ?? 0) >= 2, severity: 'info' },
                      ]
                      const active = entries.filter((e) => e.active)
                      if (active.length === 0) {
                        return (
                          <div className="flex items-center gap-1 text-[10px] text-success">
                            <CheckCircle2 className="h-3 w-3" />
                            No flags
                          </div>
                        )
                      }
                      return active.map((e) => (
                        <div key={e.label} className="flex items-center gap-1.5 text-[10px]">
                          <span className={cn(
                            'inline-block h-1.5 w-1.5 rounded-full',
                            e.severity === 'high' ? 'bg-destructive' : e.severity === 'medium' ? 'bg-warning' : 'bg-muted-foreground',
                          )} />
                          <span className={cn(
                            e.severity === 'high' ? 'text-destructive' : e.severity === 'medium' ? 'text-foreground' : 'text-muted-foreground',
                          )}>
                            {e.label}
                          </span>
                        </div>
                      ))
                    })()}
                  </div>

                  {/* Credentials */}
                  <div className="space-y-1.5">
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <KeyRound className="h-2.5 w-2.5" />
                      Credentials
                    </span>
                    {(() => {
                      const entries = Object.entries(riskAssessment.flags.credentialMismatches)
                      if (entries.length === 0) {
                        return <p className="text-[9px] text-muted-foreground/60">No data yet</p>
                      }
                      const totalPlatforms = entries.length
                      const matchCount = entries.filter(([, m]) => !m.username && !m.password).length
                      const accuracyPct = Math.round((matchCount / totalPlatforms) * 100)
                      const isPerfect = accuracyPct === 100

                      return (
                        <>
                          {entries.map(([platform, m]) => {
                            const name = CREDENTIAL_DISPLAY_NAMES[platform] || CREDENTIAL_DISPLAY_NAMES[platform.toUpperCase()] || platform.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\B\w+/g, (w) => w.toLowerCase())
                            const hasMismatch = m.username || m.password
                            return (
                              <div key={platform} className="flex items-center justify-between text-[10px]">
                                <span className={cn('flex items-center gap-1', hasMismatch ? 'text-foreground' : 'text-success')}>
                                  <span className={cn('inline-block h-1 w-1 rounded-full', hasMismatch ? 'bg-destructive' : 'bg-success')} />
                                  {name}
                                </span>
                                {hasMismatch ? (
                                  <span className="text-destructive/70 text-[9px]">
                                    {[m.username && 'email', m.password && 'pw'].filter(Boolean).join(', ')}
                                  </span>
                                ) : (
                                  <span className="text-success/70 text-[9px]">{'\u2713'}</span>
                                )}
                              </div>
                            )
                          })}

                          {/* Accuracy score */}
                          <div className={cn(
                            'mt-1 rounded-md border p-2 text-center',
                            isPerfect ? 'border-success/30 bg-success/5' : 'border-border bg-muted/30',
                          )} data-testid="credential-accuracy">
                            <p className={cn(
                              'font-mono text-sm font-bold',
                              isPerfect ? 'text-success' : accuracyPct >= 80 ? 'text-warning' : 'text-destructive',
                            )}>
                              {accuracyPct}%
                            </p>
                            <p className="text-[9px] text-muted-foreground">{matchCount}/{totalPlatforms} accurate</p>
                            <div className={cn(
                              'mt-1 flex items-center justify-center gap-0.5 text-[9px] font-medium',
                              isPerfect ? 'text-success' : 'text-muted-foreground',
                            )}>
                              <Trophy className="h-2.5 w-2.5" />
                              {isPerfect ? 'Perfect!' : 'Accuracy score'}
                            </div>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </>
              )}
            </div>

            {/* ═══ RIGHT: Step Content ═══ */}
            <div ref={contentScrollRef} className="flex min-w-0 flex-1 flex-col overflow-y-auto">
              <div className="flex-1 space-y-3 p-4">
                {/* Status + Risk summary bar */}
                <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-xs" data-testid="draft-review-summary">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px]',
                        draft.backofficeReviewedStep >= draft.step
                          ? 'border-success/30 bg-success/10 text-success'
                          : draft.backofficeReviewedStep > 0
                            ? 'border-primary/30 bg-primary/10 text-primary'
                            : 'border-muted-foreground/30 text-muted-foreground',
                      )}
                    >
                      {draft.backofficeReviewedStep >= draft.step
                        ? 'Fully Reviewed'
                        : draft.backofficeReviewedStep > 0
                          ? `Reviewed Step ${draft.backofficeReviewedStep}/${draft.step}`
                          : 'Not Reviewed'}
                    </Badge>
                    <span className="text-muted-foreground">Agent on Step {draft.step}/4</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Reviewed {draft.backofficeReviewedStep}/4
                  </span>
                </div>

                {/* Step indicator */}
                <div className="flex items-center justify-center gap-1.5" data-testid="draft-review-step-indicator">
                  {STEP_DEFS.map((s) => {
                    const isAccessible = s.number <= maxStep
                    return (
                      <div key={s.number} className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={!isAccessible}
                          onClick={() => isAccessible && dispatch({ type: 'SET_STEP', step: s.number as 1 | 2 | 3 | 4 })}
                          className={cn(
                            'flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold transition-colors',
                            !isAccessible
                              ? 'bg-muted/50 text-muted-foreground/30 cursor-not-allowed'
                              : step === s.number
                                ? 'bg-primary text-primary-foreground'
                                : step > s.number
                                  ? 'bg-success/20 text-success hover:ring-2 hover:ring-primary/40 cursor-pointer'
                                  : 'bg-muted text-muted-foreground hover:ring-2 hover:ring-primary/40 cursor-pointer',
                          )}
                          data-testid={`draft-review-step-${s.number}`}
                        >
                          {step > s.number && isAccessible ? <Check className="h-3 w-3" /> : s.number}
                        </button>
                        {s.number < 4 && (
                          <div className={cn('h-px w-6', step > s.number ? 'bg-success' : 'bg-border')} />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* ═══════════ Step 1 — Pre-Qual ═══════════ */}
                {step === 1 && (
                  <div className="space-y-3" data-testid="draft-review-step-1-content">
                    {/* ID Document */}
                    <div className="space-y-2">
                      <SectionHeader>ID Document</SectionHeader>
                      <ImageThumb src={draft.idDocument} alt="ID Document" />
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                        <EditableText
                          label="First Name"
                          value={getField<string | null>(draft, editedFields, 'firstName')}
                          onChange={(v) => setField('firstName', v)}
                        />
                        <EditableText
                          label="Last Name"
                          value={getField<string | null>(draft, editedFields, 'lastName')}
                          onChange={(v) => setField('lastName', v)}
                        />
                        <EditableDate
                          label={`Date of Birth ${computeAge(getField<string | null>(draft, editedFields, 'dateOfBirth'))}`}
                          value={getField<string | null>(draft, editedFields, 'dateOfBirth')}
                          onChange={(v) => setField('dateOfBirth', v)}
                        />
                        <EditableText
                          label="ID Number"
                          value={getField<string | null>(draft, editedFields, 'idNumber')}
                          onChange={(v) => setField('idNumber', v)}
                          mono
                        />
                        <EditableDate
                          label="ID Expiry"
                          value={getField<string | null>(draft, editedFields, 'idExpiry')}
                          onChange={(v) => setField('idExpiry', v)}
                        />
                        <EditableText
                          label="Address"
                          value={getField<string | null>(draft, editedFields, 'address')}
                          onChange={(v) => setField('address', v)}
                        />
                      </div>
                    </div>

                    {/* Different Address */}
                    {getField<boolean | null>(draft, editedFields, 'livesAtDifferentAddress') && (
                      <div className="space-y-2">
                        <SectionHeader>Different Address</SectionHeader>
                        <div className="rounded border border-warning/30 bg-warning/5 p-2.5 space-y-1.5">
                          <InfoRow label="Current Address" value={getField<string | null>(draft, editedFields, 'currentAddress')} />
                          <div className="grid grid-cols-2 gap-x-3">
                            <InfoRow label="Duration" value={DURATION_LABELS[getField<string | null>(draft, editedFields, 'differentAddressDuration') ?? ''] ?? getField<string | null>(draft, editedFields, 'differentAddressDuration')} />
                            <InfoRow label="Proof" value={ADDRESS_PROOF_LABELS[getField<string | null>(draft, editedFields, 'differentAddressProof') ?? ''] ?? getField<string | null>(draft, editedFields, 'differentAddressProof')} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Company Gmail */}
                    <div className="space-y-2">
                      <SectionHeader>Company Gmail</SectionHeader>
                      <ImageThumb src={draft.gmailScreenshot} alt="Gmail Screenshot" />
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                        <EditableText
                          label="Gmail Address"
                          value={getField<string | null>(draft, editedFields, 'assignedGmail')}
                          onChange={(v) => setField('assignedGmail', v)}
                        />
                        <EditableText
                          label="Gmail Password"
                          value={getField<string | null>(draft, editedFields, 'gmailPassword')}
                          onChange={(v) => setField('gmailPassword', v)}
                        />
                      </div>
                    </div>

                    {/* BetMGM */}
                    <div className="space-y-2">
                      <SectionHeader>BetMGM Verification</SectionHeader>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-muted-foreground">Registration</span>
                          <ImageThumb src={draft.betmgmRegScreenshot} alt="BetMGM Registration" />
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">Login</span>
                          <ImageThumb src={draft.betmgmLoginScreenshot} alt="BetMGM Login" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                        <EditableText
                          label="BetMGM Login"
                          value={getField<string | null>(draft, editedFields, 'betmgmLogin')}
                          onChange={(v) => setField('betmgmLogin', v)}
                        />
                        <EditableText
                          label="BetMGM Password"
                          value={getField<string | null>(draft, editedFields, 'betmgmPassword')}
                          onChange={(v) => setField('betmgmPassword', v)}
                        />
                        <EditableText
                          label="Phone"
                          value={getField<string | null>(draft, editedFields, 'phone')}
                          onChange={(v) => setField('phone', v)}
                          mono
                        />
                        <div>
                          <span className="text-[10px] text-muted-foreground">BetMGM Check</span>
                          <div className="mt-1">
                            <EditableCheckbox
                              label="Passed"
                              checked={getField<boolean | null>(draft, editedFields, 'betmgmCheckPassed')}
                              onChange={(v) => setField('betmgmCheckPassed', v)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Discovered Addresses */}
                    {(draft.discoveredAddresses ?? []).length > 0 && (
                      <div className="space-y-2" data-testid="draft-review-addresses">
                        <SectionHeader>Discovered Addresses</SectionHeader>
                        <div className="space-y-1">
                          {(draft.discoveredAddresses ?? []).map((addr, i) => (
                            <div key={i} className="flex items-start gap-2 rounded border border-border p-2 text-xs">
                              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                              <div>
                                <span className="rounded bg-muted px-1 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  From {addr.source}
                                </span>
                                <p className="mt-0.5 font-medium">{addr.address}</p>
                              </div>
                              {addr.confirmedByAgent && (
                                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══════════ Step 2 — Background ═══════════ */}
                {step === 2 && (
                  <div className="space-y-3" data-testid="draft-review-step-2-content">

                    {/* A. Identity & Document */}
                    <div className="space-y-2">
                      <SectionHeader>Identity & Document</SectionHeader>
                      <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
                        <div>
                          <span className="text-[10px] text-muted-foreground">SSN Document</span>
                          <p className="mt-0.5 text-xs font-medium">
                            {draft.ssnDocument ? (
                              <span className="flex items-center gap-1 text-success">
                                <CheckCircle2 className="h-3 w-3" /> Uploaded
                              </span>
                            ) : '\u2014'}
                          </p>
                        </div>
                        <EditableText
                          label="SSN Number"
                          value={getField<string | null>(draft, editedFields, 'ssnNumber')}
                          onChange={(v) => setField('ssnNumber', v)}
                          mono
                        />
                        <InfoRow label="Citizenship" value={CITIZENSHIP_LABELS[draft.citizenship ?? ''] ?? draft.citizenship} />
                      </div>

                      {/* Missing IDs */}
                      {draft.missingIdType && draft.missingIdType.length > 0 && (
                        <div>
                          <span className="text-[10px] text-muted-foreground">Missing IDs</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {draft.missingIdType.split(',').filter(Boolean).map((id) => (
                              <InfoBadge key={id} variant="warning">{MISSING_ID_LABELS[id] ?? id}</InfoBadge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Criminal Record */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                        <EditableCheckbox
                          label="Has Criminal Record"
                          checked={getField<boolean | null>(draft, editedFields, 'hasCriminalRecord')}
                          onChange={(v) => setField('hasCriminalRecord', v)}
                        />
                        <EditableText
                          label="Criminal Record Notes"
                          value={getField<string | null>(draft, editedFields, 'criminalRecordNotes')}
                          onChange={(v) => setField('criminalRecordNotes', v)}
                        />
                      </div>
                    </div>

                    {/* B. Address */}
                    <div className="space-y-2">
                      <SectionHeader>Address</SectionHeader>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                        <EditableText
                          label="Secondary Address"
                          value={getField<string | null>(draft, editedFields, 'secondAddress')}
                          onChange={(v) => setField('secondAddress', v)}
                        />
                        <div>
                          <span className="text-[10px] text-muted-foreground">Address Proof</span>
                          <p className="mt-0.5 text-xs font-medium">
                            {draft.secondAddressProof ? (
                              <span className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> Uploaded</span>
                            ) : '\u2014'}
                          </p>
                        </div>
                      </div>
                      {getField<boolean | null>(draft, editedFields, 'bankNegativeBalance') && (
                        <InfoBadge variant="warning">Owes Bank / Negative Balance</InfoBadge>
                      )}
                    </div>

                    {/* C. Banking & Financial History */}
                    <div className="space-y-2">
                      <SectionHeader>Banking & Financial History</SectionHeader>
                      <div className="space-y-1.5">
                        {/* Banks opened */}
                        {draft.bankingHistory && (
                          <div>
                            <span className="text-[10px] text-muted-foreground">Banks Opened</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {draft.bankingHistory.split(',').filter(Boolean).map((b) => (
                                <InfoBadge key={b}>{BANK_LABELS[b] ?? b}</InfoBadge>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-x-3">
                          <EditableCheckbox
                            label="De-banked History"
                            checked={getField<boolean>(draft, editedFields, 'debankedHistory')}
                            onChange={(v) => setField('debankedHistory', v)}
                          />
                          <EditableText
                            label="De-banked Bank"
                            value={getField<string | null>(draft, editedFields, 'debankedBank')}
                            onChange={(v) => setField('debankedBank', v)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* D. PayPal History */}
                    <div className="space-y-2">
                      <SectionHeader>PayPal History</SectionHeader>
                      <div className="flex flex-wrap items-center gap-3">
                        <EditableCheckbox
                          label="PayPal Previously Used"
                          checked={getField<boolean>(draft, editedFields, 'paypalPreviouslyUsed')}
                          onChange={(v) => setField('paypalPreviouslyUsed', v)}
                        />
                        {draft.paypalSsnLinked && <InfoBadge variant="success">SSN Linked</InfoBadge>}
                        {draft.paypalBrowserVerified && <InfoBadge variant="success">Browser Verified</InfoBadge>}
                      </div>
                    </div>

                    {/* E. Sportsbook History */}
                    {draft.sportsbookUsedList && (
                      <div className="space-y-2">
                        <SectionHeader>Sportsbook History</SectionHeader>
                        <div className="flex flex-wrap gap-1.5">
                          {(() => {
                            const list = draft.sportsbookUsedList?.split(',').filter(Boolean) ?? []
                            let statuses: Record<string, string> = {}
                            try { statuses = draft.sportsbookStatuses ? JSON.parse(draft.sportsbookStatuses) : {} } catch { /* */ }
                            return list.map((sb) => {
                              const status = statuses[sb] ?? 'active'
                              const variant = status === 'active' ? 'success' : status === 'suspended' ? 'warning' : status === 'banned' ? 'destructive' : 'default'
                              return (
                                <InfoBadge key={sb} variant={variant}>
                                  {SPORTSBOOK_LABELS[sb] ?? sb} {status !== 'active' ? `(${status})` : ''}
                                </InfoBadge>
                              )
                            })
                          })()}
                        </div>
                      </div>
                    )}

                    {/* F. Client Background */}
                    <div className="space-y-2">
                      <SectionHeader>Client Background</SectionHeader>
                      <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
                        <InfoRow label="Occupation" value={draft.occupation} />
                        <InfoRow label="Employment" value={EMPLOYMENT_LABELS[draft.employmentStatus ?? ''] ?? draft.employmentStatus} />
                        <InfoRow label="Annual Income" value={INCOME_LABELS[draft.annualIncome ?? ''] ?? draft.annualIncome} />
                        <InfoRow label="Marital Status" value={MARITAL_LABELS[draft.maritalStatus ?? ''] ?? draft.maritalStatus} />
                        <InfoRow label="Credit Score" value={CREDIT_LABELS[draft.creditScoreRange ?? ''] ?? draft.creditScoreRange} />
                        <InfoRow label="Dependents" value={draft.dependents} />
                        <InfoRow label="Education" value={EDUCATION_LABELS[draft.educationLevel ?? ''] ?? draft.educationLevel} />
                      </div>
                    </div>

                    {/* G. Risk Assessment Questions */}
                    <div className="space-y-2">
                      <SectionHeader>Risk Assessment Questions</SectionHeader>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Household Awareness', value: draft.householdAwareness, labels: HOUSEHOLD_LABELS, good: ['supportive', 'not_applicable'] },
                          { label: 'Family Tech Support', value: draft.familyTechSupport, labels: FAMILY_SUPPORT_LABELS, good: ['willing_to_help'] },
                          { label: 'Financial Autonomy', value: draft.financialAutonomy, labels: AUTONOMY_LABELS, good: ['fully_independent'] },
                          { label: 'Digital Comfort', value: draft.digitalComfort, labels: DIGITAL_COMFORT_LABELS, good: ['very_comfortable'] },
                        ].map((q) => (
                          <div key={q.label} className="flex items-center justify-between rounded border border-border p-2 text-xs">
                            <span className="text-muted-foreground">{q.label}</span>
                            {q.value ? (
                              <InfoBadge variant={assessmentVariant(q.value, q.good)}>
                                {q.labels[q.value] ?? q.value}
                              </InfoBadge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/50">{'\u2014'}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══════════ Step 3 — Platforms ═══════════ */}
                {step === 3 && (
                  <div className="space-y-3" data-testid="draft-review-step-3-content">
                    {/* Summary bar */}
                    {(() => {
                      const filled = ALL_PLATFORMS.filter((p) => {
                        const d = getPlatformData(p as string)
                        return d && (d.username || d.accountId)
                      }).length
                      const withScreenshot = ALL_PLATFORMS.filter((p) => {
                        const d = getPlatformData(p as string)
                        return d?.screenshot
                      }).length
                      return (
                        <div className="flex items-center gap-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
                          <span className="text-muted-foreground">Platforms filled:</span>
                          <span className={cn('font-mono font-semibold', filled === ALL_PLATFORMS.length ? 'text-success' : filled > 0 ? 'text-warning' : 'text-muted-foreground')}>
                            {filled}/{ALL_PLATFORMS.length}
                          </span>
                          <span className="text-muted-foreground">Screenshots:</span>
                          <span className={cn('font-mono font-semibold', withScreenshot === ALL_PLATFORMS.length ? 'text-success' : withScreenshot > 0 ? 'text-warning' : 'text-muted-foreground')}>
                            {withScreenshot}/{ALL_PLATFORMS.length}
                          </span>
                        </div>
                      )
                    })()}

                    <SectionHeader>Platform Registration</SectionHeader>
                    <div className="grid grid-cols-2 gap-2">
                      {ALL_PLATFORMS.map((platform) => {
                        const info = PLATFORM_INFO[platform]
                        const data = getPlatformData(platform as string)
                        const hasUsername = !!data?.username
                        const hasAccountId = !!data?.accountId
                        const hasScreenshot = !!data?.screenshot
                        const hasBoth = hasUsername && hasAccountId
                        const hasPartial = hasUsername || hasAccountId || hasScreenshot
                        const fillColor = hasBoth ? 'border-success/40 bg-success/5' : hasPartial ? 'border-warning/40 bg-warning/5' : 'bg-muted/20 opacity-50'

                        return (
                          <div
                            key={platform}
                            className={cn('rounded border p-2 text-xs', fillColor)}
                            data-testid={`draft-review-platform-${platform}`}
                          >
                            <div className="mb-1.5 flex items-center justify-between">
                              <span className="font-medium">
                                {info.name}
                                {(() => {
                                  const screenshotCount = data?.screenshots?.length ?? (data?.screenshot ? 1 : 0)
                                  if (screenshotCount > 0) {
                                    return <span className="ml-1 text-[10px] font-normal text-muted-foreground">{'\u2014'} {screenshotCount} upload{screenshotCount !== 1 ? 's' : ''}</span>
                                  }
                                  return null
                                })()}
                              </span>
                              {hasBoth ? (
                                <CheckCircle2 className="h-3 w-3 text-success" />
                              ) : hasPartial ? (
                                <div className="h-3 w-3 rounded-full border-2 border-warning" />
                              ) : (
                                <Minus className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <EditableText
                                label="Username"
                                value={data?.username ?? null}
                                onChange={(v) => setPlatformField(platform as string, 'username', v)}
                              />
                              <EditableText
                                label="Account ID"
                                value={data?.accountId ?? null}
                                onChange={(v) => setPlatformField(platform as string, 'accountId', v)}
                                mono
                              />
                              {data?.screenshot && <p className="text-[10px] text-success">Screenshot uploaded</p>}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Debit Card Section */}
                    {(() => {
                      const bankCard = getPlatformData('onlineBanking')
                      const edgeboostCard = getPlatformData('edgeboost')
                      const hasBankCard = !!bankCard?.cardNumber
                      const hasEdgeboostCard = !!edgeboostCard?.cardNumber
                      const bothDone = hasBankCard && hasEdgeboostCard

                      return (
                        <div className="space-y-2" data-testid="draft-review-debit-cards">
                          <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            <CreditCard className="h-3 w-3" />
                            Debit Cards
                            {bothDone && <CheckCircle2 className="ml-1 h-3 w-3 text-success" />}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {/* Bank debit card */}
                            <div className={cn(
                              'rounded border p-2 text-xs',
                              hasBankCard ? 'border-success/40 bg-success/5' : 'border-warning/40 bg-warning/5',
                            )}>
                              <div className="mb-1.5 flex items-center justify-between">
                                <span className="font-medium">Online Banking</span>
                                {hasBankCard ? (
                                  <CheckCircle2 className="h-3 w-3 text-success" />
                                ) : (
                                  <div className="h-3 w-3 rounded-full border-2 border-warning" />
                                )}
                              </div>
                              <div className="space-y-1">
                                <EditableText
                                  label="Card Number"
                                  value={bankCard?.cardNumber ?? null}
                                  onChange={(v) => setPlatformField('onlineBanking', 'cardNumber', v)}
                                  mono
                                />
                                <div className="grid grid-cols-2 gap-1">
                                  <EditableText
                                    label="CVV"
                                    value={bankCard?.cvv ?? null}
                                    onChange={(v) => setPlatformField('onlineBanking', 'cvv', v)}
                                    mono
                                  />
                                  <EditableText
                                    label="Expiry"
                                    value={bankCard?.cardExpiry ?? null}
                                    onChange={(v) => setPlatformField('onlineBanking', 'cardExpiry', v)}
                                    mono
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Edgeboost debit card */}
                            <div className={cn(
                              'rounded border p-2 text-xs',
                              hasEdgeboostCard ? 'border-success/40 bg-success/5' : 'border-warning/40 bg-warning/5',
                            )}>
                              <div className="mb-1.5 flex items-center justify-between">
                                <span className="font-medium">EdgeBoost</span>
                                {hasEdgeboostCard ? (
                                  <CheckCircle2 className="h-3 w-3 text-success" />
                                ) : (
                                  <div className="h-3 w-3 rounded-full border-2 border-warning" />
                                )}
                              </div>
                              <div className="space-y-1">
                                <EditableText
                                  label="Card Number"
                                  value={edgeboostCard?.cardNumber ?? null}
                                  onChange={(v) => setPlatformField('edgeboost', 'cardNumber', v)}
                                  mono
                                />
                                <div className="grid grid-cols-2 gap-1">
                                  <EditableText
                                    label="CVV"
                                    value={edgeboostCard?.cvv ?? null}
                                    onChange={(v) => setPlatformField('edgeboost', 'cvv', v)}
                                    mono
                                  />
                                  <EditableText
                                    label="Expiry"
                                    value={edgeboostCard?.cardExpiry ?? null}
                                    onChange={(v) => setPlatformField('edgeboost', 'cardExpiry', v)}
                                    mono
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Credentials summary */}
                    <div className="space-y-1.5" data-testid="draft-review-credentials">
                      <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        <KeyRound className="h-3 w-3" />
                        Credentials
                      </p>
                      <div className="space-y-1 text-xs">
                        {/* Step 1 credentials: Gmail + BetMGM */}
                        {[
                          { key: 'Gmail', user: getField<string | null>(draft, editedFields, 'assignedGmail'), pass: getField<string | null>(draft, editedFields, 'gmailPassword') },
                          { key: 'BetMGM', user: getField<string | null>(draft, editedFields, 'betmgmLogin'), pass: getField<string | null>(draft, editedFields, 'betmgmPassword') },
                        ].map(({ key, user, pass }) => {
                          const hasUser = !!user
                          const hasPass = !!pass
                          const filled = hasUser && hasPass
                          return (
                            <div key={key} className="flex items-center justify-between">
                              <span className={cn('flex items-center gap-1', filled ? 'text-foreground' : 'text-muted-foreground')}>
                                <span className={cn('inline-block h-1.5 w-1.5 rounded-full', filled ? 'bg-success' : hasUser || hasPass ? 'bg-warning' : 'bg-muted-foreground/30')} />
                                {key}
                              </span>
                              <span className="text-[10px] text-muted-foreground/60">
                                {hasUser && hasPass ? 'filled' : hasUser ? 'email only' : hasPass ? 'password only' : '\u2014'}
                              </span>
                            </div>
                          )
                        })}
                        {/* Step 3 platform credentials */}
                        {ALL_PLATFORMS.map((platform) => {
                          const info = PLATFORM_INFO[platform]
                          const data = getPlatformData(platform as string)
                          const hasUser = !!data?.username
                          const hasPass = !!data?.accountId
                          const filled = hasUser && hasPass
                          if (!hasUser && !hasPass) return null
                          return (
                            <div key={platform} className="flex items-center justify-between">
                              <span className={cn('flex items-center gap-1', filled ? 'text-foreground' : 'text-muted-foreground')}>
                                <span className={cn('inline-block h-1.5 w-1.5 rounded-full', filled ? 'bg-success' : 'bg-warning')} />
                                {info.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground/60">
                                {hasUser && hasPass ? 'filled' : hasUser ? 'username only' : 'password only'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══════════ Step 4 — Contract ═══════════ */}
                {step === 4 && (
                  <div className="space-y-3" data-testid="draft-review-step-4-content">
                    {/* Contract Document */}
                    <div className="space-y-2">
                      <SectionHeader>Contract Document</SectionHeader>
                      {draft.contractDocument ? (
                        <div className="flex items-center gap-2 rounded border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
                          <CheckCircle2 className="h-4 w-4" />
                          Contract uploaded
                        </div>
                      ) : (
                        <div className="flex items-center justify-center rounded border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                          Not uploaded
                        </div>
                      )}
                    </div>

                    {/* Discovered Addresses summary */}
                    {(draft.discoveredAddresses ?? []).length > 0 && (
                      <div className="space-y-2" data-testid="draft-review-step4-addresses">
                        <SectionHeader>Addresses</SectionHeader>
                        <div className="space-y-1">
                          {(draft.discoveredAddresses ?? []).map((addr, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">{addr.source}</span>
                              <span className="flex-1 truncate font-medium">{addr.address}</span>
                              {addr.confirmedByAgent && <CheckCircle2 className="h-3 w-3 shrink-0 text-success" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Agent Assessment */}
                    <div className="space-y-2">
                      <SectionHeader>Agent Assessment</SectionHeader>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center justify-between rounded border border-border p-2 text-xs">
                          <span className="text-muted-foreground">Confidence Level</span>
                          {draft.agentConfidenceLevel ? (
                            <InfoBadge variant={draft.agentConfidenceLevel === 'high' ? 'success' : draft.agentConfidenceLevel === 'low' ? 'destructive' : 'warning'}>
                              {CONFIDENCE_LABELS[draft.agentConfidenceLevel] ?? draft.agentConfidenceLevel}
                            </InfoBadge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/50">Not set</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between rounded border border-border p-2 text-xs">
                          <span className="text-muted-foreground">Client Integrity</span>
                          {draft.clientHidingInfo ? (
                            <InfoBadge variant="destructive">Flagged</InfoBadge>
                          ) : (
                            <InfoBadge variant="success">Clear</InfoBadge>
                          )}
                        </div>
                      </div>

                      {/* Integrity notes if flagged */}
                      {draft.clientHidingInfo && draft.clientHidingInfoNotes && (
                        <div className="rounded border border-destructive/30 bg-destructive/5 p-2.5">
                          <span className="text-[10px] font-medium text-destructive">Integrity Concern Notes</span>
                          <p className="mt-1 text-xs text-foreground">{draft.clientHidingInfoNotes}</p>
                        </div>
                      )}
                    </div>

                    {/* ─── Approve Section (inline in Step 4) ─── */}
                    {resultClientId && draft.status === 'SUBMITTED' && (
                      <div className="space-y-2" data-testid="step4-approve-section">
                        <SectionHeader>Approval</SectionHeader>
                        <ApproveGate
                          draft={draft}
                          approving={approving}
                          hasChanges={hasChanges}
                          onApprove={handleApprove}
                          editedPlatformData={editedPlatformData}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer — step navigation + save */}
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                {step > 1 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => dispatch({ type: 'SET_STEP', step: (step - 1) as 1 | 2 | 3 | 4 })}
                    data-testid="draft-review-back-btn"
                  >
                    <ChevronLeft className="mr-1 h-3 w-3" />
                    Back
                  </Button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  {/* Save button */}
                  {hasChanges && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleSave}
                      disabled={isSaving}
                      data-testid="draft-review-save-btn"
                    >
                      {isSaving ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="mr-1 h-3 w-3" />
                      )}
                      Save
                    </Button>
                  )}

                  {step < maxStep && step < 4 ? (
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleNextStep}
                      data-testid="draft-review-next-btn"
                    >
                      Next
                      <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  ) : step === maxStep ? (
                    <span className="text-[11px] text-muted-foreground" data-testid="draft-review-pending-submit">
                      {maxStep < 4 ? `Agent on Step ${maxStep}` : step === 4 && resultClientId ? 'Approve above ↑' : 'Awaiting agent submission'}
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleNextStep}
                      data-testid="draft-review-next-btn"
                    >
                      Next
                      <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ─── Approval gate: require both debit cards before approving ─── */
function ApproveGate({
  draft,
  approving,
  hasChanges,
  onApprove,
  editedPlatformData,
}: {
  draft: FullDraftData | null
  approving: boolean
  hasChanges: boolean
  onApprove: () => void
  editedPlatformData?: Record<string, Record<string, unknown>> | null
}) {
  const pd = (draft?.platformData as Record<string, Record<string, unknown>>) || {}
  // Merge in any edited card data so freshly-entered cards are recognized
  const bankData = { ...(pd.onlineBanking || {}), ...(editedPlatformData?.onlineBanking || {}) }
  const edgeboostData = { ...(pd.edgeboost || {}), ...(editedPlatformData?.edgeboost || {}) }
  const hasBankCard = !!bankData.cardNumber
  const hasEdgeboostCard = !!edgeboostData.cardNumber
  const cardsReady = hasBankCard && hasEdgeboostCard

  return (
    <div className="rounded-md border border-border p-3" data-testid="approve-gate">
      {/* Card detection status */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className={cn(
          'flex items-center gap-2 rounded border px-2.5 py-2 text-xs',
          hasBankCard ? 'border-success/40 bg-success/5 text-success' : 'border-warning/40 bg-warning/5 text-warning',
        )}>
          {hasBankCard ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <CreditCard className="h-3.5 w-3.5 shrink-0" />}
          <span className="font-medium">Bank Card {hasBankCard ? '✓' : 'Missing'}</span>
        </div>
        <div className={cn(
          'flex items-center gap-2 rounded border px-2.5 py-2 text-xs',
          hasEdgeboostCard ? 'border-success/40 bg-success/5 text-success' : 'border-warning/40 bg-warning/5 text-warning',
        )}>
          {hasEdgeboostCard ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <CreditCard className="h-3.5 w-3.5 shrink-0" />}
          <span className="font-medium">EdgeBoost Card {hasEdgeboostCard ? '✓' : 'Missing'}</span>
        </div>
      </div>

      {/* Approve button */}
      <Button
        size="sm"
        className={cn(
          'h-8 w-full text-xs',
          cardsReady && !hasChanges && 'bg-success text-success-foreground hover:bg-success/90',
        )}
        onClick={onApprove}
        disabled={approving || hasChanges || !cardsReady}
        data-testid="draft-review-approve-btn"
      >
        {approving ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : (
          <Check className="mr-1 h-3 w-3" />
        )}
        {cardsReady ? 'Approve Client' : !hasBankCard && !hasEdgeboostCard ? 'Both Debit Cards Required' : !hasBankCard ? 'Bank Debit Card Required' : 'EdgeBoost Debit Card Required'}
      </Button>
      {hasChanges && (
        <p className="mt-1.5 text-center text-[10px] text-warning">Save changes before approving</p>
      )}
    </div>
  )
}
