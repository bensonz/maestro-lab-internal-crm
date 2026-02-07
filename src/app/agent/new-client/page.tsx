import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { ClientForm } from './_components/client-form'
import { DraftSelector } from './_components/draft-selector'

interface Props {
  searchParams: Promise<{ draft?: string }>
}

export default async function NewClientPage({ searchParams }: Props) {
  const { draft: draftId } = await searchParams
  const session = await auth()

  let initialData: Record<string, string> | null = null

  // Fetch all drafts for this agent (for the selector)
  const drafts = session?.user?.id
    ? await prisma.applicationDraft.findMany({
        where: { agentId: session.user.id },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, formData: true, updatedAt: true },
      })
    : []

  if (draftId && session?.user?.id) {
    const draft = drafts.find((d) => d.id === draftId)
    if (draft) {
      initialData = draft.formData as Record<string, string>
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Draft Selector */}
      <div className="mx-auto max-w-3xl px-6 pt-4">
        <DraftSelector
          drafts={drafts.map((d) => ({
            ...d,
            formData: d.formData as Record<string, string>,
          }))}
          currentDraftId={draftId}
        />
      </div>

      <ClientForm initialData={initialData} draftId={draftId} />
    </div>
  )
}
