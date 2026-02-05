'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface Client {
  id: string
  name: string
  phone: string
  email: string | null
  start: string
  funds: string
  platforms: string[]
  activePlatforms: string[]
}

interface ClientListProps {
  clients: Client[]
}

const platformColors: Record<string, string> = {
  DK: 'bg-green-600',
  FD: 'bg-blue-600',
  CZR: 'bg-yellow-600',
  MGM: 'bg-amber-600',
  BB: 'bg-purple-600',
  FAN: 'bg-red-600',
  BR: 'bg-teal-600',
  '365': 'bg-emerald-600',
}

export function ClientList({ clients }: ClientListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone.includes(searchQuery) ||
    (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <Card className="border-slate-800 bg-slate-900 lg:col-span-3">
      <CardHeader>
        <CardTitle className="text-white">Client Registry ({filteredClients.length})</CardTitle>
        <Input
          className="border-slate-700 bg-slate-800 text-white"
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </CardHeader>
      <CardContent>
        {filteredClients.length === 0 ? (
          <p className="text-center text-slate-400 py-8">
            {clients.length === 0 ? 'No clients yet' : 'No clients match your search'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Phone / Email</th>
                  <th className="pb-3">Start</th>
                  <th className="pb-3">Funds</th>
                  <th className="pb-3">Active</th>
                  <th className="pb-3">Limited</th>
                  <th className="pb-3">Pipeline</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id} className="border-t border-slate-800">
                    <td className="py-4">
                      <p className="font-medium text-white">{client.name}</p>
                    </td>
                    <td>
                      <p className="text-slate-300">{client.phone || '—'}</p>
                      {client.email && (
                        <p className="text-xs text-slate-400">{client.email}</p>
                      )}
                    </td>
                    <td className="text-slate-400">{client.start}</td>
                    <td className="font-medium text-white">{client.funds}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {client.activePlatforms.map((p) => (
                          <Badge key={p} className={`${platformColors[p] || 'bg-slate-600'} text-xs`}>{p}</Badge>
                        ))}
                        {client.activePlatforms.length === 0 && (
                          <span className="text-slate-500">—</span>
                        )}
                      </div>
                    </td>
                    <td className="text-slate-500">—</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {client.platforms.filter(p => !client.activePlatforms.includes(p)).map((p) => (
                          <Badge key={p} className="bg-slate-700 text-xs">{p}</Badge>
                        ))}
                        {client.platforms.filter(p => !client.activePlatforms.includes(p)).length === 0 && (
                          <span className="text-slate-500">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
