'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { RecordAllocationDialog } from './record-allocation-dialog'
import type { FundAllocationEntry } from './types'

interface FundRecordPanelProps {
  allocations: FundAllocationEntry[]
  yesterdayCount: number
}

export function FundRecordPanel({
  allocations,
  yesterdayCount,
}: FundRecordPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const totalDeposits = allocations
    .filter((a) => a.direction === 'DEPOSIT')
    .reduce((sum, a) => sum + a.amount, 0)
  const totalWithdrawals = allocations
    .filter((a) => a.direction === 'WITHDRAWAL')
    .reduce((sum, a) => sum + a.amount, 0)

  return (
    <>
      <div id="fund-record" className="card-terminal flex min-h-[320px] flex-col p-0" data-testid="fund-record-panel">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-3">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Fund Allocation
          </h3>
          <span className="font-mono text-xs text-muted-foreground">
            {allocations.length} today
            {yesterdayCount > 0 && ` / ${yesterdayCount} yesterday`}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto h-7 gap-1.5 text-xs"
            onClick={() => setDialogOpen(true)}
            data-testid="record-allocation-btn"
          >
            <Plus className="h-3.5 w-3.5" />
            Record
          </Button>
        </div>

        {/* Summary bar */}
        {allocations.length > 0 && (
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-2">
            <span className="text-xs text-muted-foreground">Today&apos;s movement</span>
            <div className="flex gap-4 font-mono text-xs">
              <span className="text-success">
                +${totalDeposits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-destructive">
                -${totalWithdrawals.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1">
          {allocations.length === 0 ? (
            <div className="flex h-full items-center justify-center px-5 py-8">
              <p className="text-sm text-muted-foreground">No allocations recorded today</p>
            </div>
          ) : (
            <div className="max-h-[300px] divide-y divide-border/30 overflow-y-auto">
              {allocations.map((alloc) => (
                <div
                  key={alloc.id}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/20"
                  data-testid={`fund-record-row-${alloc.id}`}
                >
                  {alloc.direction === 'DEPOSIT' ? (
                    <ArrowDownRight className="h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-foreground">
                      {alloc.platform}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(alloc.createdAt), 'h:mm a')} — {alloc.recordedBy}
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <RecordAllocationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}
