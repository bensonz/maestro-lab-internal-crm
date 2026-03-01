'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Circle,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { RecordAllocationDialog } from './record-allocation-dialog'
import { FundConfirmationDialog } from './fund-confirmation-dialog'
import type { FundAllocationEntry } from './types'

type FilterTab = 'all' | 'UNCONFIRMED' | 'CONFIRMED' | 'DISCREPANCY'

interface FundAllocationsPanelProps {
  allocations: FundAllocationEntry[]
  yesterdayCount: number
}

function ConfirmationBadge({ status }: { status: string }) {
  switch (status) {
    case 'CONFIRMED':
      return (
        <Badge variant="secondary" className="gap-1 text-[10px] text-success">
          <CheckCircle2 className="h-3 w-3" />
          Confirmed
        </Badge>
      )
    case 'DISCREPANCY':
      return (
        <Badge variant="secondary" className="gap-1 text-[10px] text-destructive">
          <AlertTriangle className="h-3 w-3" />
          Discrepancy
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary" className="gap-1 text-[10px] text-warning">
          <Circle className="h-3 w-3" />
          Unconfirmed
        </Badge>
      )
  }
}

export function FundAllocationsPanel({
  allocations,
  yesterdayCount,
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

  return (
    <>
      <Card data-testid="fund-allocations-panel">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">
              Fund Allocations
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {allocations.length} today
              {yesterdayCount > 0 && ` (${yesterdayCount} yesterday)`}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto h-7 gap-1 text-xs"
              onClick={() => setDialogOpen(true)}
              data-testid="record-allocation-btn"
            >
              <Plus className="h-3 w-3" />
              Record
            </Button>
          </div>

          {/* Filter tabs */}
          <div className="mt-2 flex gap-1">
            {tabs.map((tab) => (
              <Button
                key={tab.value}
                variant={filter === tab.value ? 'default' : 'ghost'}
                size="sm"
                className="h-6 gap-1 text-[10px]"
                onClick={() => setFilter(tab.value)}
                data-testid={`filter-${tab.value}`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[9px]">
                    {tab.count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {filter === 'all'
                ? 'No allocations recorded today'
                : `No ${filter.toLowerCase()} allocations`}
            </p>
          ) : (
            <>
              {/* Summary row */}
              <div className="mb-3 flex gap-4 text-xs">
                <div className="flex items-center gap-1 text-success">
                  <ArrowDownRight className="h-3 w-3" />
                  Deposits: ${totalDeposits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-1 text-destructive">
                  <ArrowUpRight className="h-3 w-3" />
                  Withdrawals: ${totalWithdrawals.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="space-y-1">
                {filtered.map((alloc) => (
                  <div
                    key={alloc.id}
                    className={cn(
                      'flex items-center gap-3 rounded-md border px-3 py-2',
                      alloc.confirmationStatus === 'DISCREPANCY' && 'border-destructive/20 bg-destructive/5',
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
                        <span className="text-sm font-medium">
                          {alloc.platform}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px]',
                            alloc.direction === 'DEPOSIT'
                              ? 'text-success'
                              : 'text-destructive',
                          )}
                        >
                          {alloc.direction}
                        </Badge>
                        <ConfirmationBadge status={alloc.confirmationStatus} />
                      </div>
                      {alloc.notes && (
                        <p className="text-xs text-muted-foreground truncate">
                          {alloc.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span
                          className={cn(
                            'font-mono text-sm font-medium',
                            alloc.direction === 'DEPOSIT'
                              ? 'text-success'
                              : 'text-destructive',
                          )}
                        >
                          ${alloc.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(alloc.createdAt), 'h:mm a')} — {alloc.recordedBy}
                        </p>
                      </div>
                      {alloc.confirmationStatus === 'UNCONFIRMED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleConfirm(alloc)}
                          data-testid={`confirm-btn-${alloc.id}`}
                        >
                          Confirm
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
