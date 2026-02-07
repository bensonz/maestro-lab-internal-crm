'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

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
  DK: 'bg-success/20 text-success border-success/30',
  FD: 'bg-primary/20 text-primary border-primary/30',
  CZR: 'bg-warning/20 text-warning border-warning/30',
  MGM: 'bg-warning/20 text-warning border-warning/30',
  BB: 'bg-primary/20 text-primary border-primary/30',
  FAN: 'bg-destructive/20 text-destructive border-destructive/30',
  BR: 'bg-primary/20 text-primary border-primary/30',
  '365': 'bg-success/20 text-success border-success/30',
}

export function ClientList({ clients }: ClientListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery) ||
      (client.email &&
        client.email.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  return (
    <Card className="card-terminal lg:col-span-3">
      <CardHeader className="py-3 px-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Client Registry ({filteredClients.length})
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            className="pl-9 bg-background/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filteredClients.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {clients.length === 0
              ? 'No clients yet'
              : 'No clients match your search'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <th className="text-left p-2 font-medium">Name</th>
                  <th className="text-left p-2 font-medium">Phone / Email</th>
                  <th className="text-left p-2 font-medium">Start</th>
                  <th className="text-left p-2 font-medium">Funds</th>
                  <th className="text-left p-2 font-medium">Active</th>
                  <th className="text-left p-2 font-medium">Limited</th>
                  <th className="text-left p-2 font-medium">Pipeline</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-2">
                      <p className="font-medium text-foreground">
                        {client.name}
                      </p>
                    </td>
                    <td className="p-2">
                      <p className="text-foreground">{client.phone || '—'}</p>
                      {client.email && (
                        <p className="text-xs text-muted-foreground">
                          {client.email}
                        </p>
                      )}
                    </td>
                    <td className="p-2 text-muted-foreground">{client.start}</td>
                    <td className="p-2 font-medium font-mono text-foreground">
                      {client.funds}
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {client.activePlatforms.map((p) => (
                          <Badge
                            key={p}
                            variant="outline"
                            className={`text-[9px] px-1 py-0.5 font-medium ${platformColors[p] || 'bg-muted text-muted-foreground'}`}
                          >
                            {p}
                          </Badge>
                        ))}
                        {client.activePlatforms.length === 0 && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-muted-foreground">—</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {client.platforms
                          .filter((p) => !client.activePlatforms.includes(p))
                          .map((p) => (
                            <Badge
                              key={p}
                              variant="outline"
                              className="text-[9px] px-1 py-0.5 font-medium bg-primary/20 text-primary border-primary/30"
                            >
                              {p}
                            </Badge>
                          ))}
                        {client.platforms.filter(
                          (p) => !client.activePlatforms.includes(p),
                        ).length === 0 && (
                          <span className="text-muted-foreground">—</span>
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
