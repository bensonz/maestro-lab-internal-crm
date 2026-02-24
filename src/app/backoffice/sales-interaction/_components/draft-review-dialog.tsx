'use client'

import { useEffect, useReducer } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Minus,
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
import { getFullDraft } from '@/app/actions/client-drafts'
import { approveClient } from '@/app/actions/clients'
import { toast } from 'sonner'

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
  platformData: Record<string, { username?: string; accountId?: string; screenshot?: string }> | null
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
  if (!dateOfBirth) return '—'
  const dob = new Date(dateOfBirth)
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const m = now.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--
  return `${age}y`
}

function FieldValue({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <p className="font-medium">{children}</p>
    </div>
  )
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
}

type DialogAction =
  | { type: 'FETCH_START'; draftId: string }
  | { type: 'FETCH_SUCCESS'; draft: FullDraftData }
  | { type: 'FETCH_ERROR'; error: string }
  | { type: 'SET_STEP'; step: 1 | 2 | 3 | 4 }
  | { type: 'APPROVE_START' }
  | { type: 'APPROVE_DONE' }
  | { type: 'RESET' }

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case 'FETCH_START':
      return { draft: null, loading: true, error: null, step: 1, loadedDraftId: action.draftId, approving: false }
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
    case 'RESET':
      return { draft: null, loading: false, error: null, step: 1, loadedDraftId: null, approving: false }
  }
}

const INITIAL_STATE: DialogState = {
  draft: null,
  loading: false,
  error: null,
  step: 1,
  loadedDraftId: null,
  approving: false,
}

interface DraftReviewDialogProps {
  draftId: string | null
  draftName: string
  /** The linked Client ID when draft is SUBMITTED (PENDING approval) */
  resultClientId?: string | null
  onClose: () => void
}

