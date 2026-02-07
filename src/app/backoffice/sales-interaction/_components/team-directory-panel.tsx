'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgentInHierarchy {
  id: string
  name: string
  level: string
  stars: number
  clientCount: number
}

interface HierarchyGroup {
  level: string
  agents: AgentInHierarchy[]
}

interface TeamDirectoryPanelProps {
  hierarchy: HierarchyGroup[]
  selectedAgentId: string | null
  onSelectAgent: (agentId: string | null) => void
}

export function TeamDirectoryPanel({
  hierarchy,
  selectedAgentId,
  onSelectAgent,
}: TeamDirectoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Filter agents by search
  const filteredHierarchy = hierarchy
    .map((group) => ({
      ...group,
      agents: group.agents.filter((agent) =>
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((group) => group.agents.length > 0)

  return (
    <div className="w-64 shrink-0 border-r border-border/50 bg-card/50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/30">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Team Directory
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            className="pl-9 h-9 text-sm bg-muted/30 border-border/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Clear Filter Button (when agent selected) */}
      {selectedAgentId && (
        <button
          onClick={() => onSelectAgent(null)}
          className="mx-4 mt-3 flex items-center justify-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20 transition-colors"
        >
          <X className="h-4 w-4" />
          Clear Filter
        </button>
      )}

      {/* Agent List */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {filteredHierarchy.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">
            No agents found
          </p>
        ) : (
          filteredHierarchy.map((group) => (
            <div key={group.level}>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                {group.level}
              </h3>
              <div className="space-y-1">
                {group.agents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => onSelectAgent(agent.id)}
                    className={cn(
                      'w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                      selectedAgentId === agent.id
                        ? 'bg-primary/20 text-primary ring-1 ring-primary/30'
                        : 'hover:bg-muted/50 text-foreground',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-accent">
                        {'★'.repeat(agent.stars)}
                      </span>
                      <span className="truncate">{agent.name}</span>
                    </div>
                    <span
                      className={cn(
                        'text-xs font-medium',
                        selectedAgentId === agent.id
                          ? 'text-primary'
                          : 'text-muted-foreground',
                      )}
                    >
                      {agent.clientCount}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
