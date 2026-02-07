import { getClientsForSettlement } from '@/backend/data/operations'
import { ExportCSVButton } from '@/components/export-csv-button'
import { SettlementView } from './_components/settlement-view'

export default async function ClientSettlementPage() {
  const clients = await getClientsForSettlement()

  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="settlement-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Client Settlement
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View deposits, withdrawals, and platform breakdowns per client
          </p>
        </div>
        <ExportCSVButton
          href="/api/export/settlements"
          data-testid="export-settlements-csv"
        />
      </div>

      {/* Interactive Settlement View */}
      <SettlementView clients={clients} />
    </div>
  )
}
