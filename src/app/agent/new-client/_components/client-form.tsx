'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Loader2, Smartphone, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { saveClientDraft, submitClientDraft } from '@/app/actions/client-drafts'
import { toast } from 'sonner'
import { Step1PreQual } from './step1-prequal'
import { Step2Background } from './step2-background'
import { Step3Platforms } from './step3-platforms'
import { Step4Contract } from './step4-contract'
import {
  generateGmailSuggestion,
  generateGmailPassword,
  generateBetmgmPassword,
} from './credential-generators'
import type { SerializedDraft, SerializedPhoneAssignment } from './new-client-view'

// ── Platform password generation (random, persisted on first visit) ──────────
const PWD_WORDS = [
  'Swift', 'Cedar', 'Maple', 'Tiger', 'River', 'Storm', 'Blade', 'Frost',
  'Ember', 'Ridge', 'Drake', 'Flare', 'Prism', 'Coral', 'Haven', 'Lunar',
  'Orbit', 'Cobalt', 'Dune', 'Finch', 'Grove', 'Hawk', 'Ivory', 'Jade',
  'Knoll', 'Lance', 'Mesa', 'Nova', 'Onyx', 'Pines',
]
const PWD_SPECIALS = ['!', '@', '#', '$']

function genPwd(): string {
  const word = PWD_WORDS[Math.floor(Math.random() * PWD_WORDS.length)]
  const digits = String(Math.floor(1000 + Math.random() * 9000))
  const special = PWD_SPECIALS[Math.floor(Math.random() * PWD_SPECIALS.length)]
  return `${word}${digits}${special}`
}

function generatePinPair(): { pin4: string; pin6: string } {
  const base = String(Math.floor(1000 + Math.random() * 9000))
  const suffix = String(Math.floor(10 + Math.random() * 90))
  return { pin4: base, pin6: base + suffix }
}

export interface GeneratedCredentials {
  gmailSuggestion?: string
  gmailPassword?: string
  betmgmPassword?: string
  platformPasswords?: Record<string, string>
  bankPin4?: string
  bankPin6?: string
}

/**
 * Ensure Step 3 credentials (platform passwords + bank PINs) exist in the blob.
 * Called once at form init — generates random values only if not already persisted.
 */
function ensureStep3Credentials(existing: GeneratedCredentials | null): GeneratedCredentials {
  const creds = { ...(existing ?? {}) }
  if (!creds.platformPasswords) {
    creds.platformPasswords = {
      sportsbook: genPwd(),
      BETMGM: genPwd(),
      PAYPAL: genPwd(),
      EDGEBOOST: genPwd(),
      BANK: genPwd(),
    }
  }
  if (!creds.bankPin4) {
    const pair = generatePinPair()
    creds.bankPin4 = pair.pin4
    creds.bankPin6 = pair.pin6
  }
  return creds
}

interface ClientFormProps {
  draft: SerializedDraft
  currentStep: number
  onStepChange: (step: number) => void
  onRiskFlagsChange: (flags: Record<string, unknown>) => void
  onRegisterStepHandler?: (handler: (step: number) => void) => void
  activeAssignment: SerializedPhoneAssignment | null
}

