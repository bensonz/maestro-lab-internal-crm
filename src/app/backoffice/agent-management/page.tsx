import { requireAdmin } from '../_require-admin'
import { AgentList } from './_components/agent-list'
import { getAllApplications, getApplicationStats } from '@/backend/data/applications'
import { getAllAgents, getAgentStats, getActiveAgents } from '@/backend/data/users'
import { getApplicationTimeline } from '@/backend/data/event-logs'
import type { ApplicationTimelineEntry } from '@/backend/data/event-logs'

export default async function AgentManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const session = await requireAdmin()
  const { view } = await searchParams
  const initialViewMode = view === 'tree' ? 'tree' : 'table'

  // Fetch real data in parallel
  let applications: Awaited<ReturnType<typeof getAllApplications>> = []
  let applicationStats = { pending: 0, approved: 0, rejected: 0, total: 0 }
  let activeAgents: { id: string; name: string }[] = []
  let agents: Awaited<ReturnType<typeof getAllAgents>> = []
  let agentStats: Awaited<ReturnType<typeof getAgentStats>> = { totalAgents: 0, newThisMonth: 0 }
  let applicationTimeline: ApplicationTimelineEntry[] = []

  try {
    ;[applications, applicationStats, activeAgents, agents, agentStats, applicationTimeline] = await Promise.all([
      getAllApplications(),
      getApplicationStats(),
      getActiveAgents(),
      getAllAgents(),
      getAgentStats(),
      getApplicationTimeline(),
    ])
  } catch {
    // Database not available — continue with empty data
  }

  // Map DB agents to the UI interface
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const mappedAgents = agents.map((a) => {
    const totalEarned = a.allocations.reduce((s, al) => s + al.amount, 0)
    const thisMonthEarned = a.allocations
      .filter((al) => new Date(al.createdAt) >= startOfMonth)
      .reduce((s, al) => s + al.amount, 0)
    const newClientsThisMonth = a.clientRecords.filter(
      (c) => new Date(c.createdAt) >= startOfMonth,
    ).length

    return {
      id: a.id,
      name: a.name,
      tier: a.tier,
      starLevel: a.starLevel,
      leadershipTier: a.leadershipTier,
      phone: a.phone || '',
      start: new Date(a.createdAt).toLocaleDateString(),
      createdAt: a.createdAt.toISOString(),
      clients: 0,
      working: 0,
      successRate: 0,
      delayRate: 0,
      avgDaysToConvert: null as number | null,
      supervisorId: a.supervisorId,
      zelle: a.zelle || '',
      address: a.address || '',
      totalEarned,
      thisMonthEarned,
      newClientsThisMonth,
    }
  })

  return (
    <AgentList
      agents={mappedAgents}
      stats={{
        totalAgents: agentStats.totalAgents,
        totalTeams: agents.filter((a) => !a.supervisorId).length,
        newClientsMonth: agentStats.newThisMonth,
        avgDaysToOpen: null,
      }}
      currentUserRole={session.role}
      currentUserId={session.id}
      applications={JSON.parse(JSON.stringify(applications))}
      applicationStats={applicationStats}
      activeAgents={activeAgents}
      initialViewMode={initialViewMode}
      applicationTimeline={applicationTimeline}
    />
  )
}
