import { auth } from '@/backend/auth'
import { redirect } from 'next/navigation'
import { getAgentHierarchy, getTeamRollup } from '@/backend/data/hierarchy'
import { TeamView } from './_components/team-view'

export default async function TeamPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [hierarchy, rollup] = await Promise.all([
    getAgentHierarchy(session.user.id),
    getTeamRollup(session.user.id),
  ])

  return (
    <TeamView
      hierarchy={hierarchy}
      rollup={rollup}
      currentUserId={session.user.id}
    />
  )
}
