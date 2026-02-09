import { auth } from '@/backend/auth'
import { redirect } from 'next/navigation'
import { getAgentEarnings } from '@/backend/data/agent'
import { getAgentKPIs } from '@/backend/services/agent-kpis'
import { getAgentHierarchy } from '@/backend/data/hierarchy'
import { EarningsView } from './_components/earnings-view'

export default async function EarningsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [earnings, kpis, hierarchy] = await Promise.all([
    getAgentEarnings(session.user.id),
    getAgentKPIs(session.user.id),
    getAgentHierarchy(session.user.id),
  ])

  return <EarningsView earnings={earnings} kpis={kpis} hierarchy={hierarchy} />
}
