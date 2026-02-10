'use client'

import { ClientForm } from './client-form'
import { NewClientLayout } from './new-client-layout'

interface PipelineClient {
  id: string
  firstName: string
  lastName: string
}

interface PipelineDraft {
  id: string
  formData: Record<string, string>
  phase: number
}

interface PipelineData {
  drafts: PipelineDraft[]
  phase1: PipelineClient[]
  phase2: PipelineClient[]
  phase3: PipelineClient[]
  phase4: PipelineClient[]
}

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

interface NewClientPageClientProps {
  pipelineData: PipelineData
  currentClientId?: string
  currentDraftId?: string
  initialData: Record<string, string> | null
  clientData: ClientData | null
  betmgmStatus: string
  serverPhase?: number | null
}

export function NewClientPageClient({
  pipelineData,
  currentClientId,
  currentDraftId,
  initialData,
  clientData,
  betmgmStatus,
  serverPhase,
}: NewClientPageClientProps) {
  const { form, riskPanel } = ClientForm({
    initialData,
    draftId: currentDraftId,
    clientData,
    betmgmStatus,
    serverPhase,
  })

  return (
    <NewClientLayout
      pipelineData={pipelineData}
      currentClientId={currentClientId}
      currentDraftId={currentDraftId}
      riskPanel={riskPanel}
    >
      {form}
    </NewClientLayout>
  )
}
