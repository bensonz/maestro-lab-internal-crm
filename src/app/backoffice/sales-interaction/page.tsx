import { auth } from '@/backend/auth'
import { redirect } from 'next/navigation'
import { UserRole } from '@/types'
import {
  getSalesInteractionStats,
  getAgentHierarchy,
  getIntakeClients,
  getVerificationClients,
} from '@/backend/data/operations'
import { SalesInteractionView } from './_components/sales-interaction-view'

export default async function SalesInteractionPage() {
  const session = await auth()
  const allowedRoles: string[] = [UserRole.ADMIN, UserRole.BACKOFFICE]
  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    redirect('/login')
  }

  const [stats, hierarchy, intake, tasks] = await Promise.all([
    getSalesInteractionStats(),
    getAgentHierarchy(),
    getIntakeClients(),
    getVerificationClients(),
  ])

  return (
    <SalesInteractionView
      stats={stats}
      agentHierarchy={hierarchy}
      clientIntake={intake}
      verificationTasks={tasks}
    />
  )
}
