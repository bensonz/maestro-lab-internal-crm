'use client'

import {
  useActionState,
  useState,
  useCallback,
  useEffect,
  useRef,
  useTransition,
} from 'react'
import { useRouter } from 'next/navigation'
import { createClient, ActionState } from '@/app/actions/clients'
import {
  submitPrequalification,
  PrequalActionState,
} from '@/app/actions/prequal'
import { checkBetmgmStatus } from '@/app/actions/betmgm-verification'
import { saveDraft } from '@/app/actions/drafts'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { StatusHeader } from './status-header'
import { StepCard } from './step-card'
import { DecisionPanel } from './decision-panel'
import { IdUploadSection } from './id-upload-section'
import { BasicInfoSection } from './basic-info-section'
import { AddressSection } from './address-section'
import { ComplianceGroups } from './compliance-groups'
import { PhaseHeader } from './phase-header'
import { PrequalSection } from './prequal-section'
import { PhaseGate } from './phase-gate'

type StepStatus = 'complete' | 'pending' | 'blocked' | 'not-started'

interface AgeFlag {
  message: string
  severity: 'high-risk' | 'review'
}

interface ExtractedIdData {
  firstName: string
  middleName?: string
  lastName: string
  dateOfBirth: string
  address?: string
  city?: string
  state?: string
  zip?: string
  idExpiry?: string
}

interface ComplianceData {
  hasCriminalRecord: string
  hasBankingHistory: string
  criminalDetails?: string
  idType: string
  hasAddressProof: string
  idNotes?: string
  hasPayPal: string
  hasBettingHistory: string
  bettingDetails?: string
  riskLevel: string
  authorizationNotes?: string
}

interface ClientSourceData {
  introducedBy: string
  howMet: string
  profession: string
  isReliable: string
  previouslyFlagged: string
  additionalNotes: string
}

const initialState: ActionState = {}
const initialPrequalState: PrequalActionState = {}

interface ClientData {
  id: string
  firstName: string
  lastName: string
  gmailAccount?: string | null
  gmailPassword?: string | null
  prequalCompleted: boolean
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  questionnaire?: string | null
}

interface ClientFormProps {
  initialData?: Record<string, string> | null
  draftId?: string
  clientData?: ClientData | null
  betmgmStatus?: string
}

