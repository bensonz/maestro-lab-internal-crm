import {
  getFundMovements,
  getClientsForFundAllocation,
  getFundMovementStats,
} from '@/backend/data/operations'
import { FundAllocationView } from './_components/fund-allocation-view'

export default async function FundAllocationPage() {
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
