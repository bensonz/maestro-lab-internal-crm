'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface Agent {
  id: string
  name: string
  tier: string
  phone: string
  start: string
  clients: number
  earned: string
  month: string
  working: number
}

interface AgentListProps {
  agents: Agent[]
}

const tierColors: Record<string, string> = {
  MD: 'text-amber-400',
  SE: 'text-purple-400',
  ED: 'text-blue-400',
  '4★': 'text-emerald-400',
  '3★': 'text-cyan-400',
  '2★': 'text-slate-400',
  '1★': 'text-slate-500',
}

export function AgentList({ agents }: AgentListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.phone.includes(searchQuery)
  )

  return (
    <Card className="border-slate-800 bg-slate-900 lg:col-span-3">
      <CardHeader>
        <CardTitle className="text-white">Agent Directory ({filteredAgents.length})</CardTitle>
        <Input
          className="border-slate-700 bg-slate-800 text-white"
          placeholder="Search agents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </CardHeader>
      <CardContent>
        {filteredAgents.length === 0 ? (
          <p className="text-center text-slate-400 py-8">
            {agents.length === 0 ? 'No agents registered' : 'No agents match your search'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="pb-3">Agent</th>
                  <th className="pb-3">Phone</th>
                  <th className="pb-3">Start</th>
                  <th className="pb-3">Clients</th>
                  <th className="pb-3">Earned</th>
                  <th className="pb-3">Month</th>
                  <th className="pb-3">Working</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map((agent) => (
                  <tr key={agent.id} className="border-t border-slate-800">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${tierColors[agent.tier] || 'text-slate-400'}`}>
                          {agent.tier}
                        </span>
                        <span className="font-medium text-white">{agent.name}</span>
                      </div>
                    </td>
                    <td className="text-slate-400">{agent.phone || '—'}</td>
                    <td className="text-slate-400">{agent.start}</td>
                    <td className="text-white">{agent.clients}</td>
                    <td className="text-emerald-400">{agent.earned}</td>
                    <td className="text-white">{agent.month}</td>
                    <td className="text-slate-400">{agent.working}</td>
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
