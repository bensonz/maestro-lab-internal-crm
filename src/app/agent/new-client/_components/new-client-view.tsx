'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DraftsPanel } from './drafts-panel'
import { StepIndicator } from './step-indicator'
import { ClientForm } from './client-form'
import { RiskPanel } from './risk-panel'
import { calculateRiskScore } from '@/lib/risk-score'
import type { RiskAssessment, PlatformEntry } from '@/types/backend-types'
import type { GeneratedCredentials } from './client-form'

export interface SerializedPhoneAssignment {
  phoneNumber: string
  signedOutAt: string
  dueBackAt: string
  status: string
}

interface DraftSummary {
  id: string
  firstName: string | null
  lastName: string | null
  step: number
  updatedAt: string
  status: string
  idDocument: string | null
}

export interface SerializedDraft {
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
  livesAtDifferentAddress: boolean
  currentAddress: string | null
  differentAddressDuration: string | null
  differentAddressProof: string | null
  assignedGmail: string | null
  gmailPassword: string | null
  gmailScreenshot: string | null
  betmgmCheckPassed: boolean | null
  betmgmLogin: string | null
  betmgmPassword: string | null
  betmgmRegScreenshot: string | null
  betmgmLoginScreenshot: string | null
  ssnDocument: string | null
  ssnNumber: string | null
  citizenship: string | null
  missingIdType: string | null
  secondAddress: string | null
  secondAddressProof: string | null
  hasCriminalRecord: boolean | null
  criminalRecordNotes: string | null
  bankingHistory: string | null
  paypalHistory: string | null
  paypalSsnLinked: boolean
  paypalBrowserVerified: boolean
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
  deviceReservationDate: string | null
  sportsbookHistory: string | null
  sportsbookUsedBefore: boolean
  sportsbookUsedList: string | null
  sportsbookStatuses: string | null
  platformData: unknown
  generatedCredentials: unknown
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

interface NewClientViewProps {
  initialStep?: number
  drafts: (Omit<DraftSummary, 'updatedAt'> & { updatedAt: string })[]
  selectedDraft: SerializedDraft | null
  activeAssignment: SerializedPhoneAssignment | null
}

export function NewClientView({ initialStep, drafts, selectedDraft, activeAssignment }: NewClientViewProps) {
  const router = useRouter()
  // URL step takes priority (survives refresh), then draft's highest step, then 1
  const [currentStep, setCurrentStep] = useState(initialStep ?? selectedDraft?.step ?? 1)

  // Sync currentStep to URL so it survives hard refreshes
  useEffect(() => {
    const url = new URL(window.location.href)
    const urlStep = url.searchParams.get('step')
    if (urlStep !== String(currentStep)) {
      url.searchParams.set('step', String(currentStep))
      window.history.replaceState({}, '', url.toString())
    }
  }, [currentStep])

  // Risk flags state — fully reconstructed from draft data so nothing is lost on refresh
  const [riskFlags, setRiskFlags] = useState(() => computeAllRiskFlags(selectedDraft))

  const riskAssessment: RiskAssessment = useMemo(
    () => calculateRiskScore(riskFlags),
    [riskFlags],
  )

  const handleRiskFlagsChange = useCallback(
    (flags: Record<string, unknown>) => {
      setRiskFlags((prev) => {
        // Deep-merge credentialMismatches so Step 1 and Step 3 don't overwrite each other
        if (flags.credentialMismatches) {
          const merged = {
            ...prev.credentialMismatches,
            ...(flags.credentialMismatches as Record<string, { username: boolean; password: boolean }>),
          }
          const { credentialMismatches: _, ...rest } = flags
          return { ...prev, ...rest, credentialMismatches: merged }
        }
        return { ...prev, ...flags }
      })
    },
    [],
  )

  const handleDraftSelect = useCallback(
    (draftId: string) => {
      router.push(`/agent/new-client?draft=${draftId}`)
    },
    [router],
  )

  const handleDraftCreated = useCallback(
    (draftId: string) => {
      router.push(`/agent/new-client?draft=${draftId}`)
    },
    [router],
  )

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step)
  }, [])

  // Ref to ClientForm's flush-aware step change handler
  const formStepHandlerRef = useRef<((step: number) => void) | null>(null)

  const handleStepIndicatorClick = useCallback((step: number) => {
    if (formStepHandlerRef.current) {
      // Use the form's handler which flushes auto-save before navigating
      formStepHandlerRef.current(step)
    } else {
      setCurrentStep(step)
    }
  }, [])

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: Drafts Panel */}
      <DraftsPanel
        drafts={drafts}
        selectedDraftId={selectedDraft?.id ?? null}
        onSelect={handleDraftSelect}
        onCreated={handleDraftCreated}
      />

      {/* Center: Form */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="w-full p-6">
          <div className="mx-auto max-w-2xl">
            <StepIndicator currentStep={currentStep} totalSteps={4} onStepChange={handleStepIndicatorClick} />
          </div>

          {selectedDraft ? (
            <ClientForm
              draft={selectedDraft}
              currentStep={currentStep}
              onStepChange={handleStepChange}
              onRiskFlagsChange={handleRiskFlagsChange}
              onRegisterStepHandler={(handler) => { formStepHandlerRef.current = handler }}
              activeAssignment={activeAssignment}
            />
          ) : (
            <div className="mt-12 text-center text-muted-foreground" data-testid="no-draft-selected">
              <p className="text-lg font-medium">No draft selected</p>
              <p className="mt-1 text-sm">
                Create a new draft or select an existing one from the left panel.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Risk Panel */}
      <RiskPanel
        assessment={riskAssessment}
        onFlagsChange={handleRiskFlagsChange}
        draftSelected={!!selectedDraft}
        idExpiryDaysRemaining={riskFlags.idExpiryDaysRemaining}
      />
    </div>
  )
}

