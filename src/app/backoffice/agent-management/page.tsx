import { requireAdmin } from '../_require-admin'
import { AgentList } from './_components/agent-list'
import { getAllApplications, getApplicationStats } from '@/backend/data/applications'
import { getAllAgents, getAgentStats, getActiveAgents } from '@/backend/data/users'

export default async function AgentManagementPage() {
  const session = await requireAdmin()

  // Fetch real data in parallel
  let applications: Awaited<ReturnType<typeof getAllApplications>> = []
  let applicationStats = { pending: 0, approved: 0, rejected: 0, total: 0 }
  let activeAgents: { id: string; name: string }[] = []
  let agents: Awaited<ReturnType<typeof getAllAgents>> = []
  let agentStats: Awaited<ReturnType<typeof getAgentStats>> = { totalAgents: 0, newThisMonth: 0 }

  try {
    ;[applications, applicationStats, activeAgents, agents, agentStats] = await Promise.all([
      getAllApplications(),
      getApplicationStats(),
      getActiveAgents(),
      getAllAgents(),
      getAgentStats(),
    ])
  } catch {
    // Database not available — continue with empty data
  }

  // Map DB agents to the UI interface
  const mappedAgents = agents.map((a) => ({
    id: a.id,
    name: a.name,
    tier: a.tier,
    starLevel: a.starLevel,
    leadershipTier: a.leadershipTier,
    phone: a.phone || '',
    start: new Date(a.createdAt).toLocaleDateString(),
    clients: 0,
    working: 0,
    successRate: 0,
    delayRate: 0,
    avgDaysToConvert: null as number | null,
  }))

  return (
    <AgentList
      agents={mappedAgents}
      stats={{
        totalAgents: agentStats.totalAgents,
        initiatedApps: applicationStats.total,
        newClientsMonth: agentStats.newThisMonth,
        avgDaysToOpen: null,
      }}
      currentUserRole={session.role}
      currentUserId={session.id}
      applications={JSON.parse(JSON.stringify(applications))}
      applicationStats={applicationStats}
      activeAgents={activeAgents}
    />
  )
}
