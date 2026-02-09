import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { ClientForm } from './_components/client-form'
import { DraftSelector } from './_components/draft-selector'
import { NewClientLayout } from './_components/new-client-layout'

interface Props {
  searchParams: Promise<{ draft?: string; client?: string }>
}

export default async function NewClientPage({ searchParams }: Props) {
  const { draft: draftId, client: clientId } = await searchParams
  const session = await auth()

  let initialData: Record<string, string> | null = null
  let clientData = null
  let betmgmStatus = 'NOT_STARTED'

  // Fetch all drafts for this agent (for the selector)
  const drafts = session?.user?.id
    ? await prisma.applicationDraft.findMany({
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
    : []

  // Load draft data if ?draft= param present
  if (draftId && session?.user?.id) {
    const draft = drafts.find((d) => d.id === draftId)
    if (draft) {
      initialData = draft.formData as Record<string, string>
    }
  }

  // Load client data if ?client= param present (Phase 1 submitted, returning for Phase 2)
  if (clientId && session?.user?.id) {
    const client = await prisma.client.findUnique({
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
        agentId: true,
        platforms: {
          where: { platformType: 'BETMGM' },
          select: { status: true },
        },
      },
    })

    if (client && client.agentId === session.user.id) {
      clientData = {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        gmailAccount: client.gmailAccount,
        gmailPassword: client.gmailPassword,
        prequalCompleted: client.prequalCompleted,
        phone: client.phone,
        email: client.email,
        address: client.address,
        city: client.city,
        state: client.state,
        zipCode: client.zipCode,
        questionnaire: client.questionnaire,
      }
      betmgmStatus = client.platforms[0]?.status ?? 'NOT_STARTED'
    }
  }

  // Fetch prequal pipeline data for sidebar
  const prequalClients = session?.user?.id
    ? await prisma.client.findMany({
        where: { agentId: session.user.id, prequalCompleted: true },
        include: { platforms: { where: { platformType: 'BETMGM' } } },
        orderBy: { updatedAt: 'desc' },
      })
    : []

  const phase1Drafts = drafts
    .filter((d) => (d.phase ?? 1) === 1 && !d.clientId)
    .map((d) => ({
      id: d.id,
      formData: d.formData as Record<string, string>,
      updatedAt: d.updatedAt,
    }))

  const awaitingVerification = prequalClients
    .filter((c) => {
      const mgm = c.platforms.find((p) => p.platformType === 'BETMGM')
      return mgm && mgm.status !== 'VERIFIED'
    })
    .map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      gmailAccount: c.gmailAccount,
      updatedAt: c.updatedAt,
      betmgmStatus:
        c.platforms.find((p) => p.platformType === 'BETMGM')?.status ??
        'NOT_STARTED',
    }))

  const readyForPhase2 = prequalClients
    .filter((c) => {
      const mgm = c.platforms.find((p) => p.platformType === 'BETMGM')
      return (
        mgm &&
        mgm.status === 'VERIFIED' &&
        c.intakeStatus === 'PENDING'
      )
    })
    .map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      gmailAccount: c.gmailAccount,
      updatedAt: c.updatedAt,
      betmgmStatus: 'VERIFIED',
    }))

  const phase2Drafts = drafts
    .filter((d) => (d.phase ?? 1) === 2)
    .map((d) => ({
      ...d,
      formData: d.formData as Record<string, string>,
    }))

  return (
    <NewClientLayout
      pipelineData={{
        drafts: phase1Drafts,
        awaitingVerification,
        readyForPhase2,
      }}
      currentClientId={clientId}
      currentDraftId={draftId}
    >
      {/* Legacy Draft Selector (for Phase 2 drafts) */}
      {phase2Drafts.length > 0 && (
        <div className="mx-auto max-w-3xl px-6 pt-4">
          <DraftSelector
            drafts={phase2Drafts}
            currentDraftId={draftId}
          />
        </div>
      )}

      <ClientForm
        initialData={initialData}
        draftId={draftId}
        clientData={clientData}
        betmgmStatus={betmgmStatus}
      />
    </NewClientLayout>
  )
}