/**
 * Reconstruct ALL risk flags from persisted draft data so nothing is lost on refresh.
 */
function computeAllRiskFlags(draft: SerializedDraft | null) {
  const creds = (draft?.generatedCredentials ?? {}) as GeneratedCredentials
  const platforms = (draft?.platformData as PlatformEntry[] | null) ?? []
  const bankEntry = platforms.find((p) => p.platform === 'BANK')

  // ID expiry days remaining
  let idExpiryDaysRemaining: number | null = null
  if (draft?.idExpiry) {
    const expiry = new Date(draft.idExpiry)
    idExpiryDaysRemaining = Math.floor((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  }

  // Bank info flags — mirrors step3-platforms.tsx logic
  let bankPinOverride = false
  let bankNameOverride = false
  let bankPhoneEmailNotConfirmed = false
  if (bankEntry) {
    const pin = bankEntry.pin ?? ''
    const sug4 = bankEntry.pinSuggested ?? ''
    const sug6 = bankEntry.pinSuggested6 ?? ''
    bankPinOverride = pin !== '' && sug4 !== '' && pin !== sug4 && pin !== sug6
    bankNameOverride = !!bankEntry.bankAutoDetected && !!bankEntry.bank && bankEntry.bank !== bankEntry.bankAutoDetected
    const bankTouched = !!(bankEntry.screenshot || bankEntry.username || bankEntry.bank)
    bankPhoneEmailNotConfirmed = bankTouched && !bankEntry.bankPhoneEmailConfirmed
  }

  // Credential mismatches
  const credentialMismatches: Record<string, { username: boolean; password: boolean }> = {}
  if (draft?.assignedGmail || draft?.gmailPassword) {
    credentialMismatches.GMAIL = {
      username: !!(draft.assignedGmail && creds.gmailSuggestion && draft.assignedGmail !== creds.gmailSuggestion),
      password: !!(draft.gmailPassword && creds.gmailPassword && draft.gmailPassword !== creds.gmailPassword),
    }
  }
  if (draft?.betmgmLogin || draft?.betmgmPassword) {
    credentialMismatches.BETMGM = {
      username: !!(draft.betmgmLogin && draft.assignedGmail && draft.betmgmLogin !== draft.assignedGmail),
      password: !!(draft.betmgmPassword && creds.betmgmPassword && draft.betmgmPassword !== creds.betmgmPassword),
    }
  }
  const storedPwds = creds.platformPasswords ?? {}
  for (const p of platforms) {
    if (!p.screenshot) continue
    const suggestedPw = storedPwds[p.platform] ?? ''
    const suggestedUser = p.platform === 'BANK' ? '' : (creds.gmailSuggestion ?? '')
    credentialMismatches[p.platform] = {
      username: !!(suggestedUser && p.username && p.username !== suggestedUser),
      password: !!(suggestedPw && p.accountId && p.accountId !== suggestedPw),
    }
  }

  return {
    idExpiryDaysRemaining,
    paypalPreviouslyUsed: draft?.paypalPreviouslyUsed ?? false,
    multipleAddresses: draft?.addressMismatch ?? false,
    betmgmEmailMismatch: false,
    debankedHistory: draft?.debankedHistory ?? false,
    criminalRecord: draft?.hasCriminalRecord ?? false,
    missingIdCount: (draft?.missingIdType?.split(',').filter(Boolean).length) ?? 0,
    householdAwareness: draft?.householdAwareness ?? '',
    familyTechSupport: draft?.familyTechSupport ?? '',
    financialAutonomy: draft?.financialAutonomy ?? '',
    bankPinOverride,
    bankNameOverride,
    bankPhoneEmailNotConfirmed,
    credentialMismatches,
  }
}
