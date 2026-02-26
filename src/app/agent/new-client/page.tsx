import { requireAgent } from '../_require-agent'
import { getDraftsByCloser, getDraftByIdForAgent } from '@/backend/data/client-drafts'
import { getAssignmentForDraft } from '@/backend/data/phone-assignments'
import { ensureGeneratedCredentials } from '@/backend/services/credential-generator'
import { NewClientView } from './_components/new-client-view'

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string; step?: string }>
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

  // Ensure generated credentials exist (generate once, persist forever)
  if (selectedDraft) {
    try {
      selectedDraft = await ensureGeneratedCredentials(selectedDraft)
    } catch {
      // Non-critical — form will work without persisted credentials
    }
  }

  // Load phone assignment for the selected draft (any status — keep visible after return)
  let activeAssignment: Awaited<ReturnType<typeof getAssignmentForDraft>> = null
  if (selectedDraft) {
    try {
      activeAssignment = await getAssignmentForDraft(selectedDraft.id)
    } catch {
      // DB not available
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] animate-fade-in" data-testid="new-client-page">
      <NewClientView
        initialStep={params.step ? parseInt(params.step, 10) : undefined}
        drafts={drafts.map((d) => ({
          ...d,
          updatedAt: d.updatedAt.toISOString(),
        }))}
        selectedDraft={
          selectedDraft
            ? {
                ...selectedDraft,
                idExpiry: selectedDraft.idExpiry?.toISOString() ?? null,
                dateOfBirth: selectedDraft.dateOfBirth?.toISOString() ?? null,
                createdAt: selectedDraft.createdAt.toISOString(),
                updatedAt: selectedDraft.updatedAt.toISOString(),
              }
            : null
        }
        activeAssignment={
          activeAssignment
            ? {
                phoneNumber: activeAssignment.phoneNumber,
                signedOutAt: activeAssignment.signedOutAt.toISOString(),
                dueBackAt: activeAssignment.dueBackAt.toISOString(),
                status: activeAssignment.status,
              }
            : null
        }
      />
    </div>
  )
}
