import { getFundMovements, getClientsForFundAllocation, getFundMovementStats } from '@/backend/data/operations'
import { Card, CardContent } from '@/components/ui/card'
import {
  Building2,
  Wallet,
  Zap,
  DollarSign,
  ArrowDownCircle,
  Clock,
} from 'lucide-react'
import { FundAllocationForm } from './_components/fund-allocation-form'

export default async function FundAllocationPage() {
  const [movements, clients, stats] = await Promise.all([
    getFundMovements(),
    getClientsForFundAllocation(),
    getFundMovementStats(),
  ])

  // Platform balances would need proper tracking - showing zeros for now
  const platformBalances = [
    { name: 'Bank', balance: 0, icon: Building2, color: 'text-chart-4' },
    { name: 'PayPal', balance: 0, icon: Wallet, color: 'text-chart-4' },
    { name: 'EdgeBoost', balance: 0, icon: Zap, color: 'text-chart-4' },
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

  const summaryStats = [
    {
      label: 'External (Today)',
      value: `$${stats.externalTotal.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-chart-4',
      bg: 'bg-chart-4/10 ring-1 ring-chart-4/20',
    },
    {
      label: 'Int. Deposits (Today)',
      value: `$${stats.internalDeposits.toLocaleString()}`,
      icon: ArrowDownCircle,
      color: 'text-primary',
      bg: 'bg-primary/10 ring-1 ring-primary/20',
    },
    {
      label: 'Pending Review',
      value: stats.pendingCount > 0 ? String(stats.pendingCount) : '0',
      icon: Clock,
      color: 'text-accent',
      bg: 'bg-accent/10 ring-1 ring-accent/20',
    },
  ]

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Fund Allocation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Record and track fund movements between platforms and clients
        </p>
      </div>

      {/* Platform Balances */}
      <div>
        <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Platform Balances (Current Totals)
        </h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {platformBalances.map((platform) => (
            <Card key={platform.name} className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="p-2 rounded-lg bg-muted/50">
                  <platform.icon className={`h-5 w-5 ${platform.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{platform.name}</p>
                  <p className="text-lg font-semibold font-mono text-foreground">
                    ${platform.balance.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-8 gap-4">
          {sportsbooks.map((sb) => (
            <Card key={sb.name} className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground truncate mb-1">{sb.name}</p>
                <p className="text-sm font-semibold font-mono text-muted-foreground/60">
                  ${sb.balance.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        {summaryStats.map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                <p className={`text-lg font-semibold font-mono ${stat.color}`}>{stat.value}</p>
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
