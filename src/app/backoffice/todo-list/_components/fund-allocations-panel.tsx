'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Mail,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { RecordAllocationDialog } from './record-allocation-dialog'
import { FundConfirmationDialog } from './fund-confirmation-dialog'
import type { FundAllocationEntry } from './types'

type FilterTab = 'all' | 'UNCONFIRMED' | 'CONFIRMED' | 'DISCREPANCY'

interface FundAllocationsPanelProps {
  allocations: FundAllocationEntry[]
  yesterdayCount: number
  lastGmailSync: Date | null
}

export function FundAllocationsPanel({
  allocations,
  yesterdayCount,
  lastGmailSync,
}: FundAllocationsPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [selectedAllocation, setSelectedAllocation] = useState<FundAllocationEntry | null>(null)
  const [filter, setFilter] = useState<FilterTab>('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return allocations
    return allocations.filter((a) => a.confirmationStatus === filter)
  }, [allocations, filter])

  const totalDeposits = filtered
    .filter((a) => a.direction === 'DEPOSIT')
    .reduce((sum, a) => sum + a.amount, 0)
  const totalWithdrawals = filtered
    .filter((a) => a.direction === 'WITHDRAWAL')
    .reduce((sum, a) => sum + a.amount, 0)

  const unconfirmedCount = allocations.filter((a) => a.confirmationStatus === 'UNCONFIRMED').length

  const handleConfirm = (alloc: FundAllocationEntry) => {
    setSelectedAllocation(alloc)
    setConfirmDialogOpen(true)
  }

  const tabs: { value: FilterTab; label: string; count?: number }[] = [
    { value: 'all', label: 'All' },
    { value: 'UNCONFIRMED', label: 'Unconfirmed', count: unconfirmedCount },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'DISCREPANCY', label: 'Discrepancy' },
  ]

  // Gmail sync status
  const gmailSyncStatus = getGmailSyncStatus(lastGmailSync)

  return (
    <>
      <div className="card-terminal p-0" data-testid="fund-allocations-panel">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-3">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Fund Allocations
          </h3>
          <span className="font-mono text-xs text-muted-foreground">
            {allocations.length} today
            {yesterdayCount > 0 && ` / ${yesterdayCount} yesterday`}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <GmailSyncBadge status={gmailSyncStatus} lastSync={lastGmailSync} />
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setDialogOpen(true)}
              data-testid="record-allocation-btn"
            >
              <Plus className="h-3.5 w-3.5" />
              Record
            </Button>
          </div>
        </div>

        {/* Filter tabs + summary */}
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-2">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={cn(
                  'rounded px-3 py-1.5 text-xs font-medium transition-colors',
                  filter === tab.value
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                data-testid={`filter-${tab.value}`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1.5 font-mono text-warning">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
          {filtered.length > 0 && (
            <div className="flex gap-4 font-mono text-xs">
              <span className="text-success">
                +${totalDeposits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-destructive">
                -${totalWithdrawals.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        {filtered.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            {filter === 'all'
              ? 'No allocations recorded today'
              : `No ${filter.toLowerCase()} allocations`}
          </p>
        ) : (
          <div className="max-h-[400px] divide-y divide-border/30 overflow-y-auto">
            {filtered.map((alloc) => (
              <div
                key={alloc.id}
                className={cn(
                  'flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/20',
                  alloc.confirmationStatus === 'DISCREPANCY' && 'bg-destructive/5',
                )}
                data-testid={`allocation-row-${alloc.id}`}
              >
                {alloc.direction === 'DEPOSIT' ? (
                  <ArrowDownRight className="h-4 w-4 shrink-0 text-success" />
                ) : (
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-destructive" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {alloc.platform}
                    </span>
                    <ConfirmationDot status={alloc.confirmationStatus} />
                    {alloc.gmailMatched && (
                      <Mail className="h-3.5 w-3.5 text-success" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(alloc.createdAt), 'h:mm a')} — {alloc.recordedBy}
                    {alloc.notes && ` — ${alloc.notes}`}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 font-mono text-sm font-semibold',
                    alloc.direction === 'DEPOSIT' ? 'text-success' : 'text-destructive',
                  )}
                >
                  ${alloc.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                {alloc.confirmationStatus === 'UNCONFIRMED' && (
                  <button
                    onClick={() => handleConfirm(alloc)}
                    className="shrink-0 rounded px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                    data-testid={`confirm-btn-${alloc.id}`}
                  >
                    Confirm
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <RecordAllocationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <FundConfirmationDialog
        open={confirmDialogOpen}
        onClose={() => {
          setConfirmDialogOpen(false)
          setSelectedAllocation(null)
        }}
        allocation={selectedAllocation}
      />
    </>
  )
}

// ── Gmail Sync Badge ─────────────────────────────────────

type SyncStatus = 'fresh' | 'stale' | 'offline' | 'none'

function getGmailSyncStatus(lastSync: Date | null): SyncStatus {
  if (!lastSync) return 'none'
  const minutesAgo = (Date.now() - new Date(lastSync).getTime()) / (1000 * 60)
  if (minutesAgo <= 10) return 'fresh'
  if (minutesAgo <= 60) return 'stale'
  return 'offline'
}

function GmailSyncBadge({
  status,
  lastSync,
}: {
  status: SyncStatus
  lastSync: Date | null
}) {
  if (status === 'none') return null

  const config = {
    fresh: { color: 'bg-success', text: 'text-success', dot: 'bg-success' },
    stale: { color: 'bg-warning', text: 'text-warning', dot: 'bg-warning' },
    offline: { color: 'bg-destructive', text: 'text-destructive', dot: 'bg-destructive' },
  }[status]

  const timeAgo = lastSync
    ? formatDistanceToNow(new Date(lastSync), { addSuffix: true })
    : ''

  return (
    <div
      className="flex items-center gap-1.5 rounded px-2 py-1"
      title={`Gmail synced ${timeAgo}`}
      data-testid="gmail-sync-badge"
    >
      <div className={cn('h-2 w-2 rounded-full', config.dot)} />
      <Mail className={cn('h-3.5 w-3.5', config.text)} />
      <span className={cn('font-mono text-[11px]', config.text)}>
        {status === 'fresh' ? 'synced' : timeAgo}
      </span>
    </div>
  )
}

// ── Confirmation status dot ─────────────────────────────

function ConfirmationDot({ status }: { status: string }) {
  const config = {
    CONFIRMED: { icon: CheckCircle2, color: 'text-success' },
    DISCREPANCY: { icon: AlertTriangle, color: 'text-destructive' },
    UNCONFIRMED: { icon: Circle, color: 'text-warning' },
  }[status] ?? { icon: Circle, color: 'text-muted-foreground' }

  const Icon = config.icon
  return <Icon className={cn('h-3.5 w-3.5', config.color)} />
}
