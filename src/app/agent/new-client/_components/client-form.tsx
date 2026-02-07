'use client'

import {
  useActionState,
  useState,
  useCallback,
  useEffect,
  useRef,
  useTransition,
} from 'react'
import { createClient, ActionState } from '@/app/actions/clients'
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

interface ClientFormProps {
  initialData?: Record<string, string> | null
  draftId?: string
}

export function ClientForm({ initialData, draftId }: ClientFormProps) {
  const [state, formAction] = useActionState(createClient, initialState)
  const [isSavingDraft, startDraftTransition] = useTransition()

  // Parse questionnaire from initialData if loading a draft
  const parsedQuestionnaire = initialData?.questionnaire
    ? (() => {
        try {
          return JSON.parse(initialData.questionnaire)
        } catch {
          return null
        }
      })()
    : null

  // ID verification state
  const [isIdConfirmed, setIsIdConfirmed] = useState(
    parsedQuestionnaire?.idVerified ?? false,
  )
  const [idUploaded, setIdUploaded] = useState(!!initialData?.firstName)
  const [extractedData, setExtractedData] = useState<ExtractedIdData | null>(
    initialData
      ? {
          firstName: initialData.firstName ?? '',
          lastName: initialData.lastName ?? '',
          middleName: initialData.middleName,
          dateOfBirth:
            initialData.dateOfBirth ?? parsedQuestionnaire?.dateOfBirth ?? '',
          address: initialData.primaryAddress,
          city: initialData.primaryCity,
          state: initialData.primaryState,
          zip: initialData.primaryZip,
        }
      : null,
  )
  const [overriddenFields, setOverriddenFields] = useState<string[]>([])

  // Compliance data state
  const [complianceData, setComplianceData] = useState<ComplianceData>({
    hasCriminalRecord: parsedQuestionnaire?.compliance?.hasCriminalRecord ?? '',
    hasBankingHistory: parsedQuestionnaire?.compliance?.hasBankingHistory ?? '',
    criminalDetails: parsedQuestionnaire?.compliance?.criminalDetails,
    idType: parsedQuestionnaire?.compliance?.idType ?? '',
    hasAddressProof: parsedQuestionnaire?.compliance?.hasAddressProof ?? '',
    idNotes: parsedQuestionnaire?.compliance?.idNotes,
    hasPayPal: parsedQuestionnaire?.compliance?.hasPayPal ?? '',
    hasBettingHistory: parsedQuestionnaire?.compliance?.hasBettingHistory ?? '',
    bettingDetails: parsedQuestionnaire?.compliance?.bettingDetails,
    riskLevel: parsedQuestionnaire?.compliance?.riskLevel ?? '',
    authorizationNotes: parsedQuestionnaire?.compliance?.authorizationNotes,
  })

  // Client source data state
  const [clientSourceData, setClientSourceData] = useState<ClientSourceData>({
    introducedBy: parsedQuestionnaire?.clientSource?.introducedBy ?? '',
    howMet: parsedQuestionnaire?.clientSource?.howMet ?? '',
    profession: parsedQuestionnaire?.clientSource?.profession ?? '',
    isReliable: parsedQuestionnaire?.clientSource?.isReliable ?? '',
    previouslyFlagged:
      parsedQuestionnaire?.clientSource?.previouslyFlagged ?? '',
    additionalNotes: parsedQuestionnaire?.clientSource?.additionalNotes ?? '',
  })

  // Agent confirmation state
  const [agentConfirms, setAgentConfirms] = useState(false)

  // Decision panel state
  const [decisionPanelOpen, setDecisionPanelOpen] = useState(false)

  // Age flag state
  const [ageFlag, setAgeFlag] = useState<AgeFlag | null>(null)

  // Form ref for preserving values
  const formRef = useRef<HTMLFormElement>(null)

  // Age compliance check
  useEffect(() => {
    const dob = extractedData?.dateOfBirth
    if (dob) {
      const birthDate = new Date(dob)
      const today = new Date()
      const age = Math.floor(
        (today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
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

  // Show toast on validation errors
  useEffect(() => {
    if (state.message) {
      toast.error(state.message)
    } else if (state.errors && Object.keys(state.errors).length > 0) {
      const errorCount = Object.keys(state.errors).length
      toast.error(
        `Please fix ${errorCount} validation error${errorCount > 1 ? 's' : ''}`,
      )
    }
  }, [state])

  // Handle save draft
  const handleSaveDraft = useCallback(() => {
    if (!formRef.current) return

    const formData = new FormData(formRef.current)
    if (draftId) {
      formData.set('draftId', draftId)
    }

    startDraftTransition(async () => {
      const result = await saveDraft({}, formData)
      if (result.success) {
        toast.success(result.message || 'Draft saved successfully')
      } else {
        toast.error(result.message || 'Failed to save draft')
      }
    })
  }, [draftId])

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

  // Step status computation (matching Lovable's computeSteps)
  const computeSteps = (): { status: StepStatus; missingItems: string[] }[] => {
    // Step 1: Identity
    const step1Status: StepStatus = isIdConfirmed
      ? 'complete'
      : idUploaded
        ? 'pending'
        : 'not-started'
    const step1Missing: string[] = []
    if (!idUploaded) step1Missing.push('Upload ID')
    else if (!isIdConfirmed) step1Missing.push('Confirm ID data')

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
      { status: step1Status, missingItems: step1Missing },
      { status: step2Status, missingItems: step2Missing },
      { status: step3Status, missingItems: step3Missing },
      { status: step4Status, missingItems: step4Missing },
    ]
  }

  const steps = computeSteps()

  // Overall status
  const getOverallStatus = () => {
    if (steps.some((s) => s.status === 'blocked')) return 'Blocked'
    const completed = steps.filter((s) => s.status === 'complete').length
    if (completed === steps.length) return 'Ready for Review'
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
  })

  return (
    <>
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
          isIdConfirmed
            ? 'ID confirmed'
            : idUploaded
              ? 'ID uploaded'
              : 'No actions yet'
        }
        steps={steps}
        onSubmit={() => formRef.current?.requestSubmit()}
        submitDisabled={!agentConfirms}
        onSaveDraft={handleSaveDraft}
        isSaving={isSavingDraft}
      />

      {/* Main Content */}
      <div
        className={`transition-all ${decisionPanelOpen ? 'mr-[380px]' : ''}`}
      >
        <form ref={formRef} action={formAction}>
          {/* Hidden fields */}
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
          {draftId && <input type="hidden" name="draftId" value={draftId} />}

          <div className="mx-auto max-w-3xl space-y-4 px-6 py-6">
            {/* Step 1: Identity */}
            <StepCard
              stepNumber={1}
              title="Identity Verification"
              status={steps[0].status}
              missingItems={steps[0].missingItems}
              defaultOpen={steps[0].status !== 'complete'}
              onReview={() => setDecisionPanelOpen(true)}
            >
              <IdUploadSection
                onDataExtracted={handleIdDataExtracted}
                onConfirm={handleIdConfirm}
                isConfirmed={isIdConfirmed}
              />
            </StepCard>

            {/* Step 2: Basic Info */}
            <StepCard
              stepNumber={2}
              title="Basic Information"
              status={steps[1].status}
              missingItems={steps[1].missingItems}
              defaultOpen={
                steps[0].status === 'complete' && steps[1].status !== 'complete'
              }
              onReview={() => setDecisionPanelOpen(true)}
            >
              <BasicInfoSection
                isIdConfirmed={isIdConfirmed}
                errors={state.errors}
                defaultValues={{
                  firstName:
                    extractedData?.firstName ?? initialData?.firstName,
                  middleName:
                    extractedData?.middleName ?? initialData?.middleName,
                  lastName:
                    extractedData?.lastName ?? initialData?.lastName,
                  dateOfBirth:
                    extractedData?.dateOfBirth ?? initialData?.dateOfBirth,
                  phone: initialData?.phone,
                  email: initialData?.email,
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
              status={steps[2].status}
              missingItems={steps[2].missingItems}
              defaultOpen={
                steps[1].status === 'complete' && steps[2].status !== 'complete'
              }
              onReview={() => setDecisionPanelOpen(true)}
            >
              <AddressSection
                errors={state.errors}
                defaultValues={{
                  primaryAddress:
                    extractedData?.address ?? initialData?.primaryAddress,
                  primaryCity:
                    extractedData?.city ?? initialData?.primaryCity,
                  primaryState:
                    extractedData?.state ?? initialData?.primaryState,
                  primaryZip:
                    extractedData?.zip ?? initialData?.primaryZip,
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
              status={steps[3].status}
              missingItems={steps[3].missingItems}
              defaultOpen={
                steps[2].status === 'complete' && steps[3].status !== 'complete'
              }
              onReview={() => setDecisionPanelOpen(true)}
            >
              <ComplianceGroups
                onChange={handleComplianceChange}
                defaultValues={complianceData}
              />
            </StepCard>

            {/* Bottom spacing */}
            <div className="h-8" />
          </div>
        </form>
      </div>

      {/* Decision Panel (slide-in) */}
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
    </>
  )
}
