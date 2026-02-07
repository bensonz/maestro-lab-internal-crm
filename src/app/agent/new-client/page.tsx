import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { ClientForm } from './_components/client-form'
import { DraftSelector } from './_components/draft-selector'
import { FileText } from 'lucide-react'

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
    <div className="min-h-screen p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary/20 to-chart-3/20 ring-1 ring-primary/20">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {draftId ? 'Continue Application' : 'Start Your Application'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Application Kickstart — Internal Pre-Screen & Review
            </p>
          </div>
        </div>
      </div>

      {/* Draft Selector */}
      <DraftSelector
        drafts={drafts.map((d) => ({
          ...d,
          formData: d.formData as Record<string, string>,
        }))}
        currentDraftId={draftId}
      />

      <ClientForm initialData={initialData} draftId={draftId} />
    </div>
  )
}
