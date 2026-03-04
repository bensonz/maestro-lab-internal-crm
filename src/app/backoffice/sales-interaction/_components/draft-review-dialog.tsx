'use client'

import { useCallback, useEffect, useReducer, useRef } from 'react'
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
import { toast } from 'sonner'
import { EditableText, EditableDate, EditableCheckbox } from './draft-editable-fields'

interface FullDraftData {
  id: string
  status: string
  step: number
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
  ssnDocument: string | null
  secondAddress: string | null
  hasCriminalRecord: boolean | null
  criminalRecordNotes: string | null
  bankingHistory: string | null
  paypalHistory: string | null
  sportsbookHistory: string | null
  platformData: Record<string, { username?: string; accountId?: string; screenshot?: string; screenshots?: string[]; pin?: string; bank?: string; bankPhoneEmailConfirmed?: boolean }> | null
  discoveredAddresses: Array<{ address: string; source: string; confirmedByAgent?: boolean }> | null
  contractDocument: string | null
  paypalPreviouslyUsed: boolean
  addressMismatch: boolean
  debankedHistory: boolean
  debankedBank: string | null
  undisclosedInfo: boolean
  closerId: string
  resultClientId: string | null
  createdAt: string
  updatedAt: string
}

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

interface DraftReviewDialogProps {
  draftId: string | null
  draftName: string
  /** The linked Client ID when draft is SUBMITTED (PENDING approval) */
  resultClientId?: string | null
  /** Open dialog at a specific step (1-4). Defaults to 1. */
  initialStep?: 1 | 2 | 3 | 4
  onClose: () => void
}

