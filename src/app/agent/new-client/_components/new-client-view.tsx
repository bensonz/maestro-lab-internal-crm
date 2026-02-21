'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { DraftsPanel } from './drafts-panel'
import { StepIndicator } from './step-indicator'
import { ClientForm } from './client-form'
import { RiskPanel } from './risk-panel'
import { calculateRiskScore } from '@/lib/risk-score'
import type { RiskAssessment } from '@/types/backend-types'

interface DraftSummary {
  id: string
  firstName: string | null
  lastName: string | null
  step: number
  updatedAt: string
  status: string
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
  assignedGmail: string | null
  betmgmCheckPassed: boolean | null
  ssnDocument: string | null
  secondAddress: string | null
  hasCriminalRecord: boolean | null
  criminalRecordNotes: string | null
  bankingHistory: string | null
  paypalHistory: string | null
  sportsbookHistory: string | null
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
}

export function NewClientView({ drafts, selectedDraft }: NewClientViewProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(selectedDraft?.step ?? 1)

  // Risk flags state — derived from draft + form data
  const [riskFlags, setRiskFlags] = useState({
    idExpiringSoon: false,
    paypalPreviouslyUsed: selectedDraft?.paypalPreviouslyUsed ?? false,
    addressMismatch: selectedDraft?.addressMismatch ?? false,
    debankedHistory: selectedDraft?.debankedHistory ?? false,
    criminalRecord: selectedDraft?.hasCriminalRecord ?? false,
    undisclosedInfo: selectedDraft?.undisclosedInfo ?? false,
  })

  const riskAssessment: RiskAssessment = useMemo(
    () => calculateRiskScore(riskFlags),
    [riskFlags],
  )

  const handleRiskFlagsChange = useCallback(
    (flags: Partial<typeof riskFlags>) => {
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
        <div className="mx-auto w-full max-w-2xl p-6">
          <StepIndicator currentStep={currentStep} totalSteps={4} />

          {selectedDraft ? (
            <ClientForm
              draft={selectedDraft}
              currentStep={currentStep}
              onStepChange={handleStepChange}
              onRiskFlagsChange={handleRiskFlagsChange}
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
      />
    </div>
  )
}
