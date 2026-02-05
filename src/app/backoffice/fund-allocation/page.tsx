import { getFundMovements, getClientsForFundAllocation } from '@/backend/data/operations'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Building2,
  Wallet,
  Zap,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  Eye,
} from 'lucide-react'
import { FundAllocationForm } from './_components/fund-allocation-form'

export default async function FundAllocationPage() {
  const [movements, clients] = await Promise.all([
    getFundMovements(),
    getClientsForFundAllocation(),
  ])

  // Platform balances would need proper tracking - showing zeros for now
  const platformBalances = [
    { name: 'Bank', balance: 0, icon: Building2, color: 'text-emerald-500' },
    { name: 'PayPal', balance: 0, icon: Wallet, color: 'text-emerald-500' },
    { name: 'EdgeBoost', balance: 0, icon: Zap, color: 'text-emerald-500' },
  ]

  const sportsbooks = [
    { name: 'DraftKings', balance: 0 },
    { name: 'FanDuel', balance: 0 },
    { name: 'BetMGM', balance: 0 },
    { name: 'Caesars', balance: 0 },
    { name: 'Fanatics', balance: 0 },
    { name: 'Bally Bet', balance: 0 },
    { name: 'BetRivers', balance: 0 },
    { name: 'Bet365', balance: 0 },
  ]

  // Calculate summary stats from movements
  const pendingCount = movements.filter((m) => m.status === 'pending').length
  const pendingAmount = movements
    .filter((m) => m.status === 'pending')
    .reduce((sum, m) => sum + m.amount, 0)

  const summaryStats = [
    { label: 'External (Today)', value: '$0', icon: DollarSign, color: 'text-emerald-500' },
    { label: 'Int. Deposits (Today)', value: '$0', icon: ArrowDownCircle, color: 'text-emerald-500' },
    { label: 'Int. Withdrawals (Today)', value: '$0', icon: ArrowUpCircle, color: 'text-red-500' },
    { label: 'Pending Review', value: pendingCount > 0 ? `${pendingCount} ($${pendingAmount.toLocaleString()})` : '0', icon: Clock, color: 'text-amber-500' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fund Allocation</h1>
          <p className="text-slate-400">Record and track fund movements between platforms and clients</p>
        </div>
        <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
          <Eye className="mr-2 h-4 w-4" />
          View All Details
        </Button>
      </div>

      {/* Platform Balances */}
      <div>
        <h2 className="text-sm font-medium text-slate-400 mb-3">PLATFORM BALANCES (CURRENT TOTALS)</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {platformBalances.map((platform) => (
            <Card key={platform.name} className="bg-slate-900 border-slate-800">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="p-2 rounded-lg bg-slate-800">
                  <platform.icon className={`h-5 w-5 ${platform.color}`} />
                </div>
                <div>
                  <p className="text-sm text-slate-400">{platform.name}</p>
                  <p className="text-lg font-semibold text-slate-300">
                    ${platform.balance.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-8 gap-4">
          {sportsbooks.map((sb) => (
            <Card key={sb.name} className="bg-slate-900 border-slate-800">
              <CardContent className="p-3 text-center">
                <div className="mx-auto mb-2 p-2 rounded-lg bg-slate-800 w-fit">
                  <span className="text-amber-500 text-lg">🏆</span>
                </div>
                <p className="text-xs text-slate-400 truncate">{sb.name}</p>
                <p className="text-sm font-semibold text-slate-500">
                  ${sb.balance.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        {summaryStats.map((stat) => (
          <Card key={stat.label} className="bg-slate-900 border-slate-800">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-lg bg-slate-800">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase">{stat.label}</p>
                <p className={`text-lg font-semibold ${stat.color}`}>{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Form and Movements */}
      <FundAllocationForm clients={clients} movements={movements} />
    </div>
  )
}
