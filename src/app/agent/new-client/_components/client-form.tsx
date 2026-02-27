'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { saveClientDraft, submitClientDraft } from '@/app/actions/client-drafts'
import { toast } from 'sonner'
import { Step1PreQual } from './step1-prequal'
import { Step2Background } from './step2-background'
import { Step3Platforms } from './step3-platforms'
import { Step4Contract } from './step4-contract'
import type { SerializedDraft } from './new-client-view'

interface ClientFormProps {
  draft: SerializedDraft
  currentStep: number
  onStepChange: (step: number) => void
  onRiskFlagsChange: (flags: Record<string, unknown>) => void
  onRegisterStepHandler?: (handler: (step: number) => void) => void
}

export function ClientForm({
  draft,
  currentStep,
  onStepChange,
  onRiskFlagsChange,
  onRegisterStepHandler,
}: ClientFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<Record<string, unknown>>(() =>
    buildFormDataFromDraft(draft),
  )
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [submitting, setSubmitting] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>(JSON.stringify(buildFormDataFromDraft(draft)))

  // Reset form data when draft changes
  useEffect(() => {
    const newData = buildFormDataFromDraft(draft)
    setFormData(newData)
    lastSavedRef.current = JSON.stringify(newData)
    onStepChange(draft.step)
  }, [draft.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save debounced
  // Track consecutive save failures for throttled error feedback
  const saveFailCountRef = useRef(0)

  const doSave = useCallback(
    async (data: Record<string, unknown>) => {
      const serialized = JSON.stringify(data)
      if (serialized === lastSavedRef.current) return

      setSaveStatus('saving')
      try {
        const result = await saveClientDraft(draft.id, {
          ...data,
          step: currentStep,
        })
        if (result.success) {
          lastSavedRef.current = serialized
          setSaveStatus('saved')
          saveFailCountRef.current = 0
        } else {
          setSaveStatus('idle')
          saveFailCountRef.current++
          // Show toast on first failure and every 5th consecutive failure
          if (saveFailCountRef.current === 1 || saveFailCountRef.current % 5 === 0) {
            toast.error(result.error ?? 'Failed to save draft')
          }
        }
      } catch {
        setSaveStatus('idle')
        saveFailCountRef.current++
        if (saveFailCountRef.current === 1 || saveFailCountRef.current % 5 === 0) {
          toast.error('Failed to save draft — check your connection')
        }
      }
    },
    [draft.id, currentStep],
  )

  const scheduleAutoSave = useCallback(
    (data: Record<string, unknown>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => doSave(data), 500)
    },
    [doSave],
  )

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  function handleFieldChange(field: string, value: unknown) {
    setFormData((prev) => {
      const next = { ...prev, [field]: value }
      scheduleAutoSave(next)
      return next
    })
  }

  // Flush save before step change
  async function handleStepChange(newStep: number) {
    if (newStep < 1 || newStep > 4) return
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    await doSave({ ...formData, step: newStep })
    onStepChange(newStep)
  }

  // Expose handleStepChange to parent (for step indicator clicks)
  useEffect(() => {
    onRegisterStepHandler?.(handleStepChange)
  }) // re-register on every render so it captures latest formData

  async function handleSubmit() {
    // Flush save first
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    await doSave(formData)

    setSubmitting(true)
    try {
      const result = await submitClientDraft(draft.id)
      if (result.success) {
        toast.success('Client submitted successfully')
        router.push('/agent/clients')
      } else {
        toast.error(result.error ?? 'Failed to submit')
      }
    } catch {
      toast.error('Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div data-testid="client-form">
      {/* Save status indicator */}
      <div className="mb-4 flex items-center justify-end text-xs text-muted-foreground">
        {saveStatus === 'saving' && (
          <span className="flex items-center gap-1" data-testid="save-status-saving">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </span>
        )}
        {saveStatus === 'saved' && (
          <span data-testid="save-status-saved">Saved</span>
        )}
      </div>

      {/* Step content */}
      {currentStep === 1 && (
        <Step1PreQual
          formData={formData}
          onChange={handleFieldChange}
          onRiskFlagsChange={onRiskFlagsChange}
        />
      )}
      {currentStep === 2 && (
        <Step2Background
          formData={formData}
          onChange={handleFieldChange}
          onRiskFlagsChange={onRiskFlagsChange}
        />
      )}
      {currentStep === 3 && (
        <Step3Platforms formData={formData} onChange={handleFieldChange} />
      )}
      {currentStep === 4 && (
        <Step4Contract formData={formData} onChange={handleFieldChange} />
      )}

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleStepChange(currentStep - 1)}
          disabled={currentStep === 1}
          data-testid="prev-step-button"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous
        </Button>

        {currentStep < 4 ? (
          <Button
            size="sm"
            onClick={() => handleStepChange(currentStep + 1)}
            data-testid="next-step-button"
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting}
            data-testid="submit-draft-button"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Client'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

function buildFormDataFromDraft(draft: SerializedDraft): Record<string, unknown> {
  return {
    firstName: draft.firstName ?? '',
    lastName: draft.lastName ?? '',
    email: draft.email ?? '',
    phone: draft.phone ?? '',
    idDocument: draft.idDocument ?? '',
    idNumber: draft.idNumber ?? '',
    idExpiry: draft.idExpiry ?? '',
    dateOfBirth: draft.dateOfBirth ?? '',
    address: draft.address ?? '',
    livesAtDifferentAddress: draft.livesAtDifferentAddress ?? false,
    currentAddress: draft.currentAddress ?? '',
    differentAddressDuration: draft.differentAddressDuration ?? '',
    differentAddressProof: draft.differentAddressProof ?? '',
    assignedGmail: draft.assignedGmail ?? '',
    gmailPassword: draft.gmailPassword ?? '',
    gmailScreenshot: draft.gmailScreenshot ?? '',
    betmgmCheckPassed: draft.betmgmCheckPassed ?? false,
    betmgmLogin: draft.betmgmLogin ?? '',
    betmgmPassword: draft.betmgmPassword ?? '',
    betmgmRegScreenshot: draft.betmgmRegScreenshot ?? '',
    betmgmLoginScreenshot: draft.betmgmLoginScreenshot ?? '',
    ssnDocument: draft.ssnDocument ?? '',
    secondAddress: draft.secondAddress ?? '',
    hasCriminalRecord: draft.hasCriminalRecord ?? false,
    criminalRecordNotes: draft.criminalRecordNotes ?? '',
    bankingHistory: draft.bankingHistory ?? '',
    paypalHistory: draft.paypalHistory ?? '',
    sportsbookHistory: draft.sportsbookHistory ?? '',
    platformData: draft.platformData ?? [],
    contractDocument: draft.contractDocument ?? '',
    paypalPreviouslyUsed: draft.paypalPreviouslyUsed,
    addressMismatch: draft.addressMismatch,
    debankedHistory: draft.debankedHistory,
    debankedBank: draft.debankedBank ?? '',
    undisclosedInfo: draft.undisclosedInfo,
  }
}
