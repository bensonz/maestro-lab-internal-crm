import { requireAgent } from '../_require-agent'
import { getRecordsByCloser, getRecordByIdForAgent } from '@/backend/data/client-records'
import { getAssignmentForRecord } from '@/backend/data/phone-assignments'
import { ensureGeneratedCredentials } from '@/backend/services/credential-generator'
import { NewClientView } from './_components/new-client-view'

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string; step?: string }>
}) {
  const agent = await requireAgent()

  const params = await searchParams

  let drafts: Awaited<ReturnType<typeof getRecordsByCloser>> = []
  try {
    drafts = await getRecordsByCloser(agent.id)
  } catch {
    // DB not available
  }

  let selectedDraft: Awaited<ReturnType<typeof getRecordByIdForAgent>> = null
  if (params.draft) {
    try {
      selectedDraft = await getRecordByIdForAgent(params.draft, agent.id)
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
  let activeAssignment: Awaited<ReturnType<typeof getAssignmentForRecord>> = null
  if (selectedDraft) {
    try {
      activeAssignment = await getAssignmentForRecord(selectedDraft.id)
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
                discoveredAddresses: (selectedDraft as Record<string, unknown>).discoveredAddresses ?? null,
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
