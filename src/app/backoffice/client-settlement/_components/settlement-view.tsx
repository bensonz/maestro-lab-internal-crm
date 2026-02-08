'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { confirmSettlement, rejectSettlement } from '@/app/actions/settlements'
import type { SettlementClient } from '@/backend/data/operations'

interface SettlementViewProps {
  clients: SettlementClient[]
}

type TransactionFilter = 'all' | 'deposit' | 'withdrawal'

type Platform = SettlementClient['platforms'][number]
type Transaction = SettlementClient['recentTransactions'][number]

const SETTLEMENT_BADGE_STYLES: Record<string, string> = {
  PENDING_REVIEW: 'border-warning/50 bg-warning/10 text-warning',
  CONFIRMED: 'border-success/50 bg-success/10 text-success',
  REJECTED: 'border-destructive/50 bg-destructive/10 text-destructive',
}

const SETTLEMENT_LABEL: Record<string, string> = {
  PENDING_REVIEW: 'Pending Review',
  CONFIRMED: 'Confirmed',
  REJECTED: 'Rejected',
}

function renderPlatformGroup(
  label: string,
  platforms: Platform[],
  allTransactions: Transaction[],
  expandedPlatforms: string[],
  togglePlatform: (name: string) => void,
) {
  if (platforms.length === 0) return null

  return (
    <div data-testid={`platform-group-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="mb-2 flex items-center gap-2">
        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="space-y-2">
        {platforms.map((platform) => {
          const platformTxs = allTransactions.filter(
            (tx) => tx.platform === platform.name,
          )
          const net = platform.deposited - platform.withdrawn

          return (
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
                      <span className="text-xs font-bold text-primary">
                        {platform.abbrev}
                      </span>
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
                  {/* Summary row */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded bg-muted/20 p-2 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Deposited
                      </p>
                      <p className="font-mono text-sm font-semibold text-success">
                        +${platform.deposited.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded bg-muted/20 p-2 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Withdrawn
                      </p>
                      <p className="font-mono text-sm font-semibold text-destructive">
                        -${platform.withdrawn.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded bg-muted/20 p-2 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Net
                      </p>
                      <p
                        className={cn(
                          'font-mono text-sm font-semibold',
                          net >= 0 ? 'text-success' : 'text-destructive',
                        )}
                      >
                        ${net.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Per-platform transactions */}
                  {platformTxs.length > 0 && (
                    <div className="mt-2 space-y-1" data-testid={`platform-txs-${platform.name}`}>
                      <p className="px-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        Transactions ({platformTxs.length})
                      </p>
                      {platformTxs.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between rounded bg-muted/10 px-2 py-1.5 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            {tx.type === 'deposit' ? (
                              <ArrowDownRight className="h-3 w-3 text-success" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3 text-destructive" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {tx.date}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'font-mono text-xs font-medium',
                                tx.type === 'deposit'
                                  ? 'text-success'
                                  : 'text-destructive',
                              )}
                            >
                              {tx.type === 'deposit' ? '+' : '-'}$
                              {tx.amount.toLocaleString()}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[9px]',
                                SETTLEMENT_BADGE_STYLES[tx.settlementStatus],
                              )}
                            >
                              {SETTLEMENT_LABEL[tx.settlementStatus] ?? tx.settlementStatus}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </div>
    </div>
  )
}

export function SettlementView({ clients }: SettlementViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [txFilter, setTxFilter] = useState<TransactionFilter>('all')
  const [expandedPlatforms, setExpandedPlatforms] = useState<string[]>([])
  const [reviewTx, setReviewTx] = useState<Transaction | null>(null)
  const [reviewAction, setReviewAction] = useState<'confirm' | 'reject'>('confirm')
  const [reviewNotes, setReviewNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

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

  const openReview = (tx: Transaction, action: 'confirm' | 'reject') => {
    setReviewTx(tx)
    setReviewAction(action)
    setReviewNotes('')
  }

  const handleReview = () => {
    if (!reviewTx) return
    // Strip the -w suffix for same-client withdrawal entries
    const movementId = reviewTx.id.endsWith('-w')
      ? reviewTx.id.slice(0, -2)
      : reviewTx.id

    startTransition(async () => {
      const result =
        reviewAction === 'confirm'
          ? await confirmSettlement({ movementId, notes: reviewNotes || undefined })
          : await rejectSettlement({ movementId, notes: reviewNotes })

      if (result.success) {
        toast({
          title: reviewAction === 'confirm' ? 'Settlement Confirmed' : 'Settlement Rejected',
          description: `Transaction ${reviewAction === 'confirm' ? 'confirmed' : 'rejected'} successfully.`,
        })
        setReviewTx(null)
      } else {
        toast({
          title: 'Error',
          description: result.error ?? 'An error occurred',
          variant: 'destructive',
        })
      }
    })
  }

  return (
    <>
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
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{client.name}</p>
                    {client.settlementCounts.pendingReview > 0 && (
                      <Badge
                        variant="outline"
                        className="border-warning/50 bg-warning/10 text-[10px] text-warning"
                        data-testid={`pending-badge-${client.id}`}
                      >
                        {client.settlementCounts.pendingReview} pending
                      </Badge>
                    )}
                  </div>
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

              {/* Settlement Status Summary */}
              {(selected.settlementCounts.pendingReview > 0 ||
                selected.settlementCounts.confirmed > 0 ||
                selected.settlementCounts.rejected > 0) && (
                <div
                  className="flex items-center gap-4 rounded-lg border border-border bg-muted/20 px-4 py-3"
                  data-testid="settlement-status-summary"
                >
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Settlement Status
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-warning" />
                      <span className="font-mono text-sm text-warning">
                        {selected.settlementCounts.pendingReview}
                      </span>
                      <span className="text-xs text-muted-foreground">pending</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      <span className="font-mono text-sm text-success">
                        {selected.settlementCounts.confirmed}
                      </span>
                      <span className="text-xs text-muted-foreground">confirmed</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                      <span className="font-mono text-sm text-destructive">
                        {selected.settlementCounts.rejected}
                      </span>
                      <span className="text-xs text-muted-foreground">rejected</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Platform Breakdown */}
              <Card className="card-terminal" data-testid="platform-breakdown">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    Platform Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selected.platforms.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No platform activity
                    </p>
                  ) : (
                    <>
                      {renderPlatformGroup(
                        'Sports Betting',
                        selected.platforms.filter(
                          (p) => p.category === 'sports',
                        ),
                        selected.recentTransactions,
                        expandedPlatforms,
                        togglePlatform,
                      )}
                      {renderPlatformGroup(
                        'Financial',
                        selected.platforms.filter(
                          (p) => p.category === 'financial',
                        ),
                        selected.recentTransactions,
                        expandedPlatforms,
                        togglePlatform,
                      )}
                      {renderPlatformGroup(
                        'Other',
                        selected.platforms.filter(
                          (p) => p.category === 'other',
                        ),
                        selected.recentTransactions,
                        expandedPlatforms,
                        togglePlatform,
                      )}
                    </>
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
                        className="rounded-lg border border-border p-3"
                        data-testid={`transaction-${tx.id}`}
                      >
                        <div className="flex items-center justify-between">
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
                              variant="outline"
                              className={cn(
                                'text-[10px]',
                                SETTLEMENT_BADGE_STYLES[tx.settlementStatus],
                              )}
                              data-testid={`settlement-badge-${tx.id}`}
                            >
                              {SETTLEMENT_LABEL[tx.settlementStatus] ?? tx.settlementStatus}
                            </Badge>
                          </div>
                        </div>

                        {/* Review info for confirmed/rejected */}
                        {tx.settlementStatus !== 'PENDING_REVIEW' && tx.reviewedBy && (
                          <div className="ml-11 mt-2 rounded bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {tx.reviewedBy}
                            </span>
                            {' '}
                            {tx.settlementStatus === 'CONFIRMED' ? 'confirmed' : 'rejected'}
                            {tx.reviewedAt && ` on ${tx.reviewedAt}`}
                            {tx.reviewNotes && (
                              <p className="mt-1 italic">{tx.reviewNotes}</p>
                            )}
                          </div>
                        )}

                        {/* Action buttons for pending transactions */}
                        {tx.settlementStatus === 'PENDING_REVIEW' && (
                          <div className="ml-11 mt-2 flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 border-success/50 text-xs text-success hover:bg-success/10"
                              onClick={() => openReview(tx, 'confirm')}
                              data-testid={`confirm-btn-${tx.id}`}
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 border-destructive/50 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => openReview(tx, 'reject')}
                              data-testid={`reject-btn-${tx.id}`}
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              Reject
                            </Button>
                          </div>
                        )}
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

      {/* Review Dialog */}
      <Dialog open={!!reviewTx} onOpenChange={(open) => !open && setReviewTx(null)}>
        <DialogContent data-testid="settlement-review-dialog">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'confirm'
                ? 'Confirm Settlement'
                : 'Reject Settlement'}
            </DialogTitle>
          </DialogHeader>

          {reviewTx && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {reviewTx.type === 'deposit' ? (
                      <ArrowDownRight className="h-4 w-4 text-success" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-destructive" />
                    )}
                    <span className="text-sm font-medium capitalize">
                      {reviewTx.type}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {reviewTx.platform}
                    </Badge>
                  </div>
                  <span
                    className={cn(
                      'font-mono font-semibold',
                      reviewTx.type === 'deposit'
                        ? 'text-success'
                        : 'text-destructive',
                    )}
                  >
                    {reviewTx.type === 'deposit' ? '+' : '-'}$
                    {reviewTx.amount.toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {reviewTx.date}
                </p>
              </div>

              <div>
                <label
                  htmlFor="review-notes"
                  className="mb-1 block text-sm font-medium"
                >
                  {reviewAction === 'reject' ? 'Rejection Reason *' : 'Notes (optional)'}
                </label>
                <Textarea
                  id="review-notes"
                  placeholder={
                    reviewAction === 'reject'
                      ? 'Explain why this settlement is being rejected...'
                      : 'Add optional notes...'
                  }
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  data-testid="review-notes"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewTx(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant={reviewAction === 'confirm' ? 'default' : 'destructive'}
              onClick={handleReview}
              disabled={isPending || (reviewAction === 'reject' && !reviewNotes.trim())}
              data-testid="review-submit-btn"
            >
              {isPending
                ? 'Processing...'
                : reviewAction === 'confirm'
                  ? 'Confirm Settlement'
                  : 'Reject Settlement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
