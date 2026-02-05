'use client'

import { useActionState, useState, useCallback } from 'react'
import { useFormStatus } from 'react-dom'
import { createClient, ActionState } from '@/app/actions/clients'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowRight, Save } from 'lucide-react'

import { IdUploadSection } from './id-upload-section'
import { BasicInfoSection } from './basic-info-section'
import { AddressSection } from './address-section'
import { ComplianceGroups } from './compliance-groups'
import { ClientSourceSection } from './client-source-section'
import { ComplianceSummary } from './compliance-summary'
import { AgentConfirmation } from './agent-confirmation'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="btn-glow group h-12 w-full rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/30 transition-all duration-300 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/40 disabled:opacity-50"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Submitting...
        </>
      ) : (
        <>
          Submit & Start Application
          <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </>
      )}
    </Button>
  )
}

function SaveDraftButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      className="h-12 w-full rounded-xl"
    >
      <Save className="mr-2 h-4 w-4" />
      Save Draft
    </Button>
  )
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

export function ClientForm() {
  const [state, formAction] = useActionState(createClient, initialState)

  // ID verification state
  const [isIdConfirmed, setIsIdConfirmed] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedIdData | null>(null)

  // Compliance data state
  const [complianceData, setComplianceData] = useState<ComplianceData>({
    hasCriminalRecord: '',
    hasBankingHistory: '',
    idType: '',
    hasAddressProof: '',
    hasPayPal: '',
    hasBettingHistory: '',
    riskLevel: '',
  })

  // Client source data state
  const [clientSourceData, setClientSourceData] = useState<ClientSourceData>({
    introducedBy: '',
    howMet: '',
    profession: '',
    isReliable: '',
    previouslyFlagged: '',
    additionalNotes: '',
  })

  // Agent confirmation state
  const [agentConfirms, setAgentConfirms] = useState(false)

  // Calculate age from DOB
  const calculateAge = (dob: string): number | null => {
    if (!dob) return null
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--
    }
    return age
  }

  const age = extractedData?.dateOfBirth
    ? calculateAge(extractedData.dateOfBirth)
    : null
  const isAgeCompliant = age !== null ? age >= 21 : null

  // Handlers
  const handleIdDataExtracted = useCallback((data: ExtractedIdData) => {
    setExtractedData(data)
  }, [])

  const handleIdConfirm = useCallback(() => {
    setIsIdConfirmed(true)
  }, [])

  const handleComplianceChange = useCallback((data: ComplianceData) => {
    setComplianceData(data)
  }, [])

  const handleClientSourceChange = useCallback((data: ClientSourceData) => {
    setClientSourceData(data)
  }, [])

  // Combine all questionnaire data into JSON
  const questionnaireJson = JSON.stringify({
    compliance: complianceData,
    clientSource: clientSourceData,
    idVerified: isIdConfirmed,
    dateOfBirth: extractedData?.dateOfBirth,
  })

  return (
    <form action={formAction}>
      {/* Hidden field for questionnaire JSON */}
      <input type="hidden" name="questionnaire" value={questionnaireJson} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - ID, Basic Info, Address */}
        <div className="space-y-6">
          {/* ID Upload & Verification */}
          <div className="animate-fade-in-up">
            <IdUploadSection
              onDataExtracted={handleIdDataExtracted}
              onConfirm={handleIdConfirm}
              isConfirmed={isIdConfirmed}
            />
          </div>

          {/* Basic Information */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
            <BasicInfoSection
              isIdConfirmed={isIdConfirmed}
              errors={state.errors}
              defaultValues={{
                firstName: extractedData?.firstName,
                middleName: extractedData?.middleName,
                lastName: extractedData?.lastName,
                dateOfBirth: extractedData?.dateOfBirth,
              }}
            />
          </div>

          {/* Address Information */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <AddressSection
              errors={state.errors}
              defaultValues={{
                primaryAddress: extractedData?.address,
                primaryCity: extractedData?.city,
                primaryState: extractedData?.state,
                primaryZip: extractedData?.zip,
              }}
            />
          </div>

          {/* Application Notes */}
          <Card
            className="border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in-up"
            style={{ animationDelay: '0.15s' }}
          >
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label
                  htmlFor="notes"
                  className="text-sm font-medium text-foreground"
                >
                  Application Notes{' '}
                  <span className="text-muted-foreground text-xs">(internal)</span>
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  className="min-h-[100px] rounded-xl border-border/50 bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80 resize-none"
                  placeholder="Add any relevant notes about this client..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Compliance, Source, Summary */}
        <div className="space-y-6">
          {/* Compliance Groups */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
            <ComplianceGroups
              onChange={handleComplianceChange}
              defaultValues={complianceData}
            />
          </div>

          {/* Client Source Section */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <ClientSourceSection
              onChange={handleClientSourceChange}
              defaultValues={clientSourceData}
            />
          </div>

          {/* Compliance Summary */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <ComplianceSummary
              isIdVerified={isIdConfirmed}
              isAgeCompliant={isAgeCompliant}
              age={age}
              manualOverridesCount={0}
              hasCriminalRecord={complianceData.hasCriminalRecord}
              riskLevel={complianceData.riskLevel}
            />
          </div>

          {/* Agent Confirmation */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <AgentConfirmation
              checked={agentConfirms}
              onCheckedChange={setAgentConfirms}
              error={state.errors?.agentConfirmsSuitable?.[0]}
            />
          </div>

          {/* Error Message */}
          {state.message && (
            <Card className="border-destructive/50 bg-destructive/10 animate-fade-in-up">
              <CardContent className="py-4">
                <p className="text-sm font-medium text-destructive">
                  {state.message}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div
            className="grid gap-3 sm:grid-cols-2 animate-fade-in-up"
            style={{ animationDelay: '0.25s' }}
          >
            <SaveDraftButton />
            <SubmitButton />
          </div>
        </div>
      </div>
    </form>
  )
}
