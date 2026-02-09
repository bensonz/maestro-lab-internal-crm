import { auth } from '@/backend/auth'
import { redirect } from 'next/navigation'
import { ReportsView } from './_components/reports-view'
import {
  getPartnerProfitReport,
  getAgentCommissionReport,
  getClientLTVReport,
} from '@/backend/data/reports'

export default async function ReportsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [partnerReport, agentReport, ltvReport] = await Promise.all([
    getPartnerProfitReport(),
    getAgentCommissionReport(),
    getClientLTVReport(),
  ])

  return (
    <ReportsView
      partnerReport={partnerReport}
      agentReport={agentReport}
      ltvReport={ltvReport}
    />
  )
}
