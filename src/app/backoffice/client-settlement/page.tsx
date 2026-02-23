import { MOCK_SETTLEMENT_CLIENTS } from '@/lib/mock-data'
import { SettlementView } from './_components/settlement-view'
import { ExportDropdown } from './_components/export-dropdown'

export default function ClientSettlementPage() {
  return (
    <div className="space-y-6 p-6 animate-fade-in" data-testid="settlement-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Client Settlement
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View deposits, withdrawals, and platform breakdowns per client
          </p>
        </div>
        <ExportDropdown />
      </div>

      {/* Interactive Settlement View */}
      <SettlementView clients={MOCK_SETTLEMENT_CLIENTS} />
    </div>
  )
}
