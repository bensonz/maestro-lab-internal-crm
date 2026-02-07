'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import {
  Search,
  User,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  DollarSign,
  TrendingDown,
  Wallet,
} from 'lucide-react'
import type { SettlementClient } from '@/backend/data/operations'

interface SettlementViewProps {
  clients: SettlementClient[]
}

type TransactionFilter = 'all' | 'deposit' | 'withdrawal'

export function SettlementView({ clients }: SettlementViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [txFilter, setTxFilter] = useState<TransactionFilter>('all')

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const selected = clients.find((c) => c.id === selectedClientId)

  const filteredTransactions = selected
    ? selected.recentTransactions.filter(
        (tx) => txFilter === 'all' || tx.type === txFilter,
      )
    : []

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left column — Client List (1/3) */}
      <div>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Clients
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="settlement-search"
              />
            </div>

            {/* Client Cards */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredClients.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  {clients.length === 0
                    ? 'No clients with settlement activity'
                    : 'No clients match your search'}
                </p>
              ) : (
                filteredClients.map((client) => (
                  <div
                    key={client.id}
                    onClick={() => {
                      setSelectedClientId(client.id)
                      setTxFilter('all')
                    }}
                    className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border ${
                      selectedClientId === client.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border/50 hover:border-muted-foreground'
                    }`}
                    data-testid={`client-card-${client.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-muted/30 p-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {client.name}
                        </span>
                      </div>
                      <div className="flex gap-3 text-xs font-mono">
                        <span className="text-chart-4">
                          +${client.totalDeposited.toLocaleString()}
                        </span>
                        <span className="text-destructive">
                          -${client.totalWithdrawn.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right column — Settlement Details (2/3) */}
      <div className="lg:col-span-2">
        {selected ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Total Deposited */}
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="flex items-center gap-3 py-5">
                  <div className="rounded-xl bg-chart-4/10 p-3 ring-1 ring-chart-4/20">
                    <ArrowDownRight className="h-5 w-5 text-chart-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Deposited
                    </p>
                    <p
                      className="text-2xl font-bold tracking-tight font-mono text-chart-4"
                      data-testid="total-deposited"
                    >
                      +${selected.totalDeposited.toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Total Withdrawn */}
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="flex items-center gap-3 py-5">
                  <div className="rounded-xl bg-destructive/10 p-3 ring-1 ring-destructive/20">
                    <ArrowUpRight className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Withdrawn
                    </p>
                    <p
                      className="text-2xl font-bold tracking-tight font-mono text-destructive"
                      data-testid="total-withdrawn"
                    >
                      -${selected.totalWithdrawn.toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Net Balance */}
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="flex items-center gap-3 py-5">
                  <div className="rounded-xl bg-primary/10 p-3 ring-1 ring-primary/20">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Net Balance
                    </p>
                    <p
                      className={`text-2xl font-bold tracking-tight font-mono ${
                        selected.netBalance >= 0
                          ? 'text-chart-4'
                          : 'text-destructive'
                      }`}
                      data-testid="net-balance"
                    >
                      ${selected.netBalance.toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Platform Breakdown */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Platform Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {selected.platforms.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    No platform activity
                  </p>
                ) : (
                  selected.platforms.map((platform) => (
                    <Collapsible key={platform.name}>
                      <CollapsibleTrigger
                        className="flex w-full items-center justify-between rounded-lg p-3 hover:bg-muted/30 transition-colors"
                        data-testid={`platform-${platform.name}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">
                            {platform.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-mono text-chart-4">
                            +${platform.deposited.toLocaleString()}
                          </span>
                          <span className="text-xs font-mono text-destructive">
                            -${platform.withdrawn.toLocaleString()}
                          </span>
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-1">
                          <div className="rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground">
                            Net:{' '}
                            <span
                              className={`font-mono font-semibold ${
                                platform.deposited - platform.withdrawn >= 0
                                  ? 'text-chart-4'
                                  : 'text-destructive'
                              }`}
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
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent Transactions
                </CardTitle>
                <div className="flex gap-1">
                  {(['all', 'deposit', 'withdrawal'] as const).map((filter) => (
                    <Button
                      key={filter}
                      variant={txFilter === filter ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTxFilter(filter)}
                      className="text-xs h-7 px-2.5"
                      data-testid={`filter-${filter}`}
                    >
                      {filter === 'all'
                        ? 'All'
                        : filter === 'deposit'
                          ? 'Deposits'
                          : 'Withdrawals'}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {filteredTransactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">
                    No transactions found
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between rounded-lg p-3 border border-border/30 hover:bg-muted/10 transition-colors"
                        data-testid={`transaction-${tx.id}`}
                      >
                        <div className="flex items-center gap-3">
                          {tx.type === 'deposit' ? (
                            <div className="rounded-lg bg-chart-4/10 p-2">
                              <ArrowDownRight className="h-4 w-4 text-chart-4" />
                            </div>
                          ) : (
                            <div className="rounded-lg bg-destructive/10 p-2">
                              <ArrowUpRight className="h-4 w-4 text-destructive" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground capitalize">
                                {tx.type}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-xs border-border/50 text-muted-foreground"
                              >
                                {tx.platform}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {tx.date}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-sm font-semibold font-mono ${
                              tx.type === 'deposit'
                                ? 'text-chart-4'
                                : 'text-destructive'
                            }`}
                          >
                            {tx.type === 'deposit' ? '+' : '-'}$
                            {tx.amount.toLocaleString()}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              tx.status === 'completed'
                                ? 'bg-chart-4/10 text-chart-4 border-chart-4/30'
                                : 'bg-accent/10 text-accent border-accent/30'
                            }
                          >
                            {tx.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <TrendingDown className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Select a client to view settlement details
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
