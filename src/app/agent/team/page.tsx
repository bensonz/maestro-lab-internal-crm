import { MOCK_HIERARCHY, MOCK_TEAM_ROLLUP, MOCK_SESSION } from '@/lib/mock-data'
import { TeamView } from './_components/team-view'

export default function TeamPage() {
  return (
    <TeamView
      hierarchy={MOCK_HIERARCHY}
      rollup={MOCK_TEAM_ROLLUP}
      currentUserId={MOCK_SESSION.user.id}
    />
  )
}
