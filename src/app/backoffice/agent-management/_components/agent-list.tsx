'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'

interface Agent {
  id: string
  name: string
  tier: string
  phone: string
  start: string
  clients: number
  working: number
  successRate: number
  delayRate: number
  avgDaysToConvert: number | null
}

interface AgentListProps {
  agents: Agent[]
}

function getSuccessRateBg(rate: number): string {
  if (rate >= 80) return 'bg-chart-4/20 text-chart-4 border-chart-4/30'
  if (rate >= 60) return 'bg-accent/20 text-accent border-accent/30'
  return 'bg-destructive/20 text-destructive border-destructive/30'
}

function getDelayRateBg(rate: number): string {
  if (rate <= 10) return 'bg-chart-4/20 text-chart-4 border-chart-4/30'
  if (rate <= 20) return 'bg-accent/20 text-accent border-accent/30'
  return 'bg-destructive/20 text-destructive border-destructive/30'
}

export function AgentList({ agents }: AgentListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.phone.includes(searchQuery)
  )

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm lg:col-span-3">
      <CardHeader>
        <CardTitle className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Agent Directory ({filteredAgents.length})
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="agent-search-input"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredAgents.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {agents.length === 0 ? 'No agents registered' : 'No agents match your search'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Agent</th>
                  <th className="pb-3 font-medium">Phone</th>
                  <th className="pb-3 font-medium">Start</th>
                  <th className="pb-3 font-medium">Clients</th>
                  <th className="pb-3 font-medium">Working</th>
                  <th className="pb-3 font-medium">Success %</th>
                  <th className="pb-3 font-medium">Delay %</th>
                  <th className="pb-3 font-medium">Avg Convert</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map((agent) => (
                  <tr
                    key={agent.id}
                    className="border-t border-border/50"
                    data-testid={`agent-row-${agent.id}`}
                  >
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">
                          {agent.tier}
                        </span>
                        <span className="font-medium text-foreground">{agent.name}</span>
                      </div>
                    </td>
                    <td className="text-muted-foreground">{agent.phone || '—'}</td>
                    <td className="text-muted-foreground">{agent.start}</td>
                    <td className="text-foreground font-mono">{agent.clients}</td>
                    <td className="text-muted-foreground font-mono">{agent.working}</td>
                    <td>
                      <Badge className={`text-xs font-mono ${getSuccessRateBg(agent.successRate)}`}>
                        {agent.successRate}%
                      </Badge>
                    </td>
                    <td>
                      <Badge className={`text-xs font-mono ${getDelayRateBg(agent.delayRate)}`}>
                        {agent.delayRate}%
                      </Badge>
                    </td>
                    <td className="font-mono text-muted-foreground">
                      {agent.avgDaysToConvert !== null ? `${agent.avgDaysToConvert}d` : '—'}
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