export function ClientForm({
  initialData,
  draftId,
  clientData,
  betmgmStatus: initialBetmgmStatus,
}: ClientFormProps) {
  const router = useRouter()
  const [phase2State, phase2FormAction] = useActionState(
    createClient,
    initialState,
  )
  const [prequalState, prequalFormAction] = useActionState(
    submitPrequalification,
    initialPrequalState,
  )
  const [isSavingDraft, startDraftTransition] = useTransition()

  // Phase state
  const prequalSubmitted = clientData?.prequalCompleted ?? false
  const [betmgmVerified, setBetmgmVerified] = useState(
    initialBetmgmStatus === 'VERIFIED',
  )
  const [betmgmStatus, setBetmgmStatus] = useState(
    initialBetmgmStatus ?? 'NOT_STARTED',
  )
  const currentPhase: 1 | 2 =
    prequalSubmitted && betmgmVerified ? 2 : 1

  // Parse questionnaire from initialData or clientData
  const parsedQuestionnaire = (() => {
    const raw =
      initialData?.questionnaire ?? clientData?.questionnaire
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  })()

  // ID verification state
  const [isIdConfirmed, setIsIdConfirmed] = useState(
    parsedQuestionnaire?.idVerified ?? false,
  )
  const [idUploaded, setIdUploaded] = useState(
    !!(initialData?.firstName || clientData?.firstName),
  )
  const [extractedData, setExtractedData] = useState<ExtractedIdData | null>(
    (() => {
      if (clientData) {
        return {
          firstName: clientData.firstName ?? '',
          lastName: clientData.lastName ?? '',
          middleName: parsedQuestionnaire?.middleName,
          dateOfBirth: parsedQuestionnaire?.dateOfBirth ?? '',
          address: clientData.address ?? undefined,
          city: clientData.city ?? undefined,
          state: clientData.state ?? undefined,
          zip: clientData.zipCode ?? undefined,
          idExpiry: parsedQuestionnaire?.idExpiry,
        }
      }
      if (initialData) {
        return {
          firstName: initialData.firstName ?? '',
          lastName: initialData.lastName ?? '',
          middleName: initialData.middleName,
          dateOfBirth:
            initialData.dateOfBirth ?? parsedQuestionnaire?.dateOfBirth ?? '',
          address: initialData.primaryAddress,
          city: initialData.primaryCity,
          state: initialData.primaryState,
          zip: initialData.primaryZip,
          idExpiry: initialData.idExpiry ?? parsedQuestionnaire?.idExpiry,
        }
      }
      return null
    })(),
  )
  const [overriddenFields, setOverriddenFields] = useState<string[]>([])

  // Compliance data state
  const [complianceData, setComplianceData] = useState<ComplianceData>({
    hasCriminalRecord:
      parsedQuestionnaire?.compliance?.hasCriminalRecord ?? '',
    hasBankingHistory:
      parsedQuestionnaire?.compliance?.hasBankingHistory ?? '',
    criminalDetails: parsedQuestionnaire?.compliance?.criminalDetails,
    idType: parsedQuestionnaire?.compliance?.idType ?? '',
    hasAddressProof: parsedQuestionnaire?.compliance?.hasAddressProof ?? '',
    idNotes: parsedQuestionnaire?.compliance?.idNotes,
    hasPayPal: parsedQuestionnaire?.compliance?.hasPayPal ?? '',
    hasBettingHistory:
      parsedQuestionnaire?.compliance?.hasBettingHistory ?? '',
    bettingDetails: parsedQuestionnaire?.compliance?.bettingDetails,
    riskLevel: parsedQuestionnaire?.compliance?.riskLevel ?? '',
    authorizationNotes:
      parsedQuestionnaire?.compliance?.authorizationNotes,
  })

  // Client source data state
  const [clientSourceData, setClientSourceData] = useState<ClientSourceData>({
    introducedBy: parsedQuestionnaire?.clientSource?.introducedBy ?? '',
    howMet: parsedQuestionnaire?.clientSource?.howMet ?? '',
    profession: parsedQuestionnaire?.clientSource?.profession ?? '',
    isReliable: parsedQuestionnaire?.clientSource?.isReliable ?? '',
    previouslyFlagged:
      parsedQuestionnaire?.clientSource?.previouslyFlagged ?? '',
    additionalNotes:
      parsedQuestionnaire?.clientSource?.additionalNotes ?? '',
  })

  // Agent confirmation state
  const [agentConfirms, setAgentConfirms] = useState(false)

  // Decision panel state
  const [decisionPanelOpen, setDecisionPanelOpen] = useState(false)

  // Age flag state
  const [ageFlag, setAgeFlag] = useState<AgeFlag | null>(null)

  // Form refs
  const phase1FormRef = useRef<HTMLFormElement>(null)
  const phase2FormRef = useRef<HTMLFormElement>(null)

  // BetMGM polling — poll every 15s when prequal submitted but not yet verified
  useEffect(() => {
    if (!prequalSubmitted || betmgmVerified || !clientData?.id) return

    const interval = setInterval(async () => {
      const result = await checkBetmgmStatus(clientData.id)
      setBetmgmStatus(result.status)
      if (result.verified) {
        setBetmgmVerified(true)
        toast.success('BetMGM account verified! Phase 2 is now unlocked.')
        clearInterval(interval)
      }
    }, 15000)

    return () => clearInterval(interval)
  }, [prequalSubmitted, betmgmVerified, clientData?.id])

  // Age compliance check
  useEffect(() => {
    const dob = extractedData?.dateOfBirth
    if (dob) {
      const birthDate = new Date(dob)
      const today = new Date()
      const age = Math.floor(
        (today.getTime() - birthDate.getTime()) /
          (365.25 * 24 * 60 * 60 * 1000),
      )

      const twentyFirstBirthday = new Date(birthDate)
      twentyFirstBirthday.setFullYear(twentyFirstBirthday.getFullYear() + 21)

      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

      if (age < 21) {
        setAgeFlag({
          message: 'HIGH-RISK: Client is under 21 — not eligible',
          severity: 'high-risk',
        })
      } else if (
        twentyFirstBirthday >= sixtyDaysAgo &&
        twentyFirstBirthday <= today
      ) {
        setAgeFlag({
          message: 'REVIEW: Client turned 21 within last 30–60 days',
          severity: 'review',
        })
      } else if (age >= 75) {
        setAgeFlag({
          message: 'REVIEW: Client is 75+ — compliance notes required',
          severity: 'review',
        })
      } else {
        setAgeFlag(null)
      }
    } else {
      setAgeFlag(null)
    }
  }, [extractedData?.dateOfBirth])

  // Handle Phase 1 submit result — redirect to ?client=
  useEffect(() => {
    if (prequalState.clientId) {
      toast.success('Phase 1 submitted! Awaiting BetMGM verification.')
      router.push(`/agent/new-client?client=${prequalState.clientId}`)
    }
    if (prequalState.message) {
      toast.error(prequalState.message)
    } else if (prequalState.errors && Object.keys(prequalState.errors).length > 0) {
      const errorCount = Object.keys(prequalState.errors).length
      toast.error(
        `Please fix ${errorCount} validation error${errorCount > 1 ? 's' : ''}`,
      )
    }
  }, [prequalState, router])

  // Show toast on Phase 2 validation errors
  useEffect(() => {
    if (phase2State.message) {
      toast.error(phase2State.message)
    } else if (
      phase2State.errors &&
      Object.keys(phase2State.errors).length > 0
    ) {
      const errorCount = Object.keys(phase2State.errors).length
      toast.error(
        `Please fix ${errorCount} validation error${errorCount > 1 ? 's' : ''}`,
      )
    }
  }, [phase2State])

  // Handle save draft
  const handleSaveDraft = useCallback(() => {
    const formRef = currentPhase === 1 ? phase1FormRef : phase2FormRef
    if (!formRef.current) return

    const formData = new FormData(formRef.current)
    if (draftId) {
      formData.set('draftId', draftId)
    }
    if (clientData?.id) {
      formData.set('clientId', clientData.id)
    }
    formData.set('phase', String(currentPhase))

    startDraftTransition(async () => {
      const result = await saveDraft({}, formData)
      if (result.success) {
        toast.success(result.message || 'Draft saved successfully')
      } else {
        toast.error(result.message || 'Failed to save draft')
      }
    })
  }, [draftId, currentPhase, clientData?.id])

  // Handlers
  const handleIdDataExtracted = useCallback((data: ExtractedIdData) => {
    setExtractedData(data)
    setIdUploaded(true)
  }, [])

  const handleIdConfirm = useCallback(() => {
    setIsIdConfirmed(true)
  }, [])

  const handleComplianceChange = useCallback((data: ComplianceData) => {
    setComplianceData(data)
  }, [])

  const handleClientSourceFieldChange = useCallback(
    (field: keyof ClientSourceData, value: string) => {
      setClientSourceData((prev) => {
        const updated = { ...prev, [field]: value }
        return updated
      })
    },
    [],
  )

  // Step status computation
  const computePhase1Steps = (): {
    status: StepStatus
    missingItems: string[]
  }[] => {
    const hasGmail =
      !!(initialData?.gmailAccount || clientData?.gmailAccount)
    const hasPassword =
      !!(initialData?.gmailPassword || clientData?.gmailPassword)

    const step1Status: StepStatus =
      isIdConfirmed && hasGmail && hasPassword
        ? 'complete'
        : isIdConfirmed || idUploaded
          ? 'pending'
          : 'not-started'

    const step1Missing: string[] = []
    if (!idUploaded) step1Missing.push('Upload ID')
    else if (!isIdConfirmed) step1Missing.push('Confirm ID data')
    if (!hasGmail) step1Missing.push('Gmail account')
    if (!hasPassword) step1Missing.push('Gmail password')

    return [{ status: step1Status, missingItems: step1Missing }]
  }

  const computePhase2Steps = (): {
    status: StepStatus
    missingItems: string[]
  }[] => {
    // Step 2: Basic Info
    const hasName = extractedData?.firstName && extractedData?.lastName
    const step2Status: StepStatus =
      ageFlag?.severity === 'high-risk'
        ? 'blocked'
        : hasName && extractedData?.dateOfBirth
          ? 'complete'
          : 'pending'
    const step2Missing: string[] = []
    if (!hasName) step2Missing.push('Name required')
    if (!extractedData?.dateOfBirth) step2Missing.push('DOB required')
    if (ageFlag?.severity === 'high-risk') step2Missing.push('Under 21')

    // Step 3: Address
    const hasPrimary =
      extractedData?.address &&
      extractedData?.city &&
      extractedData?.state &&
      extractedData?.zip
    const step3Status: StepStatus = hasPrimary ? 'complete' : 'pending'
    const step3Missing: string[] = []
    if (!hasPrimary) step3Missing.push('Primary address required')

    // Step 4: Compliance
    const hasRecord = complianceData.hasCriminalRecord !== ''
    const hasId = complianceData.idType !== ''
    const hasPayPal = complianceData.hasPayPal !== ''
    const hasBetting = complianceData.hasBettingHistory !== ''
    const step4Status: StepStatus =
      complianceData.hasCriminalRecord === 'yes'
        ? 'blocked'
        : hasRecord && hasId && hasPayPal && hasBetting
          ? 'complete'
          : 'pending'
    const step4Missing: string[] = []
    if (!hasRecord) step4Missing.push('Criminal record')
    if (!hasId) step4Missing.push('ID type')
    if (!hasPayPal) step4Missing.push('PayPal status')
    if (!hasBetting) step4Missing.push('Betting history')
    if (complianceData.hasCriminalRecord === 'yes')
      step4Missing.push('Criminal record blocks submission')

    return [
      { status: step2Status, missingItems: step2Missing },
      { status: step3Status, missingItems: step3Missing },
      { status: step4Status, missingItems: step4Missing },
    ]
  }

  const phase1Steps = computePhase1Steps()
  const phase2Steps = computePhase2Steps()
  const allSteps = [...phase1Steps, ...phase2Steps]
  const activeSteps = currentPhase === 1 ? phase1Steps : phase2Steps

  // Overall status
  const getOverallStatus = () => {
    if (prequalSubmitted && !betmgmVerified) return 'Awaiting Verification'
    if (activeSteps.some((s) => s.status === 'blocked')) return 'Blocked'
    const completed = activeSteps.filter(
      (s) => s.status === 'complete',
    ).length
    if (completed === activeSteps.length) return 'Ready for Review'
    if (completed > 0) return 'In Progress'
    return 'Pending ID'
  }

  const getRiskLevel = (): 'low' | 'medium' | 'high' => {
    if (
      ageFlag?.severity === 'high-risk' ||
      complianceData.hasCriminalRecord === 'yes'
    )
      return 'high'
    if (
      ageFlag ||
      complianceData.hasCriminalRecord === 'prefer-not' ||
      overriddenFields.length > 0
    )
      return 'medium'
    return 'low'
  }

  // Combine all questionnaire data into JSON
  const questionnaireJson = JSON.stringify({
    compliance: complianceData,
    clientSource: clientSourceData,
    idVerified: isIdConfirmed,
    dateOfBirth: extractedData?.dateOfBirth,
    idExpiry: extractedData?.idExpiry,
  })

  // Submit handler
  const handleSubmit = () => {
    if (currentPhase === 1 && !prequalSubmitted) {
      phase1FormRef.current?.requestSubmit()
    } else if (currentPhase === 2) {
      phase2FormRef.current?.requestSubmit()
    }
  }

  // Phase 1 submit disabled
  const phase1SubmitDisabled = !isIdConfirmed
  // Phase 2 submit disabled
  const phase2SubmitDisabled = !agentConfirms

  // ID expiration check for Phase 1 blocking
  const idExpiryDate = extractedData?.idExpiry
  const isIdExpired =
    idExpiryDate &&
    Math.floor(
      (new Date(idExpiryDate).getTime() - Date.now()) / 86400000,
    ) <= 0

  return (
    <div className="relative h-full">
      <div className="h-full overflow-y-auto">
      {/* Sticky Status Header */}
      <StatusHeader
        clientName={
          extractedData?.firstName && extractedData?.lastName
            ? `${extractedData.firstName} ${extractedData.lastName}`
            : ''
        }
        overallStatus={getOverallStatus()}
        riskLevel={getRiskLevel()}
        lastAction={
          prequalSubmitted && !betmgmVerified
            ? 'Awaiting BetMGM verification'
            : isIdConfirmed
              ? 'ID confirmed'
              : idUploaded
                ? 'ID uploaded'
                : 'No actions yet'
        }
        steps={allSteps}
        onSubmit={handleSubmit}
        submitDisabled={
          currentPhase === 1
            ? phase1SubmitDisabled || !!isIdExpired
            : phase2SubmitDisabled
        }
        onSaveDraft={handleSaveDraft}
        isSaving={isSavingDraft}
        phase={currentPhase}
        betmgmVerified={betmgmVerified}
        prequalSubmitted={prequalSubmitted}
      />

      {/* Main Content */}
      <div>
        <div className="mx-auto max-w-3xl space-y-4 px-6 py-6">
          {/* ═══════════════════════════════════════════ */}
          {/* PHASE 1: Pre-qualification                 */}
          {/* ═══════════════════════════════════════════ */}
          <PhaseHeader
            phase={1}
            title="Pre-qualification"
            active={currentPhase === 1}
          />

          <form ref={phase1FormRef} action={prequalFormAction}>
            {/* Hidden fields for Phase 1 */}
            {extractedData && (
              <>
                <input
                  type="hidden"
                  name="firstName"
                  value={extractedData.firstName}
                />
                <input
                  type="hidden"
                  name="lastName"
                  value={extractedData.lastName}
                />
                {extractedData.middleName && (
                  <input
                    type="hidden"
                    name="middleName"
                    value={extractedData.middleName}
                  />
                )}
                {extractedData.dateOfBirth && (
                  <input
                    type="hidden"
                    name="dateOfBirth"
                    value={extractedData.dateOfBirth}
                  />
                )}
                {extractedData.idExpiry && (
                  <input
                    type="hidden"
                    name="idExpiry"
                    value={extractedData.idExpiry}
                  />
                )}
              </>
            )}
            <input
              type="hidden"
              name="agentConfirmsId"
              value={isIdConfirmed ? 'true' : 'false'}
            />
            {draftId && (
              <input type="hidden" name="draftId" value={draftId} />
            )}

            <StepCard
              stepNumber={1}
              title="Identity & Pre-qualification"
              status={phase1Steps[0].status}
              missingItems={phase1Steps[0].missingItems}
              defaultOpen={!prequalSubmitted}
              onReview={() => setDecisionPanelOpen(true)}
              locked={false}
            >
              <div className="space-y-6">
                <IdUploadSection
                  onDataExtracted={handleIdDataExtracted}
                  onConfirm={handleIdConfirm}
                  isConfirmed={isIdConfirmed}
                />

                <PrequalSection
                  betmgmStatus={betmgmStatus}
                  betmgmVerified={betmgmVerified}
                  defaultGmail={
                    clientData?.gmailAccount ?? initialData?.gmailAccount ?? undefined
                  }
                  defaultPassword={
                    clientData?.gmailPassword ??
                    initialData?.gmailPassword ??
                    undefined
                  }
                  clientId={clientData?.id}
                  errors={prequalState.errors}
                  disabled={prequalSubmitted}
                />
              </div>
            </StepCard>
          </form>

          {/* ═══════════════════════════════════════════ */}
          {/* PHASE GATE                                  */}
          {/* ═══════════════════════════════════════════ */}
          <PhaseGate unlocked={betmgmVerified} />

          {/* ═══════════════════════════════════════════ */}
          {/* PHASE 2: Full Application                  */}
          {/* ═══════════════════════════════════════════ */}
          <PhaseHeader
            phase={2}
            title="Full Application"
            active={currentPhase === 2}
          />

          <form ref={phase2FormRef} action={phase2FormAction}>
            {/* Hidden fields for Phase 2 */}
            <input
              type="hidden"
              name="questionnaire"
              value={questionnaireJson}
            />
            <input
              type="hidden"
              name="agentConfirmsSuitable"
              value={agentConfirms ? 'true' : 'false'}
            />
            {clientData?.id && (
              <input
                type="hidden"
                name="clientId"
                value={clientData.id}
              />
            )}
            {draftId && (
              <input type="hidden" name="draftId" value={draftId} />
            )}

            <div className="space-y-4">
              {/* Step 2: Basic Info */}
              <StepCard
                stepNumber={2}
                title="Basic Information"
                status={phase2Steps[0].status}
                missingItems={phase2Steps[0].missingItems}
                defaultOpen={
                  betmgmVerified &&
                  phase2Steps[0].status !== 'complete'
                }
                onReview={() => setDecisionPanelOpen(true)}
                locked={!betmgmVerified}
              >
                <BasicInfoSection
                  isIdConfirmed={isIdConfirmed}
                  errors={phase2State.errors}
                  defaultValues={{
                    firstName:
                      extractedData?.firstName ??
                      clientData?.firstName ??
                      initialData?.firstName,
                    middleName:
                      extractedData?.middleName ??
                      initialData?.middleName,
                    lastName:
                      extractedData?.lastName ??
                      clientData?.lastName ??
                      initialData?.lastName,
                    dateOfBirth:
                      extractedData?.dateOfBirth ??
                      initialData?.dateOfBirth,
                    phone:
                      clientData?.phone ?? initialData?.phone,
                    email:
                      clientData?.email ?? initialData?.email,
                  }}
                />
                {ageFlag && (
                  <div
                    className={cn(
                      'mt-3 rounded-lg border p-3 text-sm',
                      ageFlag.severity === 'high-risk'
                        ? 'border-destructive/30 bg-destructive/10 text-destructive'
                        : 'border-warning/30 bg-warning/10 text-warning',
                    )}
                  >
                    {ageFlag.message}
                  </div>
                )}
              </StepCard>

              {/* Step 3: Address */}
              <StepCard
                stepNumber={3}
                title="Address Information"
                status={phase2Steps[1].status}
                missingItems={phase2Steps[1].missingItems}
                defaultOpen={
                  betmgmVerified &&
                  phase2Steps[0].status === 'complete' &&
                  phase2Steps[1].status !== 'complete'
                }
                onReview={() => setDecisionPanelOpen(true)}
                locked={!betmgmVerified}
              >
                <AddressSection
                  errors={phase2State.errors}
                  defaultValues={{
                    primaryAddress:
                      extractedData?.address ??
                      clientData?.address ??
                      initialData?.primaryAddress,
                    primaryCity:
                      extractedData?.city ??
                      clientData?.city ??
                      initialData?.primaryCity,
                    primaryState:
                      extractedData?.state ??
                      clientData?.state ??
                      initialData?.primaryState,
                    primaryZip:
                      extractedData?.zip ??
                      clientData?.zipCode ??
                      initialData?.primaryZip,
                    hasSecondAddress:
                      initialData?.hasSecondAddress === 'true',
                    secondaryAddress: initialData?.secondaryAddress,
                    secondaryCity: initialData?.secondaryCity,
                    secondaryState: initialData?.secondaryState,
                    secondaryZip: initialData?.secondaryZip,
                  }}
                />
              </StepCard>

              {/* Step 4: Compliance */}
              <StepCard
                stepNumber={4}
                title="Compliance & Background"
                status={phase2Steps[2].status}
                missingItems={phase2Steps[2].missingItems}
                defaultOpen={
                  betmgmVerified &&
                  phase2Steps[1].status === 'complete' &&
                  phase2Steps[2].status !== 'complete'
                }
                onReview={() => setDecisionPanelOpen(true)}
                locked={!betmgmVerified}
              >
                <ComplianceGroups
                  onChange={handleComplianceChange}
                  defaultValues={complianceData}
                />
              </StepCard>
            </div>
          </form>

          {/* Bottom spacing */}
          <div className="h-8" />
        </div>
      </div>
      </div>

      {/* Decision Panel (slide-in) — overlay within form panel */}
      <DecisionPanel
        open={decisionPanelOpen}
        onClose={() => setDecisionPanelOpen(false)}
        idConfirmed={isIdConfirmed}
        ageFlag={ageFlag}
        overriddenFields={overriddenFields}
        complianceData={complianceData}
        clientSourceData={clientSourceData}
        agentConfirms={agentConfirms}
        onClientSourceChange={handleClientSourceFieldChange}
        onAgentConfirmChange={setAgentConfirms}
      />
    </div>
  )
}
