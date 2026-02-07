import { auth } from '@/backend/auth'
import { redirect } from 'next/navigation'
import { UserRole } from '@/types'
import {
  getFundMovements,
  getClientsForFundAllocation,
  getFundMovementStats,
} from '@/backend/data/operations'
import { FundAllocationView } from './_components/fund-allocation-view'

export default async function FundAllocationPage() {
  const session = await auth()
  const allowedRoles: string[] = [UserRole.ADMIN, UserRole.BACKOFFICE]
  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    redirect('/login')
  }

  const [movements, clients, stats] = await Promise.all([
    getFundMovements(),
    getClientsForFundAllocation(),
    getFundMovementStats(),
  ])

  return (
    <FundAllocationView
      clients={clients}
      movements={movements}
      stats={stats}
    />
  )
}
