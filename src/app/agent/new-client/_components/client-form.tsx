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
import { RiskPanel } from './risk-panel'
import { IdUploadSection } from './id-upload-section'
import { GmailSection } from './gmail-section'
import { BetmgmCheckSection } from './betmgm-check-section'
import { BasicInfoSection } from './basic-info-section'
import { AddressSection } from './address-section'
import { ComplianceGroups, EMPTY_COMPLIANCE_DATA } from './compliance-groups'
import type { ComplianceData } from './compliance-groups'
import { PhaseHeader } from './phase-header'
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
  idDocument?: string | null
  betmgmScreenshots?: string[]
}

interface ClientFormProps {
  initialData?: Record<string, string> | null
  draftId?: string
  clientData?: ClientData | null
  betmgmStatus?: string
  serverPhase?: number | null
}

export function ClientForm({
  initialData,
  draftId,
  clientData,
  betmgmStatus: initialBetmgmStatus,
  serverPhase,
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
  const currentPhase: number =
    serverPhase ?? (prequalSubmitted && betmgmVerified ? 2 : 1)

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
        const ea = parsedQuestionnaire?.extractedAddress ?? parsedQuestionnaire?.secondaryAddress
        return {
          firstName: clientData.firstName ?? '',
          lastName: clientData.lastName ?? '',
          middleName: parsedQuestionnaire?.middleName,
          dateOfBirth: parsedQuestionnaire?.dateOfBirth ?? '',
          address: clientData.address ?? ea?.address ?? undefined,
          city: clientData.city ?? ea?.city ?? undefined,
          state: clientData.state ?? ea?.state ?? undefined,
          zip: clientData.zipCode ?? ea?.zip ?? undefined,
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
  const [overriddenFields, setOverriddenFields] = useState<string[]>(
    parsedQuestionnaire?.overriddenFields ?? [],
  )

  // Track original ID-extracted values for override detection
  const originalIdDataRef = useRef<Record<string, string>>({})

  // Gmail state for Phase 1 step tracking
  const [gmailValue, setGmailValue] = useState(
    clientData?.gmailAccount ?? initialData?.gmailAccount ?? '',
  )
  const [passwordValue, setPasswordValue] = useState(
    clientData?.gmailPassword ?? initialData?.gmailPassword ?? '',
  )
  const [phoneValue, setPhoneValue] = useState(
    clientData?.phone ?? initialData?.phone ?? '',
  )

  // BetMGM check state — restore from questionnaire + platform screenshots
  const [betmgmResult, setBetmgmResult] = useState<'success' | 'failed' | null>(
    parsedQuestionnaire?.betmgmResult ?? null,
  )
  const [betmgmScreenshots, setBetmgmScreenshots] = useState<{
    login?: string
    deposit?: string
  }>(() => {
    const screenshots = clientData?.betmgmScreenshots
    if (screenshots && screenshots.length > 0) {
      return {
        login: screenshots[0] || undefined,
        deposit: screenshots[1] || undefined,
      }
    }
    return {}
  })

  // Compliance data state (expanded — includes former clientSourceData)
  const [complianceData, setComplianceData] = useState<ComplianceData>(() => {
    const c = parsedQuestionnaire?.compliance
    const cs = parsedQuestionnaire?.clientSource
    if (!c && !cs) return { ...EMPTY_COMPLIANCE_DATA }
    return {
      ...EMPTY_COMPLIANCE_DATA,
      ...(c || {}),
      // Merge clientSource fields into complianceData (Group E)
      introducedBy: cs?.introducedBy ?? c?.introducedBy ?? '',
      howMet: cs?.howMet ?? c?.howMet ?? '',
      profession: cs?.profession ?? c?.profession ?? '',
      isReliable: cs?.isReliable ?? c?.isReliable ?? '',
      previouslyFlagged: cs?.previouslyFlagged ?? c?.previouslyFlagged ?? '',
      previousPlatforms: c?.previousPlatforms ?? [],
    }
  })

  // Agent confirmation state
  const [agentConfirms, setAgentConfirms] = useState(false)

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
        toast.success('BetMGM verified! Full application unlocked.')
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
      toast.success('Pre-qualification submitted! Awaiting BetMGM verification.')
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
    // Store original values for override detection
    originalIdDataRef.current = {
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName ?? '',
      dateOfBirth: data.dateOfBirth,
    }
  }, [])

  const handleIdConfirm = useCallback(() => {
    setIsIdConfirmed(true)
  }, [])

  const handleComplianceChange = useCallback((data: ComplianceData) => {
    setComplianceData(data)
  }, [])

  // Step status computation — Phase 1 now has 3 sub-steps
  const computePhase1Steps = (): {
    status: StepStatus
    missingItems: string[]
  }[] => {
    // Step 1a: ID Verification
    const step1aStatus: StepStatus = isIdConfirmed
      ? 'complete'
      : idUploaded
        ? 'pending'
        : 'not-started'
    const step1aMissing: string[] = []
    if (!idUploaded) step1aMissing.push('Upload ID')
    else if (!isIdConfirmed) step1aMissing.push('Confirm ID data')

    // Step 1b: Contact & Gmail
    const hasGmail = !!gmailValue
    const hasPassword = !!passwordValue
    const hasPhone = !!phoneValue
    const step1bStatus: StepStatus =
      hasGmail && hasPassword && hasPhone ? 'complete' : 'pending'
    const step1bMissing: string[] = []
    if (!hasPhone) step1bMissing.push('Phone number')
    if (!hasGmail) step1bMissing.push('Gmail account')
    if (!hasPassword) step1bMissing.push('Gmail password')

    // Step 1c: BetMGM Check
    const betmgmComplete =
      betmgmResult === 'failed' ||
      (betmgmResult === 'success' &&
        !!betmgmScreenshots.login &&
        !!betmgmScreenshots.deposit)
    const step1cStatus: StepStatus = betmgmComplete
      ? 'complete'
      : betmgmResult
        ? 'pending'
        : 'not-started'
    const step1cMissing: string[] = []
    if (!betmgmResult) step1cMissing.push('Record BetMGM result')
    else if (
      betmgmResult === 'success' &&
      (!betmgmScreenshots.login || !betmgmScreenshots.deposit)
    ) {
      if (!betmgmScreenshots.login) step1cMissing.push('Login screenshot')
      if (!betmgmScreenshots.deposit) step1cMissing.push('Deposit screenshot')
    }

    return [
      { status: step1aStatus, missingItems: step1aMissing },
      { status: step1bStatus, missingItems: step1bMissing },
      { status: step1cStatus, missingItems: step1cMissing },
    ]
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

    // Step 4: Compliance (expanded requirements)
    const hasRecord = complianceData.hasCriminalRecord !== ''
    const hasPayPal = complianceData.hasPayPal !== ''
    const hasBetting = complianceData.hasBettingHistory !== ''
    const hasBanking = complianceData.hasBankingHistory !== ''
    const hasRiskLevel = complianceData.riskLevel !== ''
    const hasEnglish = complianceData.canReadEnglish !== ''
    const hasSSN = !!complianceData.ssn
    const hasBankName =
      complianceData.hasBankingHistory !== 'yes' || !!complianceData.bankName

    const allRequired =
      hasRecord && hasPayPal && hasBetting && hasBanking && hasRiskLevel && hasEnglish && hasSSN && hasBankName
    const step4Status: StepStatus =
      complianceData.hasCriminalRecord === 'yes'
        ? 'blocked'
        : allRequired
          ? 'complete'
          : 'pending'
    const step4Missing: string[] = []
    if (!hasBanking) step4Missing.push('Banking history')
    if (!hasSSN) step4Missing.push('SSN')
    if (!hasPayPal) step4Missing.push('PayPal status')
    if (!hasBetting) step4Missing.push('Betting history')
    if (!hasRecord) step4Missing.push('Criminal record')
    if (!hasRiskLevel) step4Missing.push('Risk level')
    if (!hasEnglish) step4Missing.push('English proficiency')
    if (!hasBankName) step4Missing.push('Bank name')
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
  const getRiskLevel = (): 'low' | 'medium' | 'high' => {
    // HIGH
    if (ageFlag?.severity === 'high-risk') return 'high'
    if (complianceData.hasCriminalRecord === 'yes') return 'high'
    if (complianceData.hasBeenDebanked === 'yes') return 'high'
    if (
      complianceData.paypalPreviouslyUsed === 'yes' &&
      complianceData.paypalVerificationStatus === 'multiple'
    )
      return 'high'

    // MEDIUM
    if (ageFlag) return 'medium'
    if (complianceData.hasCriminalRecord === 'unknown') return 'medium'
    if (extractedData?.idExpiry) {
      const daysUntilExpiry = Math.floor(
        (new Date(extractedData.idExpiry).getTime() - Date.now()) / 86400000,
      )
      if (daysUntilExpiry > 0 && daysUntilExpiry <= 75) return 'medium'
    }
    if (
      complianceData.canReadEnglish === 'limited' ||
      complianceData.canReadEnglish === 'no' ||
      complianceData.canSpeakEnglish === 'limited' ||
      complianceData.canSpeakEnglish === 'no'
    )
      return 'medium'
    if (complianceData.hasBettingHistory === 'extensive') return 'medium'
    if (complianceData.hasEightPlusRegistrations === 'yes') return 'medium'
    if (overriddenFields.length > 0) return 'medium'

    return 'low'
  }

  // Combine all questionnaire data into JSON
  const questionnaireJson = JSON.stringify({
    compliance: complianceData,
    idVerified: isIdConfirmed,
    dateOfBirth: extractedData?.dateOfBirth,
    idExpiry: extractedData?.idExpiry,
    middleName: extractedData?.middleName,
    overriddenFields,
    extractedAddress: extractedData ? {
      address: extractedData.address,
      city: extractedData.city,
      state: extractedData.state,
      zip: extractedData.zip,
    } : undefined,
  })

  // Submit handler
  const handleSubmit = () => {
    if (currentPhase === 1 && !prequalSubmitted) {
      phase1FormRef.current?.requestSubmit()
    } else if (currentPhase >= 2) {
      phase2FormRef.current?.requestSubmit()
    }
  }

  // Phase 1 submit disabled — all 3 sub-steps must be complete
  const phase1SubmitDisabled =
    !isIdConfirmed ||
    !gmailValue ||
    !passwordValue ||
    !phoneValue ||
    !betmgmResult ||
    (betmgmResult === 'success' &&
      (!betmgmScreenshots.login || !betmgmScreenshots.deposit))
  // Phase 2 submit disabled
  const phase2SubmitDisabled = !agentConfirms || currentPhase >= 3

  // ID expiration check for Phase 1 blocking
  const idExpiryDate = extractedData?.idExpiry
  const isIdExpired =
    idExpiryDate &&
    Math.floor(
      (new Date(idExpiryDate).getTime() - Date.now()) / 86400000,
    ) <= 0

  // Risk panel element (rendered in the layout's right panel)
  const riskPanelElement = (
    <RiskPanel
      extractedData={extractedData}
      complianceData={complianceData}
      ageFlag={ageFlag}
      idConfirmed={isIdConfirmed}
      overriddenFields={overriddenFields}
      agentConfirms={agentConfirms}
      onAgentConfirmChange={setAgentConfirms}
      phase={currentPhase}
    />
  )

  return {
    form: (
      <div className="relative h-full">
        <div className="h-full overflow-y-auto">
          {/* Sticky Status Header */}
          <StatusHeader
            clientName={
              extractedData?.firstName && extractedData?.lastName
                ? `${extractedData.firstName} ${extractedData.lastName}`
                : ''
            }
            riskLevel={getRiskLevel()}
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
            <div className="space-y-4 px-8 py-6">
              {/* PHASE 1: Pre-qualification */}
              <PhaseHeader
                phase={1}
                title="Pre-qualification"
                active={currentPhase === 1}
              />

              <form ref={phase1FormRef} action={prequalFormAction}>
                {/* Hidden fields for Phase 1 */}
                {extractedData && (
                  <>
                    <input type="hidden" name="firstName" value={extractedData.firstName} />
                    <input type="hidden" name="lastName" value={extractedData.lastName} />
                    {extractedData.middleName && (
                      <input type="hidden" name="middleName" value={extractedData.middleName} />
                    )}
                    {extractedData.dateOfBirth && (
                      <input type="hidden" name="dateOfBirth" value={extractedData.dateOfBirth} />
                    )}
                    {extractedData.idExpiry && (
                      <input type="hidden" name="idExpiry" value={extractedData.idExpiry} />
                    )}
                    {extractedData.address && (
                      <input type="hidden" name="address" value={extractedData.address} />
                    )}
                    {extractedData.city && (
                      <input type="hidden" name="city" value={extractedData.city} />
                    )}
                    {extractedData.state && (
                      <input type="hidden" name="state" value={extractedData.state} />
                    )}
                    {extractedData.zip && (
                      <input type="hidden" name="zipCode" value={extractedData.zip} />
                    )}
                  </>
                )}
                <input type="hidden" name="gmailAccount" value={gmailValue} />
                <input type="hidden" name="gmailPassword" value={passwordValue} />
                <input type="hidden" name="phone" value={phoneValue} />
                <input type="hidden" name="agentConfirmsId" value={isIdConfirmed ? 'true' : 'false'} />
                {draftId && <input type="hidden" name="draftId" value={draftId} />}

                <div className="space-y-4">
                  {/* Step 1a: ID Verification */}
                  <StepCard
                    stepNumber={1.1}
                    title="Client ID Verification"
                    status={phase1Steps[0].status}
                    missingItems={phase1Steps[0].missingItems}
                    defaultOpen={!prequalSubmitted}
                    locked={false}
                  >
                    <IdUploadSection
                      onDataExtracted={handleIdDataExtracted}
                      onConfirm={handleIdConfirm}
                      isConfirmed={isIdConfirmed}
                      initialData={prequalSubmitted && extractedData ? extractedData : undefined}
                    />
                  </StepCard>

                  {/* Step 1b: Gmail Account */}
                  <StepCard
                    stepNumber={1.2}
                    title="Assign Gmail Account"
                    status={phase1Steps[1].status}
                    missingItems={phase1Steps[1].missingItems}
                    defaultOpen={!prequalSubmitted && isIdConfirmed}
                    locked={false}
                  >
                    <GmailSection
                      defaultGmail={clientData?.gmailAccount ?? initialData?.gmailAccount ?? undefined}
                      defaultPassword={clientData?.gmailPassword ?? initialData?.gmailPassword ?? undefined}
                      defaultPhone={clientData?.phone ?? initialData?.phone ?? undefined}
                      clientId={clientData?.id}
                      errors={prequalState.errors}
                      disabled={prequalSubmitted}
                      onGmailChange={setGmailValue}
                      onPasswordChange={setPasswordValue}
                      onPhoneChange={setPhoneValue}
                    />
                  </StepCard>

                  {/* Step 1c: BetMGM Registration Check */}
                  <StepCard
                    stepNumber={1.3}
                    title="BetMGM Registration Check"
                    status={phase1Steps[2].status}
                    missingItems={phase1Steps[2].missingItems}
                    defaultOpen={!prequalSubmitted && isIdConfirmed && !!gmailValue && !!passwordValue && !!phoneValue}
                    locked={false}
                  >
                    <BetmgmCheckSection
                      onStatusChange={setBetmgmResult}
                      onScreenshotsChange={setBetmgmScreenshots}
                      status={betmgmResult}
                      screenshots={betmgmScreenshots}
                      disabled={prequalSubmitted}
                    />
                  </StepCard>
                </div>
              </form>

              {/* PHASE GATE */}
              <PhaseGate unlocked={betmgmVerified || currentPhase >= 2} />

              {/* PHASE 2: Full Application */}
              <PhaseHeader
                phase={2}
                title="Full Application"
                active={currentPhase >= 2}
              />

              <form ref={phase2FormRef} action={phase2FormAction}>
                <input type="hidden" name="questionnaire" value={questionnaireJson} />
                <input type="hidden" name="agentConfirmsSuitable" value={agentConfirms ? 'true' : 'false'} />
                {clientData?.id && <input type="hidden" name="clientId" value={clientData.id} />}
                {draftId && <input type="hidden" name="draftId" value={draftId} />}

                <div className="space-y-4">
                  {/* Step 2: Basic Info */}
                  <StepCard
                    stepNumber={2}
                    title="Basic Information"
                    status={phase2Steps[0].status}
                    missingItems={phase2Steps[0].missingItems}
                    defaultOpen={(betmgmVerified || currentPhase >= 2) && phase2Steps[0].status !== 'complete'}
                    locked={!betmgmVerified && currentPhase < 2}
                  >
                    <BasicInfoSection
                      isIdConfirmed={isIdConfirmed}
                      errors={phase2State.errors}
                      defaultValues={{
                        firstName: extractedData?.firstName ?? clientData?.firstName ?? initialData?.firstName,
                        middleName: extractedData?.middleName ?? initialData?.middleName,
                        lastName: extractedData?.lastName ?? clientData?.lastName ?? initialData?.lastName,
                        dateOfBirth: extractedData?.dateOfBirth ?? initialData?.dateOfBirth,
                        phone: clientData?.phone ?? initialData?.phone,
                        email: clientData?.email ?? initialData?.email,
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
                    defaultOpen={(betmgmVerified || currentPhase >= 2) && phase2Steps[0].status === 'complete' && phase2Steps[1].status !== 'complete'}
                    locked={!betmgmVerified && currentPhase < 2}
                  >
                    <AddressSection
                      errors={phase2State.errors}
                      defaultValues={{
                        primaryAddress: extractedData?.address ?? clientData?.address ?? initialData?.primaryAddress,
                        primaryCity: extractedData?.city ?? clientData?.city ?? initialData?.primaryCity,
                        primaryState: extractedData?.state ?? clientData?.state ?? initialData?.primaryState,
                        primaryZip: extractedData?.zip ?? clientData?.zipCode ?? initialData?.primaryZip,
                        hasSecondAddress: initialData?.hasSecondAddress === 'true',
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
                    defaultOpen={(betmgmVerified || currentPhase >= 2) && phase2Steps[1].status === 'complete' && phase2Steps[2].status !== 'complete'}
                    locked={!betmgmVerified && currentPhase < 2}
                  >
                    <ComplianceGroups
                      onChange={handleComplianceChange}
                      defaultValues={complianceData}
                    />
                  </StepCard>
                </div>
              </form>

              <div className="h-8" />
            </div>
          </div>
        </div>
      </div>
    ),
    riskPanel: riskPanelElement,
  }
}
