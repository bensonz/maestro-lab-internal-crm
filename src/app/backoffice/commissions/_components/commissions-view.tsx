'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DollarSign,
  Users,
  Recycle,
  Clock,
  ChevronDown,
  Star,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { markAllocationPaid, bulkMarkPaid } from '@/app/actions/commission'

interface Allocation {
  id: string
  agentName: string
  agentStarLevel: number
  type: string
  slices: number
  amount: number
  status: string
}

interface RecentPool {
  id: string
  clientName: string
  closerName: string
  closerStarLevel: number
  status: string
  distributedSlices: number
  recycledSlices: number
  createdAt: string
  allocations: Allocation[]
}

interface PendingPayout {
  id: string
  agentId: string
  agentName: string
  agentStarLevel: number
  clientName: string
  type: string
  slices: number
  amount: number
  createdAt: string
}

interface LeaderboardEntry {
  agentId: string
  name: string
  starLevel: number
  tier: string
  totalEarned: number
}

interface CommissionData {
  totalPools: number
  totalDistributed: number
  totalRecycled: number
  totalPending: number
  tierBreakdown: { tier: string; count: number }[]
  recentPools: RecentPool[]
  pendingPayouts: PendingPayout[]
  leaderboard: LeaderboardEntry[]
}

interface CommissionsViewProps {
  data: CommissionData
}

const TIER_ORDER = ['rookie', '1-star', '2-star', '3-star', '4-star']
const TIER_LABELS: Record<string, string> = {
  rookie: 'Rookie',
  '1-star': '1\u2605',
  '2-star': '2\u2605',
  '3-star': '3\u2605',
  '4-star': '4\u2605',
}
const TIER_COLORS: Record<string, string> = {
  rookie: 'bg-muted text-muted-foreground',
  '1-star': 'bg-chart-4/20 text-chart-4',
  '2-star': 'bg-chart-3/20 text-chart-3',
  '3-star': 'bg-accent/20 text-accent',
  '4-star': 'bg-primary/20 text-primary',
}

const TYPE_LABELS: Record<string, string> = {
  direct: 'Direct',
  star_slice: 'Star Slice',
  backfill: 'Backfill',
}

