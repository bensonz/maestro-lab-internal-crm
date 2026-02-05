'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, User } from 'lucide-react'

interface Client {
  id: string
  name: string
  deposits: number
  withdrawals: number
}

interface SettlementViewProps {
  clients: Client[]
}

export function SettlementView({ clients }: SettlementViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClient, setSelectedClient] = useState<string | null>(null)

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selected = clients.find((c) => c.id === selectedClient)

  // Mock platform breakdown - would need proper tracking
  const platforms = ['Bank', 'DraftKings', 'FanDuel', 'BetMGM']

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Client List */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-400 text-sm font-medium">CLIENTS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-800 border-slate-700 text-white"
            />
          </div>

          {/* Client Cards */}
          <div className="space-y-2">
            {filteredClients.length === 0 ? (
              <p className="text-center text-slate-400 py-8">
                {clients.length === 0 ? 'No approved clients' : 'No clients match your search'}
              </p>
            ) : (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => setSelectedClient(client.id)}
                  className={`p-4 rounded-lg cursor-pointer transition-colors ${
                    selectedClient === client.id
                      ? 'bg-slate-700 ring-2 ring-emerald-500'
                      : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-slate-700">
                        <User className="h-4 w-4 text-slate-300" />
                      </div>
                      <span className="text-white font-medium">{client.name}</span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-emerald-500">+${client.deposits.toLocaleString()}</span>
                      <span className="text-red-500">-${client.withdrawals.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Settlement Details */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="flex items-center justify-center h-full min-h-[400px]">
          {selected ? (
            <div className="w-full space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-white">{selected.name}</h2>
                <p className="text-slate-400 text-sm">{selected.id}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4 text-center">
                    <p className="text-slate-400 text-sm">Total Deposits</p>
                    <p className="text-2xl font-bold text-emerald-500">
                      +${selected.deposits.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4 text-center">
                    <p className="text-slate-400 text-sm">Total Withdrawals</p>
                    <p className="text-2xl font-bold text-red-500">
                      -${selected.withdrawals.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 text-center">
                  <p className="text-slate-400 text-sm">Net Balance</p>
                  <p className={`text-3xl font-bold ${
                    selected.deposits - selected.withdrawals >= 0
                      ? 'text-emerald-500'
                      : 'text-red-500'
                  }`}>
                    ${(selected.deposits - selected.withdrawals).toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-400">Platform Breakdown</h3>
                <div className="space-y-2">
                  {platforms.map((platform) => (
                    <div key={platform} className="flex items-center justify-between p-3 rounded-lg bg-slate-800">
                      <span className="text-slate-300">{platform}</span>
                      <div className="flex gap-4 text-sm">
                        <Badge variant="outline" className="border-emerald-600 text-emerald-500">
                          +$0
                        </Badge>
                        <Badge variant="outline" className="border-red-600 text-red-500">
                          -$0
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-400">Select a client to view settlement details</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
