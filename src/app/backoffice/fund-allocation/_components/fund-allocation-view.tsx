'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Building2,
  CreditCard,
  Zap,
  Trophy,
  Eye,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FundAllocationForm } from './fund-allocation-form'

// ── Types ───────────────────────────────────────────
interface Client {
  id: string
  name: string
}

interface FundMovement {
  id: string
  type: string
  flowType: string
  fromClientName: string
  toClientName: string
  fromPlatform: string
  toPlatform: string
  amount: number
  fee: number | null
  method: string | null
  status: string
  recordedByName: string
  createdAt: string
}

interface Stats {
  externalTotal: number
  internalDeposits: number
  pendingCount: number
}

type CategoryFilter = 'all' | 'internal' | 'external'
type DirectionFilter = 'all' | 'deposit' | 'withdrawal'
type TimeRange = '1D' | '7D' | '30D'

interface FundAllocationViewProps {
  clients: Client[]
  movements: FundMovement[]
  stats: Stats
}

// ── Platform data ──────────────────────────────────
const financialPlatforms = [
  { name: 'Bank', icon: Building2 },
  { name: 'PayPal', icon: CreditCard },
  { name: 'EdgeBoost', icon: Zap },
]

const sportsbookPlatforms = [
  'DraftKings',
  'FanDuel',
  'BetMGM',
  'Caesars',
  'Fanatics',
  'Bally Bet',
  'BetRivers',
  'Bet365',
]

