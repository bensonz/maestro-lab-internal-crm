'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react'
import { confirmFundAllocation, flagDiscrepancy } from '@/app/actions/fund-confirmations'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { FundAllocationEntry } from './types'

interface FundConfirmationDialogProps {
  open: boolean
  onClose: () => void
  allocation: FundAllocationEntry | null
}

export function FundConfirmationDialog({
  open,
  onClose,
  allocation,
}: FundConfirmationDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<'confirm' | 'discrepancy'>('confirm')
  const [confirmedAmount, setConfirmedAmount] = useState('')
  const [notes, setNotes] = useState('')

  const handleClose = () => {
    setMode('confirm')
    setConfirmedAmount('')
    setNotes('')
    onClose()
  }

  const handleConfirm = () => {
    if (!allocation) return
    startTransition(async () => {
      const result = await confirmFundAllocation(allocation.id)
      if (result.success) {
        toast.success('Allocation confirmed')
        handleClose()
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to confirm')
      }
    })
  }

  const handleFlagDiscrepancy = () => {
    if (!allocation) return
    const amount = parseFloat(confirmedAmount)
    if (isNaN(amount) || amount < 0) {
      toast.error('Enter a valid confirmed amount')
      return
    }
    startTransition(async () => {
      const result = await flagDiscrepancy(allocation.id, amount, notes)
      if (result.success) {
        toast.success('Discrepancy flagged')
        handleClose()
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to flag discrepancy')
      }
    })
  }

  if (!allocation) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md" data-testid="fund-confirmation-dialog">
        <DialogHeader>
          <DialogTitle>Confirm Fund Allocation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Allocation details */}
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center gap-2">
              {allocation.direction === 'DEPOSIT' ? (
                <ArrowDownRight className="h-4 w-4 text-success" />
              ) : (
                <ArrowUpRight className="h-4 w-4 text-destructive" />
              )}
              <span className="font-medium">{allocation.platform}</span>
              <Badge
                variant="secondary"
                className={cn(
                  'text-[10px]',
                  allocation.direction === 'DEPOSIT' ? 'text-success' : 'text-destructive',
                )}
              >
                {allocation.direction}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Amount:</span>{' '}
                <span className="font-mono font-medium">
                  ${allocation.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Recorded by:</span>{' '}
                {allocation.recordedBy}
              </div>
              <div>
                <span className="text-muted-foreground">Date:</span>{' '}
                {format(new Date(allocation.createdAt), 'MMM d, yyyy h:mm a')}
              </div>
            </div>
            {allocation.notes && (
              <p className="text-xs text-muted-foreground">{allocation.notes}</p>
            )}
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'confirm' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('confirm')}
              className="flex-1"
              data-testid="confirm-mode-btn"
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Confirm Match
            </Button>
            <Button
              variant={mode === 'discrepancy' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setMode('discrepancy')}
              className="flex-1"
              data-testid="discrepancy-mode-btn"
            >
              <AlertTriangle className="mr-1 h-3 w-3" />
              Flag Discrepancy
            </Button>
          </div>

          {/* Discrepancy fields */}
          {mode === 'discrepancy' && (
            <div className="space-y-3">
              <Field>
                <FieldLabel htmlFor="confirmed-amount">Actual Amount *</FieldLabel>
                <Input
                  id="confirmed-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={confirmedAmount}
                  onChange={(e) => setConfirmedAmount(e.target.value)}
                  data-testid="confirmed-amount-input"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="discrepancy-notes">Notes</FieldLabel>
                <Textarea
                  id="discrepancy-notes"
                  placeholder="Describe the discrepancy..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  data-testid="discrepancy-notes-input"
                />
              </Field>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          {mode === 'confirm' ? (
            <Button
              variant="terminal"
              onClick={handleConfirm}
              disabled={isPending}
              data-testid="confirm-allocation-btn"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleFlagDiscrepancy}
              disabled={isPending || !confirmedAmount}
              data-testid="flag-discrepancy-btn"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Flag Discrepancy
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
