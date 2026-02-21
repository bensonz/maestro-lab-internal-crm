import { requireAgent } from '../_require-agent'
import { getDraftsByCloser, getDraftByIdForAgent } from '@/backend/data/client-drafts'
import { NewClientView } from './_components/new-client-view'

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>
}) {
  const agent = await requireAgent()

  const params = await searchParams

  let drafts: Awaited<ReturnType<typeof getDraftsByCloser>> = []
  try {
    drafts = await getDraftsByCloser(agent.id)
  } catch {
    // DB not available
  }

  let selectedDraft: Awaited<ReturnType<typeof getDraftByIdForAgent>> = null
  if (params.draft) {
    try {
      selectedDraft = await getDraftByIdForAgent(params.draft, agent.id)
    } catch {
      // Draft not found or DB issue
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] animate-fade-in" data-testid="new-client-page">
      <NewClientView
        drafts={drafts.map((d) => ({
          ...d,
          updatedAt: d.updatedAt.toISOString(),
        }))}
        selectedDraft={
          selectedDraft
            ? {
                ...selectedDraft,
                idExpiry: selectedDraft.idExpiry?.toISOString() ?? null,
                createdAt: selectedDraft.createdAt.toISOString(),
                updatedAt: selectedDraft.updatedAt.toISOString(),
              }
            : null
        }
      />
    </div>
  )
}
