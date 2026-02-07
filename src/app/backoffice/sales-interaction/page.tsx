import {
  getSalesInteractionStats,
  getAgentHierarchy,
  getIntakeClients,
  getVerificationClients,
} from '@/backend/data/operations'
import { SalesInteractionView } from './_components/sales-interaction-view'

export default async function SalesInteractionPage() {
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