export function DraftReviewDialog({ draftId, draftName, resultClientId, onClose }: DraftReviewDialogProps) {
  const router = useRouter()
  const [state, dispatch] = useReducer(dialogReducer, INITIAL_STATE)
  const { draft, loading, error, step, loadedDraftId, approving } = state

  const handleApprove = async () => {
    if (!resultClientId) return
    dispatch({ type: 'APPROVE_START' })
    const result = await approveClient(resultClientId)
    dispatch({ type: 'APPROVE_DONE' })
    if (result.success) {
      toast.success(`${draftName} approved as client`)
      onClose()
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to approve')
    }
  }

  // Fetch draft data when draftId changes
  useEffect(() => {
    if (!draftId) {
      dispatch({ type: 'RESET' })
      return
    }
    if (draftId === loadedDraftId) return
    dispatch({ type: 'FETCH_START', draftId })
    getFullDraft(draftId).then((result) => {
      if (result.success) {
        dispatch({ type: 'FETCH_SUCCESS', draft: result.draft as unknown as FullDraftData })
      } else {
        dispatch({ type: 'FETCH_ERROR', error: result.error ?? 'Failed to load draft' })
      }
    })
  }, [draftId, loadedDraftId])

  const platformData = draft?.platformData as Record<string, { username?: string; accountId?: string; screenshot?: string }> | null

  return (
    <Dialog open={!!draftId} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto" data-testid="draft-review-dialog">
        <DialogHeader className="pb-0">
          <DialogTitle className="text-sm">
            Review — {draftName}
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

            {/* Step 1 — Pre-Qual */}
            {step === 1 && (
              <div className="space-y-3" data-testid="draft-review-step-1-content">
                {/* ID Document */}
                <div className="space-y-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">ID Document</p>
                  <ImageThumb src={draft.idDocument} alt="ID Document" />
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <FieldValue label="Name">
                      {draft.firstName || draft.lastName
                        ? `${draft.firstName ?? ''} ${draft.lastName ?? ''}`.trim()
                        : '—'}
                    </FieldValue>
                    <FieldValue label="Date of Birth">
                      {draft.dateOfBirth
                        ? `${new Date(draft.dateOfBirth).toLocaleDateString()} (${computeAge(draft.dateOfBirth)})`
                        : '—'}
                    </FieldValue>
                    <FieldValue label="ID Expiry">
                      {draft.idExpiry ? new Date(draft.idExpiry).toLocaleDateString() : '—'}
                    </FieldValue>
                    <FieldValue label="Address">
                      {draft.address || '—'}
                    </FieldValue>
                  </div>
                </div>

                {/* Company Gmail */}
                <div className="space-y-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Company Gmail</p>
                  <ImageThumb src={draft.gmailScreenshot} alt="Gmail Screenshot" />
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <FieldValue label="Gmail Address">
                      {draft.assignedGmail || '—'}
                    </FieldValue>
                    <FieldValue label="Gmail Password">
                      {draft.gmailPassword || '—'}
                    </FieldValue>
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
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <FieldValue label="BetMGM Login">
                      {draft.betmgmLogin || '—'}
                    </FieldValue>
                    <FieldValue label="BetMGM Password">
                      {draft.betmgmPassword || '—'}
                    </FieldValue>
                    <FieldValue label="Phone">
                      {draft.phone ? <span className="font-mono">{draft.phone}</span> : '—'}
                    </FieldValue>
                    <FieldValue label="BetMGM Check">
                      {draft.betmgmCheckPassed === true ? (
                        <Badge variant="outline" className="border-success/30 bg-success/10 text-[10px] text-success">Passed</Badge>
                      ) : draft.betmgmCheckPassed === false ? (
                        <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-[10px] text-destructive">Failed</Badge>
                      ) : (
                        '—'
                      )}
                    </FieldValue>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 — Background */}
            {step === 2 && (
              <div className="space-y-3" data-testid="draft-review-step-2-content">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <FieldValue label="SSN Document">
                    {draft.ssnDocument ? (
                      <span className="flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-3 w-3" /> Uploaded
                      </span>
                    ) : '—'}
                  </FieldValue>
                  <FieldValue label="Secondary Address">
                    {draft.secondAddress || '—'}
                  </FieldValue>
                  <FieldValue label="Criminal Record">
                    {draft.hasCriminalRecord === true
                      ? <span className="text-destructive">Yes{draft.criminalRecordNotes ? ` — ${draft.criminalRecordNotes}` : ''}</span>
                      : draft.hasCriminalRecord === false
                        ? 'No'
                        : '—'}
                  </FieldValue>
                  <FieldValue label="Banking History">
                    {draft.bankingHistory || '—'}
                  </FieldValue>
                  <FieldValue label="PayPal History">
                    {draft.paypalHistory || '—'}
                  </FieldValue>
                  <FieldValue label="Sportsbook History">
                    {draft.sportsbookHistory || '—'}
                  </FieldValue>
                </div>

                {/* Risk Flags */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Risk Flags</p>
                  <div className="space-y-1 text-xs">
                    {[
                      { flag: draft.paypalPreviouslyUsed, label: 'PayPal Previously Used', color: 'bg-warning' },
                      { flag: draft.addressMismatch, label: 'Multiple Addresses', color: 'bg-muted-foreground' },
                      { flag: draft.debankedHistory, label: `De-banked${draft.debankedBank ? ` (${draft.debankedBank})` : ''}`, color: 'bg-destructive' },
                    ].map(({ flag, label, color }) => (
                      <div key={label} className="flex items-center gap-2">
                        <div className={cn('h-2 w-2 rounded-full', flag ? color : 'bg-muted')} />
                        <span className={flag ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 — Platforms */}
            {step === 3 && (
              <div className="space-y-2" data-testid="draft-review-step-3-content">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Platform Registration</p>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_PLATFORMS.map((platform) => {
                    const info = PLATFORM_INFO[platform]
                    const data = platformData?.[platform as string]
                    const hasData = data && (data.username || data.accountId || data.screenshot)

                    return (
                      <div
                        key={platform}
                        className={cn(
                          'rounded border border-border p-2 text-xs',
                          hasData ? 'bg-card' : 'bg-muted/20 opacity-50',
                        )}
                        data-testid={`draft-review-platform-${platform}`}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-medium">{info.name}</span>
                          {hasData ? (
                            <CheckCircle2 className="h-3 w-3 text-success" />
                          ) : (
                            <Minus className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        {hasData && (
                          <div className="space-y-0.5 text-[10px] text-muted-foreground">
                            {data.username && <p>User: {data.username}</p>}
                            {data.accountId && <p>ID: <span className="font-mono">{data.accountId}</span></p>}
                            {data.screenshot && <p className="text-success">Screenshot uploaded</p>}
                          </div>
                        )}
                      </div>
                    )
                  })}
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

                <div className="space-y-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Submission Checklist</p>
                  <div className="space-y-1 text-xs">
                    {[
                      { ok: !!draft.firstName, label: 'First Name' },
                      { ok: !!draft.lastName, label: 'Last Name' },
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

        {/* Footer — step navigation */}
        {draft && !loading && (
          <DialogFooter className="flex-row justify-between sm:justify-between">
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
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleApprove}
                disabled={approving}
                data-testid="draft-review-approve-btn"
              >
                {approving ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Check className="mr-1 h-3 w-3" />
                )}
                Approve Client
              </Button>
            ) : (
              <span className="text-[11px] text-muted-foreground" data-testid="draft-review-pending-submit">
                Awaiting agent submission
              </span>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
