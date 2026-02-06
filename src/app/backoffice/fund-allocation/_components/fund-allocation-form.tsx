'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Building2,
  ArrowUpCircle,
  DollarSign,
  ArrowRight,
} from 'lucide-react'
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
  'Bank', 'PayPal', 'EdgeBoost',
  'DraftKings', 'FanDuel', 'BetMGM', 'Caesars',
  'Fanatics', 'Bally Bet', 'BetRivers', 'Bet365',
]

export function FundAllocationForm({ clients, movements }: FundAllocationFormProps) {
  const [isPending, startTransition] = useTransition()

  // Form state
  const [transferType, setTransferType] = useState<'internal' | 'external'>('internal')
  const [flowType, setFlowType] = useState<'same' | 'different'>('same')
  const [fromClientId, setFromClientId] = useState('')
  const [toClientId, setToClientId] = useState('')
  const [fromPlatform, setFromPlatform] = useState('')
  const [toPlatform, setToPlatform] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('')
  const [fee, setFee] = useState('')
  const [notes, setNotes] = useState('')

  // Movement list filters
  const [movementFilter, setMovementFilter] = useState('all')

  const filteredMovements = movements.filter((m) => {
    if (movementFilter === 'all') return true
    return m.type === movementFilter
  })

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

    const resolvedFlowType = transferType === 'external'
      ? 'external' as const
      : flowType === 'same'
        ? 'same_client' as const
        : 'different_clients' as const

    if (resolvedFlowType === 'different_clients' && !toClientId) {
      toast.error('Please select a destination client')
      return
    }

    startTransition(async () => {
      const result = await recordFundMovement({
        type: transferType,
        flowType: resolvedFlowType,
        fromClientId,
        toClientId: resolvedFlowType === 'same_client' ? fromClientId : toClientId || undefined,
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
    <div className="grid grid-cols-2 gap-6">
      {/* New Fund Allocation Form */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            New Fund Allocation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Transfer Type */}
          <div className="flex gap-2" data-testid="transfer-type-selector">
            <Button
              variant={transferType === 'internal' ? 'default' : 'outline'}
              onClick={() => setTransferType('internal')}
              data-testid="transfer-type-internal"
            >
              <Building2 className="mr-2 h-4 w-4" />
              Internal
            </Button>
            <Button
              variant={transferType === 'external' ? 'default' : 'outline'}
              onClick={() => setTransferType('external')}
              data-testid="transfer-type-external"
            >
              <ArrowUpCircle className="mr-2 h-4 w-4" />
              External
            </Button>
          </div>

          {/* Flow Type (only for internal) */}
          {transferType === 'internal' && (
            <div className="flex gap-2" data-testid="flow-type-selector">
              <Button
                size="sm"
                variant={flowType === 'same' ? 'default' : 'outline'}
                onClick={() => setFlowType('same')}
                data-testid="flow-type-same"
              >
                A &rarr; A (Same Client)
              </Button>
              <Button
                size="sm"
                variant={flowType === 'different' ? 'default' : 'outline'}
                onClick={() => setFlowType('different')}
                data-testid="flow-type-different"
              >
                A &rarr; B (Different Clients)
              </Button>
            </div>
          )}

          {/* Source Client */}
          <Field>
            <FieldLabel htmlFor="from-client">
              {transferType === 'internal' && flowType === 'different' ? 'From Client' : 'Client'}
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

          {/* Destination Client (for different_clients or external) */}
          {(transferType === 'external' || (transferType === 'internal' && flowType === 'different')) && (
            <Field>
              <FieldLabel htmlFor="to-client">To Client</FieldLabel>
              <Select value={toClientId} onValueChange={setToClientId}>
                <SelectTrigger id="to-client" data-testid="to-client-select">
                  <SelectValue placeholder="Select destination client" />
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
          )}

          {/* Amount + Fee */}
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="amount">Amount</FieldLabel>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
            <Field>
              <FieldLabel htmlFor="fee">Fee (Optional)</FieldLabel>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fee"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-9 font-mono"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  data-testid="fee-input"
                />
              </div>
            </Field>
          </div>

          {/* Platform Selection */}
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="from-platform">From Platform</FieldLabel>
              <Select value={fromPlatform} onValueChange={setFromPlatform}>
                <SelectTrigger id="from-platform" data-testid="from-platform-select">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="to-platform">To Platform</FieldLabel>
              <Select value={toPlatform} onValueChange={setToPlatform}>
                <SelectTrigger id="to-platform" data-testid="to-platform-select">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Method */}
          <Field>
            <FieldLabel htmlFor="method">Transfer Method (Optional)</FieldLabel>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger id="method" data-testid="method-select">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="zelle">Zelle</SelectItem>
                <SelectItem value="wire">Wire</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {/* Notes */}
          <Field>
            <FieldLabel htmlFor="notes">Notes (Optional)</FieldLabel>
            <Textarea
              id="notes"
              placeholder="Add details..."
              className="resize-none"
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

      {/* Fund Movements */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Fund Movements ({filteredMovements.length})
          </CardTitle>
          <Tabs value={movementFilter} onValueChange={setMovementFilter}>
            <TabsList>
              <TabsTrigger value="all" data-testid="filter-all">All</TabsTrigger>
              <TabsTrigger value="external" data-testid="filter-external">External</TabsTrigger>
              <TabsTrigger value="internal" data-testid="filter-internal">Internal</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredMovements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No fund movements recorded</p>
          ) : (
            filteredMovements.map((movement) => (
              <div
                key={movement.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30"
                data-testid={`movement-row-${movement.id}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge
                    variant="outline"
                    className={movement.type === 'internal'
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'bg-accent/10 text-accent border-accent/30'
                    }
                  >
                    {movement.type === 'internal' ? 'INT' : 'EXT'}
                  </Badge>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="font-medium text-foreground truncate">
                        {movement.fromClientName}
                      </span>
                      {movement.flowType === 'different_clients' && (
                        <>
                          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="font-medium text-foreground truncate">
                            {movement.toClientName}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {movement.fromPlatform} &rarr; {movement.toPlatform}
                      {' '}&middot;{' '}{movement.createdAt}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5">
                    {movement.method && (
                      <Badge variant="outline" className="text-xs">
                        {movement.method}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={movement.status === 'completed'
                        ? 'bg-chart-4/10 text-chart-4 border-chart-4/30'
                        : 'bg-accent/10 text-accent border-accent/30'
                      }
                    >
                      {movement.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <span className="text-foreground font-semibold font-mono">
                      ${movement.amount.toLocaleString()}
                    </span>
                    {movement.fee && (
                      <span className="text-muted-foreground text-xs font-mono ml-1">
                        (+${movement.fee})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
