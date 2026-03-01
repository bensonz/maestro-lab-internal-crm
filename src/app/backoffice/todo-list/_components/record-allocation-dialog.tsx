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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field, FieldLabel } from '@/components/ui/field'
import { toast } from 'sonner'
import { recordFundAllocation } from '@/app/actions/fund-allocations'

const PLATFORMS = [
  'DRAFTKINGS',
  'FANDUEL',
  'BETMGM',
  'CAESARS',
  'FANATICS',
  'BALLYBET',
  'BETRIVERS',
  'BET365',
  'PAYPAL',
  'BANK',
  'EDGEBOOST',
] as const

interface RecordAllocationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RecordAllocationDialog({
  open,
  onOpenChange,
}: RecordAllocationDialogProps) {
  const router = useRouter()
  const [platform, setPlatform] = useState('')
  const [amount, setAmount] = useState('')
  const [direction, setDirection] = useState('')
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    if (!platform || !amount || !direction) {
      toast.error('Platform, amount, and direction are required.')
      return
    }

    startTransition(async () => {
      const result = await recordFundAllocation(
        platform,
        amount,
        direction,
        notes || undefined,
      )
      if (result.success) {
        toast.success('Allocation recorded')
        setPlatform('')
        setAmount('')
        setDirection('')
        setNotes('')
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to record allocation')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="record-allocation-dialog">
        <DialogHeader>
          <DialogTitle>Record Fund Allocation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Field>
            <FieldLabel>Platform</FieldLabel>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger data-testid="allocation-platform-select">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>Amount ($)</FieldLabel>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              data-testid="allocation-amount-input"
            />
          </Field>

          <Field>
            <FieldLabel>Direction</FieldLabel>
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger data-testid="allocation-direction-select">
                <SelectValue placeholder="Deposit or Withdrawal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEPOSIT">Deposit</SelectItem>
                <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>Notes (optional)</FieldLabel>
            <Textarea
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              data-testid="allocation-notes-input"
            />
          </Field>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              data-testid="allocation-submit-btn"
            >
              {isPending ? 'Recording...' : 'Record Allocation'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
