'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import {
  Search,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SettlementClient } from '@/backend/data/operations'

interface SettlementViewProps {
  clients: SettlementClient[]
}

type TransactionFilter = 'all' | 'deposit' | 'withdrawal'

export function SettlementView({ clients }: SettlementViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [txFilter, setTxFilter] = useState<TransactionFilter>('all')
  const [expandedPlatforms, setExpandedPlatforms] = useState<string[]>([])

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const selected = clients.find((c) => c.id === selectedClientId)

  const filteredTransactions = selected
    ? selected.recentTransactions.filter(
        (tx) => txFilter === 'all' || tx.type === txFilter,
      )
    : []

  const togglePlatform = (name: string) => {
    setExpandedPlatforms((prev) =>
      prev.includes(name)
        ? prev.filter((p) => p !== name)
        : [...prev, name],
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Client List */}
      <Card className="card-terminal" data-testid="settlement-client-list">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Clients
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="settlement-search"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredClients.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {clients.length === 0
                ? 'No clients with settlement activity'
                : 'No clients match your search'}
            </p>
          ) : (
            filteredClients.map((client) => (
              <button
                key={client.id}
                onClick={() => {
                  setSelectedClientId(client.id)
                  setTxFilter('all')
                }}
                className={cn(
                  'w-full rounded-lg border p-3 text-left transition-all',
                  selectedClientId === client.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-muted-foreground',
                )}
                data-testid={`client-card-${client.id}`}
              >
                <p className="font-medium">{client.name}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-mono text-xs text-success">
                    +${client.totalDeposited.toLocaleString()}
                  </span>
                  <span className="font-mono text-xs text-destructive">
                    -${client.totalWithdrawn.toLocaleString()}
                  </span>
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {/* Settlement Details */}
      <div className="space-y-6 lg:col-span-2">
        {selected ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="card-terminal">
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Total Deposited
                  </p>
                  <p
                    className="mt-1 text-2xl font-mono font-semibold text-success"
                    data-testid="total-deposited"
                  >
                    ${selected.totalDeposited.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card className="card-terminal">
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Total Withdrawn
                  </p>
                  <p
                    className="mt-1 text-2xl font-mono font-semibold text-destructive"
                    data-testid="total-withdrawn"
                  >
                    ${selected.totalWithdrawn.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card className="card-terminal">
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Net Balance
                  </p>
                  <p
                    className="mt-1 text-2xl font-mono font-semibold text-primary"
                    data-testid="net-balance"
                  >
                    ${selected.netBalance.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Platform Breakdown */}
            <Card className="card-terminal">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Platform Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selected.platforms.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No platform activity
                  </p>
                ) : (
                  selected.platforms.map((platform) => (
                    <Collapsible
                      key={platform.name}
                      open={expandedPlatforms.includes(platform.name)}
                      onOpenChange={() => togglePlatform(platform.name)}
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          className="flex w-full items-center justify-between rounded-lg border border-border p-3 transition-all hover:bg-muted/30"
                          data-testid={`platform-${platform.name}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/20">
                              <DollarSign className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium">{platform.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-mono text-sm text-success">
                              +${platform.deposited.toLocaleString()}
                            </span>
                            <span className="font-mono text-sm text-destructive">
                              -${platform.withdrawn.toLocaleString()}
                            </span>
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 text-muted-foreground transition-transform',
                                expandedPlatforms.includes(platform.name) &&
                                  'rotate-180',
                              )}
                            />
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-11 mt-2 space-y-1">
                          <div className="flex items-center justify-between rounded bg-muted/20 p-2 text-sm">
                            <span className="text-muted-foreground">
                              Net Balance
                            </span>
                            <span
                              className={cn(
                                'font-mono text-xs font-semibold',
                                platform.deposited - platform.withdrawn >= 0
                                  ? 'text-success'
                                  : 'text-destructive',
                              )}
                            >
                              $
                              {(
                                platform.deposited - platform.withdrawn
                              ).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Transaction Timeline */}
            <Card className="card-terminal">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    Transaction Timeline
                  </CardTitle>
                  <Select
                    value={txFilter}
                    onValueChange={(v) => setTxFilter(v as TransactionFilter)}
                  >
                    <SelectTrigger
                      className="h-8 w-32"
                      data-testid="tx-filter"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="deposit">Deposits</SelectItem>
                      <SelectItem value="withdrawal">Withdrawals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {filteredTransactions.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No transactions found
                  </p>
                ) : (
                  filteredTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                      data-testid={`transaction-${tx.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded',
                            tx.type === 'deposit'
                              ? 'bg-success/20'
                              : 'bg-destructive/20',
                          )}
                        >
                          {tx.type === 'deposit' ? (
                            <ArrowDownRight className="h-4 w-4 text-success" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium capitalize">
                              {tx.type}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                            >
                              {tx.platform}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {tx.date}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'font-mono font-semibold',
                            tx.type === 'deposit'
                              ? 'text-success'
                              : 'text-destructive',
                          )}
                        >
                          {tx.type === 'deposit' ? '+' : '-'}$
                          {tx.amount.toLocaleString()}
                        </span>
                        <Badge
                          className={cn(
                            'text-[10px]',
                            tx.status === 'completed' &&
                              'bg-success/20 text-success',
                            tx.status === 'pending' &&
                              'bg-warning/20 text-warning',
                            tx.status === 'failed' &&
                              'bg-destructive/20 text-destructive',
                          )}
                        >
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="card-terminal">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">
                Select a client to view settlement details
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
