import { auth } from '@/backend/auth'
import { redirect, notFound } from 'next/navigation'
import { getAgentDetail } from '@/backend/data/backoffice'
import { AgentDetailView } from './_components/agent-detail-view'

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params
  const agent = await getAgentDetail(id)
  if (!agent) notFound()

  return <AgentDetailView agent={agent} />
}
