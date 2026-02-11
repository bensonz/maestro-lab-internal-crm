import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { NewClientPageClient } from './_components/new-client-page-client'
import { getClientPhase } from '@/lib/client-phase'

interface Props {
  searchParams: Promise<{ draft?: string; client?: string }>
}

export default async function NewClientPage({ searchParams }: Props) {
  const { draft: draftId, client: clientId } = await searchParams
  const session = await auth()

  let initialData: Record<string, string> | null = null
  let clientData = null
  let betmgmStatus = 'NOT_STARTED'
  let serverPhase: number | null = null
  let betmgmRetryState: {
    isRetryPending: boolean
    retryAfter?: string
    retryCount: number
    rejectionReason?: string
    cooldownPassed: boolean
    previousAgentResult?: string
  } | null = null

  // Fetch all independent data in parallel
  const [drafts, selectedClient, pipelineClients] = await Promise.all([
    // 1. All drafts for this agent
    session?.user?.id
      ? prisma.applicationDraft.findMany({
          where: { agentId: session.user.id },
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            formData: true,
            updatedAt: true,
            phase: true,
            clientId: true,
          },
        })
      : Promise.resolve([]),
    // 2. Selected client (if ?client= param)
    clientId && session?.user?.id
      ? prisma.client.findUnique({
          where: { id: clientId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gmailAccount: true,
            gmailPassword: true,
            prequalCompleted: true,
            phone: true,
            email: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            questionnaire: true,
            idDocument: true,
            intakeStatus: true,
            agentId: true,
            platforms: {
              where: { platformType: 'BETMGM' },
              select: { status: true, screenshots: true, retryAfter: true, retryCount: true, reviewNotes: true, agentResult: true },
            },
          },
        })
      : Promise.resolve(null),
    // 3. All pipeline clients
    session?.user?.id
      ? prisma.client.findMany({
          where: {
            agentId: session.user.id,
            intakeStatus: {
              in: ['PENDING', 'PREQUAL_REVIEW', 'PREQUAL_APPROVED', 'PHONE_ISSUED', 'IN_EXECUTION', 'READY_FOR_APPROVAL'],
            },
          },
          include: { platforms: { where: { platformType: 'BETMGM' } } },
          orderBy: { updatedAt: 'desc' },
        })
      : Promise.resolve([]),
  ])

  // Resolved draft ID to pass down (so subsequent saves update the existing draft)
  let resolvedDraftId = draftId

  // Process draft data if ?draft= param present
  if (draftId && session?.user?.id) {
    const draft = drafts.find((d) => d.id === draftId)
    if (draft) {
      initialData = draft.formData as Record<string, string>
    }
  }

  // If loading a client (not a draft), check if there's a draft for this client
  // and merge draft data (which includes Phase 2 compliance fields)
  if (clientId && !draftId && session?.user?.id) {
    const clientDraft = drafts.find((d) => d.clientId === clientId)
    if (clientDraft) {
      initialData = clientDraft.formData as Record<string, string>
      resolvedDraftId = clientDraft.id
    }
  }

  // Process client data if found
  if (selectedClient && selectedClient.agentId === session?.user?.id) {
    const betmgmPlatform = selectedClient.platforms[0]
    clientData = {
      id: selectedClient.id,
      firstName: selectedClient.firstName,
      lastName: selectedClient.lastName,
      gmailAccount: selectedClient.gmailAccount,
      gmailPassword: selectedClient.gmailPassword,
      prequalCompleted: selectedClient.prequalCompleted,
      phone: selectedClient.phone,
      email: selectedClient.email,
      address: selectedClient.address,
      city: selectedClient.city,
      state: selectedClient.state,
      zipCode: selectedClient.zipCode,
      questionnaire: selectedClient.questionnaire,
      idDocument: selectedClient.idDocument,
      betmgmScreenshots: betmgmPlatform?.screenshots ?? [],
      intakeStatus: selectedClient.intakeStatus,
    }
    betmgmStatus = betmgmPlatform?.status ?? 'NOT_STARTED'
    // Compute retry state for the agent UI
    const retryAfterDate = betmgmPlatform?.retryAfter
    betmgmRetryState = {
      isRetryPending: betmgmPlatform?.status === 'RETRY_PENDING',
      retryAfter: retryAfterDate ? retryAfterDate.toISOString() : undefined,
      retryCount: betmgmPlatform?.retryCount ?? 0,
      rejectionReason: betmgmPlatform?.reviewNotes ?? undefined,
      cooldownPassed: retryAfterDate ? retryAfterDate.getTime() <= Date.now() : false,
      previousAgentResult: betmgmPlatform?.agentResult ?? undefined,
    }
    serverPhase = getClientPhase({
      intakeStatus: selectedClient.intakeStatus,
      prequalCompleted: selectedClient.prequalCompleted,
      betmgmVerified: betmgmPlatform?.status === 'VERIFIED',
    })
  }

  // Compute phase for each pipeline client and group
  const phase1: { id: string; firstName: string; lastName: string; intakeStatus: string }[] = []
  const phase2: { id: string; firstName: string; lastName: string; intakeStatus: string }[] = []
  const phase3: { id: string; firstName: string; lastName: string; intakeStatus: string }[] = []
  const phase4: { id: string; firstName: string; lastName: string; intakeStatus: string }[] = []

  for (const c of pipelineClients) {
    const betmgmVerified =
      c.platforms.some((p) => p.platformType === 'BETMGM' && p.status === 'VERIFIED')
    const phase = getClientPhase({
      intakeStatus: c.intakeStatus,
      prequalCompleted: c.prequalCompleted,
      betmgmVerified,
    })
    const item = { id: c.id, firstName: c.firstName, lastName: c.lastName, intakeStatus: c.intakeStatus }
    switch (phase) {
      case 1:
        phase1.push(item)
        break
      case 2:
        phase2.push(item)
        break
      case 3:
        phase3.push(item)
        break
      case 4:
        phase4.push(item)
        break
    }
  }

  const allDrafts = drafts
    .filter((d) => !d.clientId)
    .map((d) => ({
      id: d.id,
      formData: d.formData as Record<string, string>,
      phase: (d.phase ?? 1) as number,
    }))

  return (
    <NewClientPageClient
      key={clientId ?? draftId ?? 'new'}
      pipelineData={{
        drafts: allDrafts,
        phase1,
        phase2,
        phase3,
        phase4,
      }}
      currentClientId={clientId}
      currentDraftId={resolvedDraftId}
      initialData={initialData}
      clientData={clientData}
      betmgmStatus={betmgmStatus}
      serverPhase={serverPhase}
      betmgmRetryState={betmgmRetryState}
    />
  )
}