export function ClientForm({
  draft,
  currentStep,
  onStepChange,
  onRiskFlagsChange,
  onRegisterStepHandler,
  activeAssignment,
}: ClientFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<Record<string, unknown>>(() =>
    buildFormDataFromDraft(draft),
  )
  const formDataRef = useRef<Record<string, unknown>>(formData)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [submitting, setSubmitting] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>(JSON.stringify(buildFormDataFromDraft(draft)))
  // Track the highest step ever reached so the drafts panel always shows max progress
  const highestStepRef = useRef<number>(draft.step)

  // Device gate: agent must request device, then wait for backoffice to assign
  // Once a device has EVER been assigned (any status), the gate is cleared permanently
  const deviceEverAssigned = !!activeAssignment
  const hasActiveDevice = activeAssignment?.status === 'SIGNED_OUT'
  const deviceRequested = !!(draft.deviceReservationDate)

  // Persist freshly generated credentials immediately on mount (not debounced)
  const credentialsSavedRef = useRef(false)
  useEffect(() => {
    if (credentialsSavedRef.current) return
    const stored = draft.generatedCredentials as GeneratedCredentials | null
    const current = formDataRef.current.generatedCredentials as GeneratedCredentials | null
    // If we generated new credentials (current differs from what was in DB), save immediately
    if (current && JSON.stringify(current) !== JSON.stringify(stored)) {
      credentialsSavedRef.current = true
      saveClientDraft(draft.id, { generatedCredentials: current })
    }
  }, [draft.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset form data when draft changes
  useEffect(() => {
    const newData = buildFormDataFromDraft(draft)
    setFormData(newData)
    formDataRef.current = newData
    lastSavedRef.current = JSON.stringify(newData)
    highestStepRef.current = draft.step
    credentialsSavedRef.current = false
    onStepChange(draft.step)
  }, [draft.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save debounced — always persists the highest step ever reached
  const doSave = useCallback(
    async (data: Record<string, unknown>) => {
      const serialized = JSON.stringify(data)
      if (serialized === lastSavedRef.current) return

      setSaveStatus('saving')
      try {
        const result = await saveClientDraft(draft.id, {
          ...data,
          step: highestStepRef.current,
        })
        if (result.success) {
          lastSavedRef.current = serialized
          setSaveStatus('saved')
        } else {
          setSaveStatus('idle')
        }
      } catch {
        setSaveStatus('idle')
      }
    },
    [draft.id],
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
      formDataRef.current = next
      scheduleAutoSave(next)
      return next
    })
  }

  // Flush save before step change — uses ref to capture latest formData
  async function handleStepChange(newStep: number) {
    if (newStep < 1 || newStep > 4) return
    // Block advancing to step 3+ if device requested but never assigned
    if (newStep >= 3 && deviceRequested && !deviceEverAssigned) {
      toast.error('Waiting for backoffice to assign device')
      return
    }
    // Track highest step ever reached (going back doesn't lower it)
    highestStepRef.current = Math.max(highestStepRef.current, newStep)
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    await doSave({ ...formDataRef.current, step: newStep })
    onStepChange(newStep)
    router.refresh()
  }

  // Request device — saves reservation date, stays on step 2 (does NOT advance)
  async function handleRequestDevice() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    await doSave(formDataRef.current)
    toast.success('Device requested — waiting for backoffice to assign')
    router.refresh()
  }

  // Expose handleStepChange to parent (for step indicator clicks)
  useEffect(() => {
    onRegisterStepHandler?.(handleStepChange)
  }) // re-register on every render so it captures latest formData

  async function handleSubmit() {
    // Flush save first — use ref to capture latest formData
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    await doSave(formDataRef.current)

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
      {/* Save status indicator — always visible */}
      <div className="mb-4 flex h-4 items-center justify-end text-xs text-muted-foreground">
        {saveStatus === 'saving' ? (
          <span className="flex items-center gap-1" data-testid="save-status-saving">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </span>
        ) : (
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
        <Step3Platforms formData={formData} onChange={handleFieldChange} onRiskFlagsChange={onRiskFlagsChange} activeAssignment={activeAssignment} />
      )}
      {currentStep === 4 && (
        <Step4Contract formData={formData} onChange={handleFieldChange} />
      )}

      {/* Device Reservation — only on Step 2 */}
      {currentStep === 2 && (
        <div className="mt-8 rounded-md border border-amber-500/30 bg-amber-500/5 p-4 space-y-3" data-testid="device-reservation-section">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Device Reservation Required</p>
              <p className="text-xs text-muted-foreground">
                Once the device is issued, the client has <span className="font-semibold text-foreground">less than 3 days</span> to complete all platform registrations and return the device. Please confirm a reservation date before proceeding.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="deviceReservationConfirmed"
                checked={!!(formData.deviceReservationDate as string)}
                onCheckedChange={(checked) => {
                  if (!checked) {
                    handleFieldChange('deviceReservationDate', '')
                  }
                }}
                data-testid="device-reservation-confirmed"
              />
              <label htmlFor="deviceReservationConfirmed" className="text-sm">
                Reservation confirmed
              </label>
            </div>
            <Input
              type="date"
              value={(formData.deviceReservationDate as string) || ''}
              onChange={(e) => handleFieldChange('deviceReservationDate', e.target.value)}
              className="w-44 h-8 text-sm"
              min={new Date().toISOString().split('T')[0]}
              data-testid="device-reservation-date"
            />
          </div>
        </div>
      )}

      {/* Waiting for device — shown on Step 2 after requesting, before first assignment */}
      {currentStep === 2 && !!(formData.deviceReservationDate as string) && deviceRequested && !deviceEverAssigned && (
        <div className="mt-6 rounded-md border border-primary/30 bg-primary/5 p-4 flex items-start gap-2" data-testid="waiting-for-device">
          <Loader2 className="h-4 w-4 text-primary mt-0.5 shrink-0 animate-spin" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Device Requested</p>
            <p className="text-xs text-muted-foreground">
              Waiting for backoffice to assign a device. You will be able to proceed to Step 3 once the device is issued.
            </p>
          </div>
        </div>
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
          currentStep === 2 ? (
            deviceEverAssigned ? (
              <Button
                size="sm"
                onClick={() => handleStepChange(currentStep + 1)}
                data-testid="next-step-button"
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : deviceRequested ? (
              <Button
                size="sm"
                disabled
                data-testid="next-step-button"
              >
                <Smartphone className="mr-1.5 h-4 w-4" />
                Awaiting Device...
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleRequestDevice}
                disabled={!(formData.deviceReservationDate as string)}
                data-testid="next-step-button"
              >
                <Smartphone className="mr-1.5 h-4 w-4" />
                Request for Device
              </Button>
            )
          ) : (
            <Button
              size="sm"
              onClick={() => handleStepChange(currentStep + 1)}
              data-testid="next-step-button"
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )
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
  // Eagerly ensure Step 3 credentials exist (generate once, persist forever).
  // Step 1 credentials are added later when name+DOB become available.
  const storedCreds = (draft.generatedCredentials ?? null) as GeneratedCredentials | null
  const creds = ensureStep3Credentials(storedCreds)

  // Also backfill Step 1 credentials if name+DOB are already available
  const firstName = draft.firstName ?? ''
  const lastName = draft.lastName ?? ''
  const dob = draft.dateOfBirth ?? ''
  if (firstName && lastName && !creds.gmailSuggestion) {
    creds.gmailSuggestion = generateGmailSuggestion(firstName, lastName, dob)
    creds.gmailPassword = generateGmailPassword(firstName, lastName, dob)
    creds.betmgmPassword = generateBetmgmPassword(firstName, lastName, dob)
  }

  return {
    firstName,
    lastName,
    email: draft.email ?? '',
    phone: draft.phone ?? '',
    idDocument: draft.idDocument ?? '',
    idNumber: draft.idNumber ?? '',
    idExpiry: draft.idExpiry ?? '',
    dateOfBirth: dob,
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
    ssnNumber: draft.ssnNumber ?? '',
    citizenship: draft.citizenship ?? '',
    missingIdType: draft.missingIdType ?? '',
    secondAddress: draft.secondAddress ?? '',
    secondAddressProof: draft.secondAddressProof ?? '',
    hasCriminalRecord: draft.hasCriminalRecord ?? false,
    criminalRecordNotes: draft.criminalRecordNotes ?? '',
    bankingHistory: draft.bankingHistory ?? '',
    paypalHistory: draft.paypalHistory ?? '',
    paypalSsnLinked: draft.paypalSsnLinked ?? false,
    paypalBrowserVerified: draft.paypalBrowserVerified ?? false,
    occupation: draft.occupation ?? '',
    annualIncome: draft.annualIncome ?? '',
    employmentStatus: draft.employmentStatus ?? '',
    maritalStatus: draft.maritalStatus ?? '',
    creditScoreRange: draft.creditScoreRange ?? '',
    dependents: draft.dependents ?? '',
    educationLevel: draft.educationLevel ?? '',
    householdAwareness: draft.householdAwareness ?? '',
    familyTechSupport: draft.familyTechSupport ?? '',
    financialAutonomy: draft.financialAutonomy ?? '',
    digitalComfort: draft.digitalComfort ?? '',
    deviceReservationDate: draft.deviceReservationDate ?? '',
    sportsbookHistory: draft.sportsbookHistory ?? '',
    sportsbookUsedBefore: draft.sportsbookUsedBefore ?? false,
    sportsbookUsedList: draft.sportsbookUsedList ?? '',
    sportsbookStatuses: draft.sportsbookStatuses ?? '',
    platformData: draft.platformData ?? [],
    generatedCredentials: creds,
    contractDocument: draft.contractDocument ?? '',
    paypalPreviouslyUsed: draft.paypalPreviouslyUsed,
    addressMismatch: draft.addressMismatch,
    debankedHistory: draft.debankedHistory,
    debankedBank: draft.debankedBank ?? '',
    undisclosedInfo: draft.undisclosedInfo,
  }
}
