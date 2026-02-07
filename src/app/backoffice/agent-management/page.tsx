import {
  getAllAgents,
  getAllUsers,
  getAgentStats,
} from '@/backend/data/backoffice'
import { auth } from '@/backend/auth'
import { redirect } from 'next/navigation'
import { ExportCSVButton } from '@/components/export-csv-button'
import { AgentList } from './_components/agent-list'
import { CreateUserDialog } from './_components/create-user-dialog'

export default async function AgentManagementPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [agents, users, stats] = await Promise.all([
    getAllAgents(),
    getAllUsers(),
    getAgentStats(),
  ])

  return (
    <AgentList
      agents={agents}
      users={users}
      stats={stats}
      currentUserRole={session.user.role}
      currentUserId={session.user.id}
      exportButton={
        <ExportCSVButton
          href="/api/export/agents"
          data-testid="export-agents-csv"
        />
      }
      createUserDialog={
        <CreateUserDialog currentUserRole={session.user.role} />
      }
    />
  )
}
