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

const DESTINATIONS = [
  { value: 'BANK', label: 'Bank' },
  { value: 'PAYPAL', label: 'PayPal' },
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
  const [destination, setDestination] = useState('')
  const [transferMethod, setTransferMethod] = useState('')
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  const isWithdrawal = direction === 'WITHDRAWAL'
  const isBankWire = platform === 'BANK' || destination === 'BANK'

  const handleSubmit = () => {
    if (!platform || !amount || !direction) {
      toast.error('Platform, amount, and direction are required.')
      return
    }
    if (isWithdrawal && !destination) {
      toast.error('Destination is required for withdrawals.')
      return
    }

    startTransition(async () => {
      const result = await recordFundAllocation(
        platform,
        amount,
        direction,
        notes || undefined,
        isWithdrawal ? destination : undefined,
        isWithdrawal && isBankWire ? (transferMethod || 'ACH/Wire') : undefined,
      )
      if (result.success) {
        toast.success('Allocation recorded')
        setPlatform('')
        setAmount('')
        setDirection('')
        setDestination('')
        setTransferMethod('')
        setNotes('')
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to record allocation')
      }
    })
  }

  const handleDirectionChange = (val: string) => {
    setDirection(val)
    if (val !== 'WITHDRAWAL') {
      setDestination('')
      setTransferMethod('')
    }
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
            <Select value={direction} onValueChange={handleDirectionChange}>
              <SelectTrigger data-testid="allocation-direction-select">
                <SelectValue placeholder="Deposit or Withdrawal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEPOSIT">Deposit</SelectItem>
                <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {isWithdrawal && (
            <>
              <Field>
                <FieldLabel>Destination</FieldLabel>
                <Select value={destination} onValueChange={setDestination}>
                  <SelectTrigger data-testid="allocation-destination-select">
                    <SelectValue placeholder="Where are funds going?" />
                  </SelectTrigger>
                  <SelectContent>
                    {DESTINATIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {isBankWire && (
                <Field>
                  <FieldLabel>Transfer Method</FieldLabel>
                  <Select value={transferMethod} onValueChange={setTransferMethod}>
                    <SelectTrigger data-testid="allocation-method-select">
                      <SelectValue placeholder="ACH/Wire" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACH/Wire">ACH/Wire</SelectItem>
                      <SelectItem value="Zelle">Zelle</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </>
          )}

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
