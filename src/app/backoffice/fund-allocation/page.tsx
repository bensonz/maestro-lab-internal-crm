import { FundAllocationView } from './_components/fund-allocation-view'
import {
  getFundClients,
  getRecentFundMovements,
  getFundStats,
} from '@/backend/data/fund-allocation'

export default async function FundAllocationPage() {
  let clients: { id: string; name: string }[] = []
  let movements: Awaited<ReturnType<typeof getRecentFundMovements>> = []
  let stats = { externalTotal: 0, internalDeposits: 0, pendingCount: 0 }

  try {
    ;[clients, movements, stats] = await Promise.all([
      getFundClients(),
      getRecentFundMovements(),
      getFundStats(),
    ])
  } catch (e) {
    console.error('[fund-allocation] DB fetch error:', e)
  }

  return (
    <FundAllocationView
      clients={clients}
      movements={movements}
      stats={stats}
    />
  )
}