function formatMoney(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function StarBadge({ level }: { level: number }) {
  if (level === 0) return <Badge variant="outline" className="text-xs">Rookie</Badge>
  return (
    <Badge variant="outline" className="text-xs gap-0.5">
      {level}<Star className="h-3 w-3 fill-current" />
    </Badge>
  )
}

export function CommissionsView({ data }: CommissionsViewProps) {
  const [expandedPools, setExpandedPools] = useState<Set<string>>(new Set())
  const [selectedPayouts, setSelectedPayouts] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const togglePool = (id: string) => {
    setExpandedPools((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const togglePayout = (id: string) => {
    setSelectedPayouts((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllPayouts = () => {
    if (selectedPayouts.size === data.pendingPayouts.length) {
      setSelectedPayouts(new Set())
    } else {
      setSelectedPayouts(new Set(data.pendingPayouts.map((p) => p.id)))
    }
  }

  const handleMarkPaid = (allocationId: string) => {
    startTransition(async () => {
      const result = await markAllocationPaid(allocationId)
      if (result.success) {
        toast({ title: 'Allocation marked as paid' })
        setSelectedPayouts((prev) => {
          const next = new Set(prev)
          next.delete(allocationId)
          return next
        })
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      }
    })
  }

  const handleBulkMarkPaid = () => {
    if (selectedPayouts.size === 0) return
    startTransition(async () => {
      const result = await bulkMarkPaid([...selectedPayouts])
      if (result.success) {
        toast({ title: `${result.updated} allocation(s) marked as paid` })
        setSelectedPayouts(new Set())
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      }
    })
  }

  // Build tier map with proper ordering
  const tierMap = new Map(data.tierBreakdown.map((t) => [t.tier, t.count]))

  return (
    <div className="space-y-6" data-testid="commissions-view">
      {/* ── Summary Cards ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="summary-cards">
        <Card data-testid="total-pools-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bonus Pools</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{data.totalPools}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.totalDistributed} distributed
            </p>
          </CardContent>
        </Card>

        <Card data-testid="total-distributed-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Distributed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-success">
              {formatMoney(data.totalDistributed * 400)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From {data.totalDistributed} pools
            </p>
          </CardContent>
        </Card>

        <Card data-testid="total-recycled-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recycled</CardTitle>
            <Recycle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {formatMoney(data.totalRecycled * 50)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.totalRecycled} slices returned
            </p>
          </CardContent>
        </Card>

        <Card data-testid="pending-payouts-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-warning">
              {formatMoney(data.totalPending)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.pendingPayouts.length} allocation(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Commission Rules Reference ── */}
      <Collapsible data-testid="commission-rules">
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Commission Rules Reference</CardTitle>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Star Level Thresholds</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Level</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Approved Clients</TableHead>
                      <TableHead>Max Slices</TableHead>
                      <TableHead>Max Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>0</TableCell>
                      <TableCell>Rookie</TableCell>
                      <TableCell>0-2</TableCell>
                      <TableCell>0</TableCell>
                      <TableCell className="font-mono">$0</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>1</TableCell>
                      <TableCell>1-Star</TableCell>
                      <TableCell>3-6</TableCell>
                      <TableCell>1</TableCell>
                      <TableCell className="font-mono">$50</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>2</TableCell>
                      <TableCell>2-Star</TableCell>
                      <TableCell>7-12</TableCell>
                      <TableCell>2</TableCell>
                      <TableCell className="font-mono">$100</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>3</TableCell>
                      <TableCell>3-Star</TableCell>
                      <TableCell>13-20</TableCell>
                      <TableCell>3</TableCell>
                      <TableCell className="font-mono">$150</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>4</TableCell>
                      <TableCell>4-Star</TableCell>
                      <TableCell>21+</TableCell>
                      <TableCell>4</TableCell>
                      <TableCell className="font-mono">$200</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Distribution Algorithm</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Each approved client generates a <span className="font-mono font-medium text-foreground">$400</span> bonus pool</li>
                  <li><span className="font-mono font-medium text-foreground">$200</span> direct bonus to the closer (always)</li>
                  <li><span className="font-mono font-medium text-foreground">$200</span> star pool: 4 slices at $50 each, distributed up the hierarchy</li>
                  <li>Each agent takes slices equal to their star level (capped by remaining slices)</li>
                  <li>Remaining slices backfill to the highest-star ancestor</li>
                  <li>Unclaimed slices are recycled</li>
                </ul>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ── Agent Tier Breakdown ── */}
      <Card data-testid="tier-breakdown">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Agent Tier Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {TIER_ORDER.map((tier) => {
              const count = tierMap.get(tier) ?? 0
              return (
                <div
                  key={tier}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-4 py-2 border',
                    TIER_COLORS[tier] || 'bg-muted text-muted-foreground',
                  )}
                  data-testid={`tier-badge-${tier}`}
                >
                  <span className="font-medium text-sm">
                    {TIER_LABELS[tier] || tier}
                  </span>
                  <Badge variant="secondary" className="font-mono">
                    {count}
                  </Badge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Recent Bonus Pools ── */}
      <Card data-testid="recent-pools">
        <CardHeader>
          <CardTitle className="text-base">Recent Bonus Pools</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentPools.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No bonus pools created yet.
            </p>
          ) : (
            <div className="space-y-2">
              {data.recentPools.map((pool) => (
                <Collapsible
                  key={pool.id}
                  open={expandedPools.has(pool.id)}
                  onOpenChange={() => togglePool(pool.id)}
                >
                  <CollapsibleTrigger asChild>
                    <div
                      className="flex items-center justify-between rounded-lg border px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      data-testid={`pool-row-${pool.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="font-medium text-sm">
                            {pool.clientName}
                          </span>
                          <span className="text-muted-foreground text-sm ml-2">
                            closed by {pool.closerName}
                          </span>
                        </div>
                        <StarBadge level={pool.closerStarLevel} />
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            pool.status === 'distributed'
                              ? 'border-success/50 bg-success/10 text-success'
                              : 'border-warning/50 bg-warning/10 text-warning',
                          )}
                        >
                          {pool.status === 'distributed' ? 'Distributed' : 'Pending'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(pool.createdAt)}
                        </span>
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 text-muted-foreground transition-transform',
                            expandedPools.has(pool.id) && 'rotate-180',
                          )}
                        />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-4 mt-1 mb-2 rounded-lg border bg-muted/30 p-3">
                      <div className="text-xs text-muted-foreground mb-2">
                        {pool.distributedSlices} slices distributed, {pool.recycledSlices} recycled
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Agent</TableHead>
                            <TableHead className="text-xs">Type</TableHead>
                            <TableHead className="text-xs">Slices</TableHead>
                            <TableHead className="text-xs text-right">Amount</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pool.allocations.map((alloc) => (
                            <TableRow key={alloc.id}>
                              <TableCell className="text-sm">
                                <div className="flex items-center gap-2">
                                  {alloc.agentName}
                                  <StarBadge level={alloc.agentStarLevel} />
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {TYPE_LABELS[alloc.type] || alloc.type}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {alloc.slices}
                              </TableCell>
                              <TableCell className="font-mono text-sm text-right text-success">
                                {formatMoney(alloc.amount)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-xs',
                                    alloc.status === 'paid'
                                      ? 'border-success/50 bg-success/10 text-success'
                                      : 'border-warning/50 bg-warning/10 text-warning',
                                  )}
                                >
                                  {alloc.status === 'paid' ? 'Paid' : 'Pending'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Pending Payouts ── */}
      <Card data-testid="pending-payouts">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Pending Payouts</CardTitle>
            {selectedPayouts.size > 0 && (
              <Button
                size="sm"
                onClick={handleBulkMarkPaid}
                disabled={isPending}
                data-testid="bulk-mark-paid-btn"
              >
                Mark {selectedPayouts.size} as Paid
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {data.pendingPayouts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No pending payouts.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        selectedPayouts.size === data.pendingPayouts.length &&
                        data.pendingPayouts.length > 0
                      }
                      onCheckedChange={toggleAllPayouts}
                      data-testid="select-all-payouts"
                    />
                  </TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.pendingPayouts.map((payout) => (
                  <TableRow key={payout.id} data-testid={`payout-row-${payout.id}`}>
                    <TableCell>
                      <Checkbox
                        checked={selectedPayouts.has(payout.id)}
                        onCheckedChange={() => togglePayout(payout.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{payout.agentName}</span>
                        <StarBadge level={payout.agentStarLevel} />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{payout.clientName}</TableCell>
                    <TableCell className="text-sm">
                      {TYPE_LABELS[payout.type] || payout.type}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-right text-success">
                      {formatMoney(payout.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(payout.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkPaid(payout.id)}
                        disabled={isPending}
                        data-testid={`mark-paid-btn-${payout.id}`}
                      >
                        Mark Paid
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Agent Leaderboard ── */}
      {data.leaderboard.length > 0 && (
        <Card data-testid="agent-leaderboard">
          <CardHeader>
            <CardTitle className="text-base">Agent Leaderboard (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Total Earned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.leaderboard.map((entry, idx) => (
                  <TableRow key={entry.agentId}>
                    <TableCell className="font-mono text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{entry.name}</span>
                        <StarBadge level={entry.starLevel} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          TIER_COLORS[entry.tier] || 'bg-muted text-muted-foreground',
                        )}
                      >
                        {TIER_LABELS[entry.tier] || entry.tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-right text-success font-medium">
                      {formatMoney(entry.totalEarned)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
