'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface Agent {
  name: string
  code: string
  pending: number
}

interface TeamDirectoryProps {
  agents: Agent[]
}

export function TeamDirectory({ agents }: TeamDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Card className="border-slate-800 bg-slate-900">
      <CardHeader>
        <CardTitle className="text-white">Team Directory</CardTitle>
        <Input
          className="border-slate-700 bg-slate-800 text-white"
          placeholder="Search agents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </CardHeader>
      <CardContent className="max-h-[600px] overflow-auto">
        {filteredAgents.length === 0 ? (
          <p className="text-center text-slate-400 py-4">
            {agents.length === 0 ? 'No agents registered' : 'No agents match your search'}
          </p>
        ) : (
          filteredAgents.map((agent) => (
            <div key={agent.name} className="mb-1 flex items-center justify-between rounded bg-slate-800 p-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400">{agent.code}</span>
                <span className="text-white">{agent.name}</span>
              </div>
              <Badge variant="outline" className="text-xs">{agent.pending}</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
