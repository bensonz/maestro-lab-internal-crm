import { getClientsForSettlement } from '@/backend/data/operations'
import { SettlementView } from './_components/settlement-view'

export default async function ClientSettlementPage() {
  const clients = await getClientsForSettlement()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Client Settlement</h1>
        <p className="text-slate-400">View deposits, withdrawals, and platform breakdowns per client</p>
      </div>

      {/* Interactive Settlement View */}
      <SettlementView clients={clients} />
    </div>
  )
}
