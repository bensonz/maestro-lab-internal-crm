import { MOCK_AGENT_DETAIL } from '@/lib/mock-data'
import { getAgentIdList } from '@/backend/data/users'
import { AgentDetailView } from './_components/agent-detail-view'

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const agentIds = await getAgentIdList()
  const currentIndex = agentIds.indexOf(id)
  const prevAgentId = currentIndex > 0 ? agentIds[currentIndex - 1] : null
  const nextAgentId = currentIndex < agentIds.length - 1 ? agentIds[currentIndex + 1] : null

  return (
    <AgentDetailView
      agent={MOCK_AGENT_DETAIL}
      prevAgentId={prevAgentId}
      nextAgentId={nextAgentId}
    />
  )
}