export function FundAllocationView({
  clients,
  movements,
  stats,
}: FundAllocationViewProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [showPlatformModal, setShowPlatformModal] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [directionFilter, setDirectionFilter] =
    useState<DirectionFilter>('all')
  const [timeRange, setTimeRange] = useState<TimeRange>('1D')

  // Filter movements
  const filteredMovements = useMemo(() => {
    let result = movements

    // Time range filter
    const now = new Date()
    const cutoff = new Date(now)
    if (timeRange === '1D') cutoff.setDate(cutoff.getDate() - 1)
    else if (timeRange === '7D') cutoff.setDate(cutoff.getDate() - 7)
    else cutoff.setDate(cutoff.getDate() - 30)
    result = result.filter((m) => new Date(m.createdAt) >= cutoff)

    if (categoryFilter !== 'all') {
      result = result.filter((m) => m.type === categoryFilter)
    }
    if (directionFilter !== 'all') {
      result = result.filter((m) => {
        if (directionFilter === 'deposit')
          return m.flowType === 'same_client' && m.toPlatform !== 'Bank'
        if (directionFilter === 'withdrawal')
          return m.flowType === 'same_client' && m.fromPlatform !== 'Bank'
        return true
      })
    }
    return result
  }, [movements, categoryFilter, directionFilter, timeRange])

  const handlePlatformClick = (platform: string) => {
    setSelectedPlatform(platform)
    setShowPlatformModal(true)
  }

  const handleViewAllClick = () => {
    setSelectedPlatform(null)
    setShowPlatformModal(true)
  }

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Fund Allocation
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Record and track fund movements between platforms and clients
        </p>
      </div>

      {/* Platform Balance Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Platform Balances (Current Totals)
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewAllClick}
            className="gap-1.5 text-xs"
            data-testid="view-all-balances-btn"
          >
            <Eye className="h-3 w-3" />
            View All Details
          </Button>
        </div>

        {/* Financial Platforms */}
        <div className="grid grid-cols-3 gap-3">
          {financialPlatforms.map((platform) => (
            <Card
              key={platform.name}
              className="card-terminal cursor-pointer transition-all hover:border-primary"
              onClick={() => handlePlatformClick(platform.name)}
              data-testid={`balance-card-${platform.name.toLowerCase()}`}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                      <platform.icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {platform.name}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-semibold text-success">
                    $0
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sportsbook Platforms */}
        <div className="grid grid-cols-4 gap-2 lg:grid-cols-8">
          {sportsbookPlatforms.map((name) => (
            <Card
              key={name}
              className="card-terminal cursor-pointer transition-all hover:border-warning"
              onClick={() => handlePlatformClick(name)}
              data-testid={`balance-card-${name.toLowerCase().replace(/\s/g, '-')}`}
            >
              <CardContent className="p-2">
                <div className="text-center">
                  <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded bg-warning/20 text-warning">
                    <Trophy className="h-3 w-3" />
                  </div>
                  <p className="truncate text-[10px] font-medium text-muted-foreground">
                    {name}
                  </p>
                  <p className="font-mono text-xs font-semibold text-foreground">
                    $0
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Period Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="card-terminal" data-testid="stat-external">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/20">
                <DollarSign className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  External ({timeRange === '1D' ? 'Today' : timeRange === '7D' ? 'This Week' : 'This Month'})
                </p>
                <p className="font-mono text-sm font-semibold">
                  ${stats.externalTotal.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-terminal" data-testid="stat-int-deposits">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/20">
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Int. Deposits ({timeRange === '1D' ? 'Today' : timeRange === '7D' ? 'This Week' : 'This Month'})
                </p>
                <p className="font-mono text-sm font-semibold">
                  ${stats.internalDeposits.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-terminal" data-testid="stat-int-withdrawals">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/20">
                <TrendingDown className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Int. Withdrawals ({timeRange === '1D' ? 'Today' : timeRange === '7D' ? 'This Week' : 'This Month'})
                </p>
                <p className="font-mono text-sm font-semibold">$0</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-terminal" data-testid="stat-pending">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Pending Review
                </p>
                <p className="font-mono text-sm font-semibold">
                  {stats.pendingCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content: 2-column grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Allocation Form */}
        <FundAllocationForm clients={clients} movements={movements} />

        {/* Right: Fund Movements List */}
        <Card className="card-terminal">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Fund Movements ({filteredMovements.length})
              </CardTitle>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center justify-between gap-4">
              {/* Category Pills */}
              <div className="flex items-center gap-2">
                <div className="flex overflow-hidden rounded-lg border border-border">
                  <button
                    onClick={() => {
                      setCategoryFilter('all')
                      setDirectionFilter('all')
                    }}
                    className={cn(
                      'px-4 py-2 text-sm font-medium transition-colors',
                      categoryFilter === 'all'
                        ? 'bg-muted text-foreground'
                        : 'bg-transparent text-muted-foreground hover:bg-muted/50',
                    )}
                    data-testid="filter-all"
                  >
                    All
                  </button>
                  <button
                    onClick={() => {
                      setCategoryFilter('external')
                      setDirectionFilter('all')
                    }}
                    className={cn(
                      'border-l border-border px-4 py-2 text-sm font-medium transition-colors',
                      categoryFilter === 'external'
                        ? 'bg-warning text-warning-foreground'
                        : 'bg-transparent text-muted-foreground hover:bg-muted',
                    )}
                    data-testid="filter-external"
                  >
                    External
                  </button>
                  <button
                    onClick={() => setCategoryFilter('internal')}
                    className={cn(
                      'border-l border-border px-4 py-2 text-sm font-medium transition-colors',
                      categoryFilter === 'internal'
                        ? 'bg-success text-success-foreground'
                        : 'bg-transparent text-muted-foreground hover:bg-muted',
                    )}
                    data-testid="filter-internal"
                  >
                    Internal
                  </button>
                </div>

                {/* Sub-pills for Internal */}
                {categoryFilter === 'internal' && (
                  <div className="ml-2 flex overflow-hidden rounded-lg border border-border">
                    <button
                      onClick={() => setDirectionFilter('all')}
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium transition-colors',
                        directionFilter === 'all'
                          ? 'bg-muted text-foreground'
                          : 'bg-transparent text-muted-foreground hover:bg-muted/50',
                      )}
                      data-testid="filter-direction-all"
                    >
                      All
                    </button>
                    <button
                      onClick={() => setDirectionFilter('deposit')}
                      className={cn(
                        'border-l border-border px-3 py-1.5 text-xs font-medium transition-colors',
                        directionFilter === 'deposit'
                          ? 'bg-success/20 text-success'
                          : 'bg-transparent text-muted-foreground hover:bg-muted/50',
                      )}
                      data-testid="filter-direction-deposit"
                    >
                      Deposit
                    </button>
                    <button
                      onClick={() => setDirectionFilter('withdrawal')}
                      className={cn(
                        'border-l border-border px-3 py-1.5 text-xs font-medium transition-colors',
                        directionFilter === 'withdrawal'
                          ? 'bg-destructive/20 text-destructive'
                          : 'bg-transparent text-muted-foreground hover:bg-muted/50',
                      )}
                      data-testid="filter-direction-withdrawal"
                    >
                      Withdrawal
                    </button>
                  </div>
                )}
              </div>

              {/* Time Range Pills */}
              <div className="flex overflow-hidden rounded-lg border border-border">
                {(['1D', '7D', '30D'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium transition-colors',
                      range !== '1D' && 'border-l border-border',
                      timeRange === range
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-transparent text-muted-foreground hover:bg-muted/50',
                    )}
                    data-testid={`filter-time-${range.toLowerCase()}`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="max-h-[500px] overflow-y-auto p-0">
            {filteredMovements.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                No transactions found
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredMovements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between p-3 transition-all hover:bg-muted/30"
                    data-testid={`movement-row-${movement.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold',
                          movement.type === 'internal'
                            ? 'bg-success/20 text-success'
                            : 'bg-warning/20 text-warning',
                        )}
                      >
                        {movement.type === 'internal' ? 'INT' : 'EXT'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="font-medium">
                            {movement.fromPlatform}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">
                            {movement.toPlatform}
                          </span>
                          {movement.method && (
                            <Badge
                              variant="outline"
                              className="ml-1 text-[10px]"
                            >
                              {movement.method.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="h-2.5 w-2.5" />
                            {movement.createdAt}
                          </span>
                          <span className="text-muted-foreground">&bull;</span>
                          <span className="flex items-center gap-1 text-[10px] text-primary">
                            <User className="h-2.5 w-2.5" />
                            {movement.fromClientName}
                            {movement.flowType === 'different_clients' && (
                              <>
                                <ArrowRight className="h-2 w-2" />
                                {movement.toClientName}
                              </>
                            )}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {movement.flowType === 'same_client'
                              ? 'same'
                              : movement.flowType === 'different_clients'
                                ? 'diff'
                                : 'ext'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <p className="font-mono text-sm font-semibold">
                          ${movement.amount.toLocaleString()}
                          {movement.fee && movement.fee > 0 && (
                            <span className="ml-1 text-[10px] text-muted-foreground">
                              (+${movement.fee} fee)
                            </span>
                          )}
                        </p>
                        <Badge
                          className={cn(
                            'text-[10px]',
                            movement.status === 'completed' &&
                              'bg-success/20 text-success',
                            movement.status === 'pending' &&
                              'bg-warning/20 text-warning',
                          )}
                        >
                          {movement.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform Balance Detail Modal */}
      <Dialog open={showPlatformModal} onOpenChange={setShowPlatformModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedPlatform ? (
                <>
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      ['Bank', 'PayPal', 'EdgeBoost'].includes(
                        selectedPlatform,
                      )
                        ? 'bg-primary/20 text-primary'
                        : 'bg-warning/20 text-warning',
                    )}
                  >
                    {selectedPlatform === 'Bank' ? (
                      <Building2 className="h-5 w-5" />
                    ) : selectedPlatform === 'PayPal' ? (
                      <CreditCard className="h-5 w-5" />
                    ) : selectedPlatform === 'EdgeBoost' ? (
                      <Zap className="h-5 w-5" />
                    ) : (
                      <Trophy className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <span className="text-lg">
                      {selectedPlatform} Balances
                    </span>
                    <p className="text-sm font-normal text-muted-foreground">
                      Total:{' '}
                      <span className="font-mono font-semibold text-foreground">
                        $0
                      </span>
                    </p>
                  </div>
                </>
              ) : (
                <span className="text-lg">All Platform Balances</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="mt-4 max-h-[400px]">
            <div className="py-8 text-center text-sm text-muted-foreground">
              No clients with non-zero balance
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
