'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Star,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { confirmFundAllocation, flagDiscrepancy } from '@/app/actions/fund-confirmations'
import type { FundAllocationEntry, FundClearingUrgency } from './types'

interface ClearingDetailDialogProps {
  open: boolean
  onClose: () => void
  allocations: FundAllocationEntry[]
}

const URGENCY_STYLES: Record<FundClearingUrgency, { bg: string; text: string; label: string }> = {
  arrived: { bg: 'bg-success/5', text: 'text-success', label: 'Arrival Detected' },
  'expected-soon': { bg: 'bg-warning/5', text: 'text-warning', label: 'Expected Soon' },
  'in-transit': { bg: '', text: 'text-muted-foreground', label: 'In Transit' },
  stuck: { bg: 'bg-destructive/5', text: 'text-destructive', label: 'Stuck' },
  discrepancy: { bg: 'bg-destructive/5', text: 'text-destructive', label: 'Amount Mismatch' },
}

export function ClearingDetailDialog({
  open,
  onClose,
  allocations,
}: ClearingDetailDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const handleConfirm = (allocId: string) => {
    setConfirmingId(allocId)
    startTransition(async () => {
      const result = await confirmFundAllocation(allocId)
      if (result.success) {
        toast.success('Allocation confirmed')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to confirm')
      }
      setConfirmingId(null)
    })
  }

  const needAction = allocations.filter((a) => a.urgency !== 'arrived')
  const arrived = allocations.filter((a) => a.urgency === 'arrived')

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl" data-testid="clearing-detail-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Clearing Status
            {needAction.length > 0 && (
              <span className="rounded bg-warning/20 px-2 py-0.5 font-mono text-xs font-semibold text-warning">
                {needAction.length} pending
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[65vh] divide-y divide-border/30 overflow-y-auto">
          {allocations.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-success/60" />
                <p className="mt-3 text-sm text-muted-foreground">All transactions cleared</p>
              </div>
            </div>
          ) : (
            allocations.map((alloc) => {
              const style = URGENCY_STYLES[alloc.urgency]
              const destination = alloc.destinationPlatform ?? 'Bank'
              const method = alloc.transferMethod ?? 'Withdrawal'
              const canConfirm = alloc.confirmationStatus === 'UNCONFIRMED'

              return (
                <div
                  key={alloc.id}
                  className={cn('px-5 py-4', style.bg)}
                  data-testid={`clearing-detail-${alloc.id}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Transaction flow */}
                    <div className="min-w-0 flex-1">
                      {/* From → To with method */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {alloc.platform}
                        </span>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-muted-foreground">{method}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          {destination}
                        </span>
                      </div>

                      {/* Details line */}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {format(new Date(alloc.createdAt), 'MMM d, h:mm a')} — {alloc.recordedBy}
                      </p>

                      {/* Urgency badge */}
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {alloc.urgency === 'arrived' ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-success">
                            <Star className="h-3 w-3 fill-success" />
                            {style.label}
                          </span>
                        ) : alloc.urgency === 'stuck' || alloc.urgency === 'discrepancy' ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-destructive">
                            <AlertTriangle className="h-3 w-3" />
                            {alloc.timeLabel}
                          </span>
                        ) : (
                          <span className={cn('flex items-center gap-1 text-xs font-medium', style.text)}>
                            <Clock className="h-3 w-3" />
                            {alloc.timeLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Amount + action */}
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="font-mono text-base font-bold text-foreground">
                        ${alloc.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      {canConfirm && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleConfirm(alloc.id)}
                          disabled={isPending && confirmingId === alloc.id}
                          data-testid={`clearing-confirm-${alloc.id}`}
                        >
                          {isPending && confirmingId === alloc.id ? 'Confirming...' : 'Confirm'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