export function DraftReviewDialog({ draftId, draftName, resultClientId, initialStep, onClose }: DraftReviewDialogProps) {
  const router = useRouter()
  const [state, dispatch] = useReducer(dialogReducer, INITIAL_STATE)
  const { draft, loading, error, step, loadedDraftId, approving, editedFields, editedPlatformData, isSaving, hasChanges } = state
  const fetchingRef = useRef<string | null>(null)

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

    // Build save payload
    const payload: Record<string, unknown> = { ...editedFields }

    // Merge platform data if changed
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
      // Re-fetch fresh data
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
        dispatch({ type: 'FETCH_SUCCESS', draft: result.draft as unknown as FullDraftData })
        // Jump to initialStep if provided (e.g. step 3 when opening from Upload Card #)
        if (initialStep && initialStep !== 1) {
          dispatch({ type: 'SET_STEP', step: initialStep })
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

  return (
    <Dialog open={!!draftId} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto" data-testid="draft-review-dialog">
        <DialogHeader className="pb-0">
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
          <>
            {/* Status + Risk summary bar */}
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-xs" data-testid="draft-review-summary">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px]',
                    draft.status === 'SUBMITTED'
                      ? 'border-warning/30 bg-warning/10 text-warning'
                      : 'border-muted-foreground/30 text-muted-foreground',
                  )}
                >
                  {draft.status === 'SUBMITTED' ? 'Pending Approval' : 'Draft'}
                </Badge>
                <span className="text-muted-foreground">Step {draft.step}/4</span>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const addrCount = (draft.discoveredAddresses ?? []).length
                  if (addrCount === 0) return null
                  const addrStyle = addrCount <= 1
                    ? 'bg-success/10 text-success'
                    : addrCount === 2
                      ? 'bg-warning/10 text-warning'
                      : 'bg-destructive/10 text-destructive'
                  return (
                    <span className={cn('inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px]', addrStyle)}>
                      <MapPin className="h-2.5 w-2.5" />
                      {addrCount}
                    </span>
                  )
                })()}
                {getField<boolean>(draft, editedFields, 'paypalPreviouslyUsed') && <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] text-warning">PayPal</span>}
                {getField<boolean>(draft, editedFields, 'debankedHistory') && <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">De-banked</span>}
                {getField<boolean>(draft, editedFields, 'undisclosedInfo') && <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">Undisclosed</span>}
                {getField<boolean | null>(draft, editedFields, 'hasCriminalRecord') && <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">Criminal</span>}
              </div>
            </div>

            {/* High-risk warning banner */}
            {(() => {
              const highRiskFlags = [
                getField<boolean>(draft, editedFields, 'debankedHistory') && 'De-banked History',
                getField<boolean | null>(draft, editedFields, 'hasCriminalRecord') && 'Criminal Record',
              ].filter(Boolean) as string[]
              const mediumRiskFlags = [
                getField<boolean>(draft, editedFields, 'paypalPreviouslyUsed') && 'PayPal Previously Used',
                getField<boolean>(draft, editedFields, 'undisclosedInfo') && 'Undisclosed Information',
              ].filter(Boolean) as string[]
              const isHighRisk = highRiskFlags.length > 0 || (mediumRiskFlags.length >= 2 && highRiskFlags.length === 0)
              if (!isHighRisk) return null
              return (
                <div
                  className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3"
                  data-testid="high-risk-banner"
                >
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-destructive">High Risk Client</p>
                    <p className="mt-0.5 text-xs text-destructive/80">
                      {[...highRiskFlags, ...mediumRiskFlags].join(' · ')}
                    </p>
                  </div>
                </div>
              )
            })()}

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-1.5" data-testid="draft-review-step-indicator">
              {STEP_DEFS.map((s) => (
                <div key={s.number} className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'SET_STEP', step: s.number as 1 | 2 | 3 | 4 })}
                    className={cn(
                      'flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-[9px] font-semibold transition-colors hover:ring-2 hover:ring-primary/40',
                      step === s.number
                        ? 'bg-primary text-primary-foreground'
                        : step > s.number
                          ? 'bg-success/20 text-success'
                          : 'bg-muted text-muted-foreground',
                    )}
                    data-testid={`draft-review-step-${s.number}`}
                  >
                    {step > s.number ? <Check className="h-3 w-3" /> : s.number}
                  </button>
                  {s.number < 4 && (
                    <div className={cn('h-px w-6', step > s.number ? 'bg-success' : 'bg-border')} />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1 — Pre-Qual (Editable) */}
            {step === 1 && (
              <div className="space-y-3" data-testid="draft-review-step-1-content">
                {/* ID Document — read-only image */}
                <div className="space-y-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">ID Document</p>
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

                {/* Company Gmail */}
                <div className="space-y-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Company Gmail</p>
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
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">BetMGM Verification</p>
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
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Discovered Addresses</p>
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

            {/* Step 2 — Background (Editable) */}
            {step === 2 && (
              <div className="space-y-3" data-testid="draft-review-step-2-content">
                <div className="space-y-2">
                  <div className="text-xs">
                    <span className="text-[10px] text-muted-foreground">SSN Document</span>
                    <p className="mt-0.5 font-medium">
                      {draft.ssnDocument ? (
                        <span className="flex items-center gap-1 text-success">
                          <CheckCircle2 className="h-3 w-3" /> Uploaded
                        </span>
                      ) : '\u2014'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <EditableText
                    label="Secondary Address"
                    value={getField<string | null>(draft, editedFields, 'secondAddress')}
                    onChange={(v) => setField('secondAddress', v)}
                  />
                  <EditableText
                    label="Banking History"
                    value={getField<string | null>(draft, editedFields, 'bankingHistory')}
                    onChange={(v) => setField('bankingHistory', v)}
                  />
                  <EditableText
                    label="PayPal History"
                    value={getField<string | null>(draft, editedFields, 'paypalHistory')}
                    onChange={(v) => setField('paypalHistory', v)}
                  />
                  <EditableText
                    label="Sportsbook History"
                    value={getField<string | null>(draft, editedFields, 'sportsbookHistory')}
                    onChange={(v) => setField('sportsbookHistory', v)}
                  />
                  <EditableText
                    label="De-banked Bank"
                    value={getField<string | null>(draft, editedFields, 'debankedBank')}
                    onChange={(v) => setField('debankedBank', v)}
                  />
                  <EditableText
                    label="Criminal Record Notes"
                    value={getField<string | null>(draft, editedFields, 'criminalRecordNotes')}
                    onChange={(v) => setField('criminalRecordNotes', v)}
                  />
                </div>

                {/* Risk Flags — editable checkboxes */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Risk Flags</p>
                  <div className="space-y-1.5">
                    <EditableCheckbox
                      label="Has Criminal Record"
                      checked={getField<boolean | null>(draft, editedFields, 'hasCriminalRecord')}
                      onChange={(v) => setField('hasCriminalRecord', v)}
                    />
                    <EditableCheckbox
                      label="PayPal Previously Used"
                      checked={getField<boolean>(draft, editedFields, 'paypalPreviouslyUsed')}
                      onChange={(v) => setField('paypalPreviouslyUsed', v)}
                    />
                    <EditableCheckbox
                      label="Multiple Addresses"
                      checked={getField<boolean>(draft, editedFields, 'addressMismatch')}
                      onChange={(v) => setField('addressMismatch', v)}
                    />
                    <EditableCheckbox
                      label="De-banked History"
                      checked={getField<boolean>(draft, editedFields, 'debankedHistory')}
                      onChange={(v) => setField('debankedHistory', v)}
                    />
                    <EditableCheckbox
                      label="Undisclosed Info"
                      checked={getField<boolean>(draft, editedFields, 'undisclosedInfo')}
                      onChange={(v) => setField('undisclosedInfo', v)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 — Platforms (Editable) */}
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

                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Platform Registration</p>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_PLATFORMS.map((platform) => {
                    const info = PLATFORM_INFO[platform]
                    const data = getPlatformData(platform as string)
                    const hasUsername = !!data?.username
                    const hasAccountId = !!data?.accountId
                    const hasScreenshot = !!data?.screenshot
                    const hasBoth = hasUsername && hasAccountId
                    const hasPartial = hasUsername || hasAccountId || hasScreenshot
                    // green=both credentials, amber=partial, dim=empty
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
                                return <span className="ml-1 text-[10px] font-normal text-muted-foreground">— {screenshotCount} upload{screenshotCount !== 1 ? 's' : ''}</span>
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

            {/* Step 4 — Contract */}
            {step === 4 && (
              <div className="space-y-3" data-testid="draft-review-step-4-content">
                <div className="space-y-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Contract Document</p>
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
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Addresses</p>
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

                <div className="space-y-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Submission Checklist</p>
                  <div className="space-y-1 text-xs">
                    {[
                      { ok: !!(getField<string | null>(draft, editedFields, 'firstName')), label: 'First Name' },
                      { ok: !!(getField<string | null>(draft, editedFields, 'lastName')), label: 'Last Name' },
                      { ok: !!draft.contractDocument, label: 'Contract Document' },
                    ].map(({ ok, label }) => (
                      <div key={label} className="flex items-center gap-2">
                        {ok ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border border-border" />
                        )}
                        <span className={ok ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer — step navigation + save */}
        {draft && !loading && (
          <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
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
              {/* Save button — always visible when there are changes */}
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

              {step < 4 ? (
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => dispatch({ type: 'SET_STEP', step: (step + 1) as 1 | 2 | 3 | 4 })}
                  data-testid="draft-review-next-btn"
                >
                  Next
                  <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              ) : resultClientId ? (
                <ApproveGate
                  draft={draft}
                  approving={approving}
                  hasChanges={hasChanges}
                  onApprove={handleApprove}
                />
              ) : (
                <span className="text-[11px] text-muted-foreground" data-testid="draft-review-pending-submit">
                  Awaiting agent submission
                </span>
              )}
            </div>
          </DialogFooter>
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
}: {
  draft: FullDraftData | null
  approving: boolean
  hasChanges: boolean
  onApprove: () => void
}) {
  const pd = (draft?.platformData as Record<string, Record<string, unknown>>) || {}
  const hasBankCard = !!pd.onlineBanking?.cardNumber
  const hasEdgeboostCard = !!pd.edgeboost?.cardNumber
  const cardsReady = hasBankCard && hasEdgeboostCard

  return (
    <div className="flex items-center gap-2">
      {!cardsReady && (
        <span className="text-[10px] text-warning" data-testid="cards-required-msg">
          {!hasBankCard && !hasEdgeboostCard
            ? 'Both debit cards required'
            : !hasBankCard
              ? 'Bank debit card required'
              : 'Edgeboost debit card required'}
        </span>
      )}
      <Button
        size="sm"
        className="h-7 text-xs"
        onClick={onApprove}
        disabled={approving || hasChanges || !cardsReady}
        data-testid="draft-review-approve-btn"
      >
        {approving ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : (
          <Check className="mr-1 h-3 w-3" />
        )}
        Approve Client
      </Button>
    </div>
  )
}
