import { MOCK_AGENT_CLIENTS, MOCK_CLIENT_STATS } from '@/lib/mock-data'
import { ClientsView } from './_components/clients-view'
import { requireAgent } from '../_require-agent'
import { getClientsByCloser } from '@/backend/data/clients'
import { getDraftsByCloser } from '@/backend/data/client-drafts'
import { IntakeStatus } from '@/types'
import { ALL_PLATFORMS } from '@/lib/platforms'
import type { AgentClient, AgentDraft } from './_components/types'

function mapClientStatus(status: string): IntakeStatus {
  switch (status) {
    case 'APPROVED': return IntakeStatus.APPROVED
    case 'REJECTED': return IntakeStatus.REJECTED
    case 'IN_PROGRESS': return IntakeStatus.IN_EXECUTION
    case 'CLOSED': return IntakeStatus.PARTNERSHIP_ENDED
    case 'PENDING':
    default: return IntakeStatus.PENDING
  }
}

/** Compute inner-step progress for a draft based on its current step */
function computeInnerStepProgress(draft: Awaited<ReturnType<typeof getDraftsByCloser>>[number]): { completed: number; total: number } {
  switch (draft.step) {
    case 1: {
      // 3 inner-steps: ID doc, Gmail, BetMGM check
      const total = 3
      let completed = 0
      if (draft.idDocument) completed++
      if (draft.assignedGmail) completed++
      if (draft.betmgmCheckPassed != null) completed++
      return { completed, total }
    }
    case 2: {
      // 4 inner-steps: SSN, Address, Criminal record, History
      const total = 4
      let completed = 0
      if (draft.ssnDocument) completed++
      if (draft.secondAddress) completed++
      if (draft.hasCriminalRecord != null) completed++
      if (draft.bankingHistory) completed++
      return { completed, total }
    }
    case 3: {
      // 11 inner-steps: one per platform registration
      const total = ALL_PLATFORMS.length // 11
      let completed = 0
      if (draft.platformData && typeof draft.platformData === 'object') {
        const pd = draft.platformData as Record<string, Record<string, unknown>>
        for (const key of ALL_PLATFORMS) {
          const entry = pd[key]
          if (entry && (entry.username || entry.accountId || entry.screenshot)) {
            completed++
          }
        }
      }
      return { completed, total }
    }
    case 4: {
      // 11 inner-steps: backoffice verifies login credentials for all 11 platforms
      const total = ALL_PLATFORMS.length // 11
      // For now, agents see 0/11 — verification is done by backoffice
      // TODO: read platform verification status from draft when backoffice marks them
      let completed = 0
      if (draft.contractDocument) completed++ // count contract upload as 1 for now
      return { completed: Math.min(completed, total), total }
    }
    default:
      return { completed: 0, total: 3 }
  }
}

function getStatusLabel(status: string): { label: string; color: string } {
  switch (status) {
    case 'APPROVED': return { label: 'Approved', color: 'text-success' }
    case 'REJECTED': return { label: 'Rejected', color: 'text-destructive' }
    case 'IN_PROGRESS': return { label: 'In Progress', color: 'text-primary' }
    case 'CLOSED': return { label: 'Closed', color: 'text-muted-foreground' }
    case 'PENDING':
    default: return { label: 'Pending', color: 'text-warning' }
  }
}

export default async function MyClientsPage() {
  const agent = await requireAgent()

  // Fetch drafts and DB clients in parallel
  let dbClients: Awaited<ReturnType<typeof getClientsByCloser>> = []
  let dbDrafts: Awaited<ReturnType<typeof getDraftsByCloser>> = []
  try {
    ;[dbClients, dbDrafts] = await Promise.all([
      getClientsByCloser(agent.id),
      getDraftsByCloser(agent.id),
    ])
  } catch {
    // DB not available
  }

  // Map drafts to AgentDraft format
  const drafts: AgentDraft[] = dbDrafts.map((d) => {
    const { completed, total } = computeInnerStepProgress(d)
    return {
      id: d.id,
      name: d.firstName && d.lastName
        ? `${d.firstName} ${d.lastName}`
        : d.firstName || 'Untitled Draft',
      step: d.step,
      innerStepCompleted: completed,
      innerStepTotal: total,
      updatedAt: d.updatedAt.toISOString(),
      lastUpdated: d.updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }
  })

  // If we have real clients or drafts, map them; otherwise fall back to mock data
  if (dbClients.length > 0 || drafts.length > 0) {
    // Filter out PENDING clients (they exist as drafts, not yet approved)
    const clients: AgentClient[] = dbClients
      .filter((c) => c.status !== 'PENDING')
      .map((c) => {
        const { label, color } = getStatusLabel(c.status)
        return {
          id: c.id,
          name: `${c.firstName} ${c.lastName}`,
          intakeStatus: mapClientStatus(c.status),
          status: label,
          statusColor: color,
          nextTask: null,
          step: c.status === 'APPROVED' ? 1 : 0,
          totalSteps: 1,
          progress: c.status === 'APPROVED' ? 100 : 0,
          lastUpdated: c.updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          updatedAt: c.updatedAt.toISOString(),
          deadline: null,
        }
      })

    const inProgressClientCount = clients.filter((c) =>
      c.intakeStatus === IntakeStatus.IN_EXECUTION ||
      c.intakeStatus === IntakeStatus.PENDING ||
      c.intakeStatus === IntakeStatus.READY_FOR_APPROVAL
    ).length
    const stats = {
      total: clients.length,
      inProgress: inProgressClientCount + drafts.length,
      verificationNeeded: 0,
      approved: clients.filter((c) => c.intakeStatus === IntakeStatus.APPROVED).length,
      rejected: clients.filter((c) => c.intakeStatus === IntakeStatus.REJECTED).length,
      aborted: 0,
      draftsCount: drafts.length,
    }

    return (
      <div className="flex h-[calc(100vh-4rem)] animate-fade-in">
        <ClientsView clients={clients} drafts={drafts} stats={stats} />
      </div>
    )
  }

  // Fallback to mock data
  const mockStats = {
    total: MOCK_CLIENT_STATS.total,
    inProgress: MOCK_CLIENT_STATS.inProgress + MOCK_CLIENT_STATS.pendingApproval,
    verificationNeeded: MOCK_CLIENT_STATS.verificationNeeded,
    approved: MOCK_CLIENT_STATS.approved,
    rejected: MOCK_CLIENT_STATS.rejected,
    aborted: MOCK_CLIENT_STATS.aborted,
    draftsCount: 0,
  }
  return (
    <div className="flex h-[calc(100vh-4rem)] animate-fade-in">
      <ClientsView
        clients={MOCK_AGENT_CLIENTS}
        drafts={[]}
        stats={mockStats}
      />
    </div>
  )
}
