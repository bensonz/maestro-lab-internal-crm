import { getClientsForSettlement } from '@/backend/data/operations'
import { SettlementView } from './_components/settlement-view'

export default async function ClientSettlementPage() {
  const clients = await getClientsForSettlement()

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
      </div>

      {/* Interactive Settlement View */}
      <SettlementView clients={clients} />
    </div>
  )
}
