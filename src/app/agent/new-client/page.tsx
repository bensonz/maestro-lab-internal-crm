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
        idDocument: true,
        intakeStatus: true,
        agentId: true,
        platforms: {
          where: { platformType: 'BETMGM' },
          select: { status: true, screenshots: true },
        },
      },
    })

    if (client && client.agentId === session.user.id) {
      const betmgmPlatform = client.platforms[0]
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
        idDocument: client.idDocument,
        betmgmScreenshots: betmgmPlatform?.screenshots ?? [],
      }
      betmgmStatus = betmgmPlatform?.status ?? 'NOT_STARTED'
      serverPhase = getClientPhase({
        intakeStatus: client.intakeStatus,
        prequalCompleted: client.prequalCompleted,
        betmgmVerified: betmgmPlatform?.status === 'VERIFIED',
      })
    }
  }

  // Fetch pipeline clients — all pre-approval statuses
  const pipelineClients = session?.user?.id
    ? await prisma.client.findMany({
        where: {
          agentId: session.user.id,
          intakeStatus: {
            in: ['PENDING', 'PHONE_ISSUED', 'IN_EXECUTION', 'READY_FOR_APPROVAL'],
          },
        },
        include: { platforms: { where: { platformType: 'BETMGM' } } },
        orderBy: { updatedAt: 'desc' },
      })
    : []

  // Compute phase for each pipeline client and group
  const phase1: { id: string; firstName: string; lastName: string }[] = []
  const phase2: { id: string; firstName: string; lastName: string }[] = []
  const phase3: { id: string; firstName: string; lastName: string }[] = []
  const phase4: { id: string; firstName: string; lastName: string }[] = []

  for (const c of pipelineClients) {
    const betmgmVerified =
      c.platforms.some((p) => p.platformType === 'BETMGM' && p.status === 'VERIFIED')
    const phase = getClientPhase({
      intakeStatus: c.intakeStatus,
      prequalCompleted: c.prequalCompleted,
      betmgmVerified,
    })
    const item = { id: c.id, firstName: c.firstName, lastName: c.lastName }
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

  const phase1Drafts = drafts
    .filter((d) => (d.phase ?? 1) === 1 && !d.clientId)
    .map((d) => ({
      id: d.id,
      formData: d.formData as Record<string, string>,
    }))

  return (
    <NewClientPageClient
      key={clientId ?? draftId ?? 'new'}
      pipelineData={{
        drafts: phase1Drafts,
        phase1,
        phase2,
        phase3,
        phase4,
      }}
      currentClientId={clientId}
      currentDraftId={draftId}
      initialData={initialData}
      clientData={clientData}
      betmgmStatus={betmgmStatus}
      serverPhase={serverPhase}
    />
  )
}
