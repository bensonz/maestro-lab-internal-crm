'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Building2, Landmark, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { recordFundMovement } from '@/app/actions/fund-movements'

interface Client {
  id: string
  name: string
}

interface FundMovement {
  id: string
  type: string
  flowType: string
  fromClientName: string
  toClientName: string
  fromPlatform: string
  toPlatform: string
  amount: number
  fee: number | null
  method: string | null
  status: string
  recordedByName: string
  createdAt: string
}

interface FundAllocationFormProps {
  clients: Client[]
  movements: FundMovement[]
}

const platforms = [
  'Bank',
  'PayPal',
  'EdgeBoost',
  'DraftKings',
  'FanDuel',
  'BetMGM',
  'Caesars',
  'Fanatics',
  'Bally Bet',
  'BetRivers',
  'Bet365',
]

export function FundAllocationForm({
  clients,
  movements,
}: FundAllocationFormProps) {
  const [isPending, startTransition] = useTransition()

  // Form state
  const [transferType, setTransferType] = useState<'internal' | 'external'>(
    'internal',
  )
  const [flowType, setFlowType] = useState<'same' | 'different'>('same')
  const [fromClientId, setFromClientId] = useState('')
  const [toClientId, setToClientId] = useState('')
  const [fromPlatform, setFromPlatform] = useState('')
  const [toPlatform, setToPlatform] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('')
  const [fee, setFee] = useState('')
  const [notes, setNotes] = useState('')

  function resetForm() {
    setFromClientId('')
    setToClientId('')
    setFromPlatform('')
    setToPlatform('')
    setAmount('')
    setMethod('')
    setFee('')
    setNotes('')
  }

  function handleSubmit() {
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('Amount must be greater than 0')
      return
    }

    if (!fromClientId) {
      toast.error('Please select a client')
      return
    }

    if (!fromPlatform || !toPlatform) {
      toast.error('Please select both source and destination platforms')
      return
    }

    const resolvedFlowType =
      transferType === 'external'
        ? ('external' as const)
        : flowType === 'same'
          ? ('same_client' as const)
          : ('different_clients' as const)

    if (resolvedFlowType === 'different_clients' && !toClientId) {
      toast.error('Please select a destination client')
      return
    }

    startTransition(async () => {
      const result = await recordFundMovement({
        type: transferType,
        flowType: resolvedFlowType,
        fromClientId,
        toClientId:
          resolvedFlowType === 'same_client'
            ? fromClientId
            : toClientId || undefined,
        fromPlatform,
        toPlatform,
        amount: parsedAmount,
        method: method || undefined,
        fee: fee ? parseFloat(fee) : undefined,
        notes: notes || undefined,
      })

      if (result.success) {
        toast.success('Fund movement recorded')
        resetForm()
      } else {
        toast.error(result.error || 'Failed to record fund movement')
      }
    })
  }

  return (
    <Card className="card-terminal">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          New Fund Allocation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Selection */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setTransferType('internal')
              setFlowType('same')
              setFromPlatform('')
              setToPlatform('')
            }}
            className={cn(
              'rounded-lg border-2 p-3 text-center transition-all',
              transferType === 'internal'
                ? 'border-success bg-success/10'
                : 'border-border hover:border-muted-foreground',
            )}
            data-testid="transfer-type-internal"
          >
            <Building2
              className={cn(
                'mx-auto mb-1 h-5 w-5',
                transferType === 'internal'
                  ? 'text-success'
                  : 'text-muted-foreground',
              )}
            />
            <span
              className={cn(
                'text-xs font-medium',
                transferType === 'internal'
                  ? 'text-success'
                  : 'text-muted-foreground',
              )}
            >
              Internal
            </span>
          </button>
          <button
            onClick={() => {
              setTransferType('external')
              setFromPlatform('')
              setToPlatform('')
            }}
            className={cn(
              'rounded-lg border-2 p-3 text-center transition-all',
              transferType === 'external'
                ? 'border-warning bg-warning/10'
                : 'border-border hover:border-muted-foreground',
            )}
            data-testid="transfer-type-external"
          >
            <Landmark
              className={cn(
                'mx-auto mb-1 h-5 w-5',
                transferType === 'external'
                  ? 'text-warning'
                  : 'text-muted-foreground',
              )}
            />
            <span
              className={cn(
                'text-xs font-medium',
                transferType === 'external'
                  ? 'text-warning'
                  : 'text-muted-foreground',
              )}
            >
              External
            </span>
          </button>
        </div>

        {/* Internal Mode Selection */}
        {transferType === 'internal' && (
          <div className="grid grid-cols-2 gap-2" data-testid="flow-type-selector">
            <button
              onClick={() => {
                setFlowType('same')
                setFromPlatform('')
                setToPlatform('')
              }}
              className={cn(
                'rounded-lg border p-2 text-center text-xs transition-all',
                flowType === 'same'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-muted-foreground',
              )}
              data-testid="flow-type-same"
            >
              A &rarr; A (Same Client)
            </button>
            <button
              onClick={() => {
                setFlowType('different')
                setFromPlatform('')
                setToPlatform('')
              }}
              className={cn(
                'rounded-lg border p-2 text-center text-xs transition-all',
                flowType === 'different'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-muted-foreground',
              )}
              data-testid="flow-type-different"
            >
              A &rarr; B (Different Clients)
            </button>
          </div>
        )}

        {/* Source Client */}
        <div>
          <Field>
            <FieldLabel htmlFor="from-client">
              {transferType === 'external'
                ? 'From (Sender)'
                : transferType === 'internal' && flowType === 'different'
                  ? 'From Client'
                  : 'Client'}
            </FieldLabel>
            <Select value={fromClientId} onValueChange={setFromClientId}>
              <SelectTrigger id="from-client" data-testid="from-client-select">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No clients available
                  </SelectItem>
                ) : (
                  clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {/* Destination Client */}
        {(transferType === 'external' ||
          (transferType === 'internal' && flowType === 'different')) && (
          <div>
            <Field>
              <FieldLabel htmlFor="to-client">To (Receiver)</FieldLabel>
              <Select value={toClientId} onValueChange={setToClientId}>
                <SelectTrigger id="to-client" data-testid="to-client-select">
                  <SelectValue placeholder="Select receiver" />
                </SelectTrigger>
                <SelectContent>
                  {clients.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No clients available
                    </SelectItem>
                  ) : (
                    clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </Field>
          </div>
        )}

        {/* Amount */}
        <div>
          <Field>
            <FieldLabel htmlFor="amount">Amount</FieldLabel>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="pl-9 font-mono"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-testid="amount-input"
              />
            </div>
          </Field>
        </div>

        {/* Platform Selection */}
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="from-platform">From Platform</FieldLabel>
            <Select value={fromPlatform} onValueChange={setFromPlatform}>
              <SelectTrigger
                id="from-platform"
                data-testid="from-platform-select"
              >
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="to-platform">To Platform</FieldLabel>
            <Select value={toPlatform} onValueChange={setToPlatform}>
              <SelectTrigger
                id="to-platform"
                data-testid="to-platform-select"
              >
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {/* Bank Transfer Method */}
        {fromPlatform === 'Bank' &&
          toPlatform === 'Bank' &&
          (transferType === 'external' ||
            (transferType === 'internal' && flowType === 'different')) && (
            <Field>
              <FieldLabel htmlFor="method">Transfer Method</FieldLabel>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger id="method" data-testid="method-select">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zelle">Zelle</SelectItem>
                  <SelectItem value="wire">Wire</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}

        {/* Wire Fee */}
        {method === 'wire' && (
          <Field>
            <FieldLabel htmlFor="fee">Wire Fee</FieldLabel>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="fee"
                type="number"
                step="0.01"
                min="0"
                placeholder="25.00"
                className="pl-9 font-mono"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                data-testid="fee-input"
              />
            </div>
          </Field>
        )}

        {/* Notes */}
        <Field>
          <FieldLabel htmlFor="notes">Notes (Optional)</FieldLabel>
          <Textarea
            id="notes"
            placeholder="Add details..."
            className="resize-none"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            data-testid="notes-input"
          />
        </Field>

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={isPending}
          data-testid="record-allocation-btn"
        >
          {isPending ? 'Recording...' : 'Record Allocation'}
        </Button>
      </CardContent>
    </Card>
  )
}
