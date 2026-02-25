'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DraftsPanel } from './drafts-panel'
import { StepIndicator } from './step-indicator'
import { ClientForm } from './client-form'
import { RiskPanel } from './risk-panel'
import { calculateRiskScore } from '@/lib/risk-score'
import type { RiskAssessment } from '@/types/backend-types'

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
  drafts: (Omit<DraftSummary, 'updatedAt'> & { updatedAt: string })[]
  selectedDraft: SerializedDraft | null
  activeAssignment: SerializedPhoneAssignment | null
}

export function NewClientView({ drafts, selectedDraft, activeAssignment }: NewClientViewProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(selectedDraft?.step ?? 1)

  // Risk flags state — derived from draft + form data
  const [riskFlags, setRiskFlags] = useState({
    idExpiryDaysRemaining: null as number | null,
    paypalPreviouslyUsed: selectedDraft?.paypalPreviouslyUsed ?? false,
    multipleAddresses: selectedDraft?.addressMismatch ?? false,
    betmgmEmailMismatch: false,
    debankedHistory: selectedDraft?.debankedHistory ?? false,
    criminalRecord: selectedDraft?.hasCriminalRecord ?? false,
    missingIdCount: (selectedDraft?.missingIdType?.split(',').filter(Boolean).length) ?? 0,
    householdAwareness: selectedDraft?.householdAwareness ?? '',
    familyTechSupport: selectedDraft?.familyTechSupport ?? '',
    financialAutonomy: selectedDraft?.financialAutonomy ?? '',
  })

  const riskAssessment: RiskAssessment = useMemo(
    () => calculateRiskScore(riskFlags),
    [riskFlags],
  )

  const handleRiskFlagsChange = useCallback(
    (flags: Record<string, unknown>) => {
      setRiskFlags((prev) => ({ ...prev, ...flags }))
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
