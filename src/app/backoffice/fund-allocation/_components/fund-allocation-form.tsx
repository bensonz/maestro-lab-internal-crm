'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'

interface Client {
  id: string
  name: string
}

interface FundMovement {
  id: string
  from: string
  to: string
  amount: number
  type: string
  method: string
  status: string
  agent: string
  time: string
  fee?: number
}

interface FundAllocationFormProps {
  clients: Client[]
  movements: FundMovement[]
}

const platforms = ['Bank', 'PayPal', 'EdgeBoost', 'DraftKings', 'FanDuel', 'BetMGM', 'Caesars', 'Fanatics', 'Bally Bet', 'BetRivers', 'Bet365']

export function FundAllocationForm({ clients, movements }: FundAllocationFormProps) {
  const [transferType, setTransferType] = useState<'internal' | 'external'>('internal')
  const [flowType, setFlowType] = useState<'same' | 'different'>('same')
  const [movementFilter, setMovementFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('1d')

  const filteredMovements = movements.filter((m) => {
    if (movementFilter === 'all') return true
    return m.type === movementFilter
  })

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* New Fund Allocation Form */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">New Fund Allocation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Transfer Type */}
          <div className="flex gap-2">
            <Button
              variant={transferType === 'internal' ? 'default' : 'outline'}
              className={transferType === 'internal' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-slate-700 text-slate-300'}
              onClick={() => setTransferType('internal')}
            >
              <Building2 className="mr-2 h-4 w-4" />
              Internal
            </Button>
            <Button
              variant={transferType === 'external' ? 'default' : 'outline'}
              className={transferType === 'external' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-slate-700 text-slate-300'}
              onClick={() => setTransferType('external')}
            >
              <ArrowUpCircle className="mr-2 h-4 w-4" />
              External
            </Button>
          </div>

          {/* Flow Type */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={flowType === 'same' ? 'default' : 'outline'}
              className={flowType === 'same' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-slate-700 text-slate-300'}
              onClick={() => setFlowType('same')}
            >
              A → A (Same Client)
            </Button>
            <Button
              size="sm"
              variant={flowType === 'different' ? 'default' : 'outline'}
              className={flowType === 'different' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-slate-700 text-slate-300'}
              onClick={() => setFlowType('different')}
            >
              A → B (Different Clients)
            </Button>
          </div>

          {/* Client Selection */}
          <div className="space-y-2">
            <Label className="text-slate-300">Client</Label>
            <Select>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {clients.length === 0 ? (
                  <SelectItem value="none" disabled className="text-slate-400">
                    No clients available
                  </SelectItem>
                ) : (
                  clients.map((client) => (
                    <SelectItem key={client.id} value={client.id} className="text-white">
                      {client.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label className="text-slate-300">Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="number"
                placeholder="0.00"
                className="pl-9 bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          {/* Platform Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">From Platform</Label>
              <Select>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {platforms.map((p) => (
                    <SelectItem key={p} value={p} className="text-white">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">To Platform</Label>
              <Select>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {platforms.map((p) => (
                    <SelectItem key={p} value={p} className="text-white">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-slate-300">Notes (Optional)</Label>
            <Textarea
              placeholder="Add details..."
              className="bg-slate-800 border-slate-700 text-white resize-none"
            />
          </div>

          <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
            Record Allocation
          </Button>
        </CardContent>
      </Card>

      {/* Fund Movements */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Fund Movements ({filteredMovements.length})</CardTitle>
          <div className="flex gap-2">
            <Tabs value={movementFilter} onValueChange={setMovementFilter}>
              <TabsList className="bg-slate-800">
                <TabsTrigger value="all" className="data-[state=active]:bg-slate-700">All</TabsTrigger>
                <TabsTrigger value="external" className="data-[state=active]:bg-slate-700">External</TabsTrigger>
                <TabsTrigger value="internal" className="data-[state=active]:bg-slate-700">Internal</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={timeFilter} onValueChange={setTimeFilter}>
              <TabsList className="bg-slate-800">
                <TabsTrigger value="1d" className="data-[state=active]:bg-slate-700">1D</TabsTrigger>
                <TabsTrigger value="7d" className="data-[state=active]:bg-slate-700">7D</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredMovements.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No fund movements recorded</p>
          ) : (
            filteredMovements.map((movement) => (
              <div key={movement.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={movement.type === 'internal' ? 'border-emerald-600 text-emerald-500' : 'border-amber-600 text-amber-500'}>
                    {movement.type === 'internal' ? 'INT' : 'EXT'}
                  </Badge>
                  <div>
                    <p className="text-white font-medium">
                      {movement.from} → {movement.to}
                    </p>
                    <p className="text-xs text-slate-400">{movement.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">{movement.agent}</span>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                      {movement.method}
                    </Badge>
                    <Badge variant="outline" className={movement.status === 'completed' ? 'border-emerald-600 text-emerald-500' : 'border-amber-600 text-amber-500'}>
                      {movement.status}
                    </Badge>
                  </div>
                  <span className="text-white font-semibold">
                    ${movement.amount.toLocaleString()}
                    {movement.fee && <span className="text-slate-400 text-xs ml-1">(+${movement.fee})</span>}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
