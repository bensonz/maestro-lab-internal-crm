import {
  MOCK_FUND_MOVEMENTS,
  MOCK_FUND_CLIENTS,
  MOCK_FUND_STATS,
} from '@/lib/mock-data'
import { FundAllocationView } from './_components/fund-allocation-view'

export default function FundAllocationPage() {
  return (
    <FundAllocationView
      clients={MOCK_FUND_CLIENTS}
      movements={MOCK_FUND_MOVEMENTS}
      stats={MOCK_FUND_STATS}
    />
  )
}
