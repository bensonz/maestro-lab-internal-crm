import { MOCK_PROFIT_SHARING_DATA } from '@/lib/mock-data'
import { ProfitSharingView } from './_components/profit-sharing-view'

export default function ProfitSharingPage() {
  return (
    <div
      className="space-y-6 p-6 animate-fade-in"
      data-testid="profit-sharing-page"
    >
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Profit Sharing Rules
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure how profits are split with partners and manage pending
          payouts
        </p>
      </div>

      <ProfitSharingView data={MOCK_PROFIT_SHARING_DATA} />
    </div>
  )
}
