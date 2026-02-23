'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronDown, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAgentDisplayTier } from '@/lib/commission-constants'
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card'
import { Separator } from '@/components/ui/separator'

interface Agent {
  id: string
  name: string
  tier: string
  starLevel: number
  leadershipTier: string
  phone: string
  clients: number
  supervisorId: string | null
  zelle: string
  address: string
  totalEarned: number
  thisMonthEarned: number
  newClientsThisMonth: number
}

interface TreeNode {
  agent: Agent
  children: TreeNode[]
}

const LEADERSHIP_RANK: Record<string, number> = { NONE: 0, ED: 1, SED: 2, MD: 3, CMO: 4 }

function getAgentRank(agent: Agent): number {
  return agent.starLevel + (LEADERSHIP_RANK[agent.leadershipTier] || 0)
}

function sortNodesByRank(nodes: TreeNode[]): void {
  nodes.sort((a, b) => getAgentRank(b.agent) - getAgentRank(a.agent) || a.agent.name.localeCompare(b.agent.name))
  for (const node of nodes) {
    if (node.children.length > 0) sortNodesByRank(node.children)
  }
}

function buildTree(agents: Agent[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  for (const agent of agents) {
    map.set(agent.id, { agent, children: [] })
  }

  for (const agent of agents) {
    const node = map.get(agent.id)!
    if (agent.supervisorId && map.has(agent.supervisorId)) {
      map.get(agent.supervisorId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  sortNodesByRank(roots)
  return roots
}

/** Collect all ancestor IDs for a given agent in the full agent list */
function collectAncestorIds(agentId: string, agentMap: Map<string, Agent>): Set<string> {
  const ancestors = new Set<string>()
  let current = agentMap.get(agentId)
  while (current?.supervisorId) {
    ancestors.add(current.supervisorId)
    current = agentMap.get(current.supervisorId)
  }
  return ancestors
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

/** Extract 2-letter US state abbreviation from an address string */
function extractState(address: string): string | null {
  const match = address.match(/\b([A-Z]{2})\b(?:\s*\d{5})?/)
  return match?.[1] ?? null
}

function countDescendants(node: TreeNode): number {
  let count = node.children.length
  for (const child of node.children) {
    count += countDescendants(child)
  }
  return count
}

interface AgentTreeViewProps {
  agents: Agent[]
  allAgents: Agent[]
  hasActiveFilter: boolean
  onFilterTeam?: (agentId: string) => void
  teamFilterId?: string | null
}

export function AgentTreeView({ agents, allAgents, hasActiveFilter, onFilterTeam, teamFilterId }: AgentTreeViewProps) {
  // When filtering, include ancestors so the tree context is preserved
  const treeAgents = useMemo(() => {
    if (!hasActiveFilter) return agents

    const filteredIds = new Set(agents.map((a) => a.id))
    const allAgentMap = new Map(allAgents.map((a) => [a.id, a]))

    // Collect all ancestor IDs needed
    const ancestorIds = new Set<string>()
    for (const agent of agents) {
      for (const aid of collectAncestorIds(agent.id, allAgentMap)) {
        ancestorIds.add(aid)
      }
    }

    // Merge: filtered agents + their ancestors from allAgents
    const resultMap = new Map<string, Agent>()
    for (const agent of agents) {
      resultMap.set(agent.id, agent)
    }
    for (const aid of ancestorIds) {
      if (!resultMap.has(aid)) {
        const ancestor = allAgentMap.get(aid)
        if (ancestor) resultMap.set(aid, ancestor)
      }
    }

    return Array.from(resultMap.values())
  }, [agents, allAgents, hasActiveFilter])

  const matchedIds = useMemo(
    () => new Set(agents.map((a) => a.id)),
    [agents],
  )

  const tree = useMemo(() => buildTree(treeAgents), [treeAgents])

  // Default expanded: all nodes at depth < 2, or all nodes when filtering
  const defaultExpanded = useMemo(() => {
    const ids = new Set<string>()
    function walk(nodes: TreeNode[], depth: number) {
      for (const node of nodes) {
        if (hasActiveFilter || depth < 2) {
          ids.add(node.agent.id)
        }
        walk(node.children, depth + 1)
      }
    }
    walk(tree, 0)
    return ids
  }, [tree, hasActiveFilter])

  const [expanded, setExpanded] = useState<Set<string>>(defaultExpanded)

  // Reset expanded state when filter changes
  const [prevDefault, setPrevDefault] = useState(defaultExpanded)
  if (prevDefault !== defaultExpanded) {
    setPrevDefault(defaultExpanded)
    setExpanded(defaultExpanded)
  }

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  if (tree.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No agents match your search
      </p>
    )
  }

  return (
    <div className="py-2" data-testid="agent-tree-view">
      {tree.map((node, i) => (
        <TreeNodeRow
          key={node.agent.id}
          node={node}
          depth={0}
          expanded={expanded}
          toggleExpanded={toggleExpanded}
          matchedIds={matchedIds}
          hasActiveFilter={hasActiveFilter}
          isLast={i === tree.length - 1}
          parentLines={[]}
          onFilterTeam={onFilterTeam}
          teamFilterId={teamFilterId}
        />
      ))}
    </div>
  )
}

interface TreeNodeRowProps {
  node: TreeNode
  depth: number
  expanded: Set<string>
  toggleExpanded: (id: string) => void
  matchedIds: Set<string>
  hasActiveFilter: boolean
  isLast: boolean
  parentLines: boolean[] // true = parent at that depth still has more siblings below
  onFilterTeam?: (agentId: string) => void
  teamFilterId?: string | null
}

function TreeNodeRow({
  node,
  depth,
  expanded,
  toggleExpanded,
  matchedIds,
  hasActiveFilter,
  isLast,
  parentLines,
  onFilterTeam,
  teamFilterId,
}: TreeNodeRowProps) {
  const router = useRouter()
  const { agent, children } = node
  const isExpanded = expanded.has(agent.id)
  const hasChildren = children.length > 0
  const isMatch = !hasActiveFilter || matchedIds.has(agent.id)
  const displayTier = getAgentDisplayTier(agent.starLevel, agent.leadershipTier)
  const descendantCount = countDescendants(node)

  return (
    <>
      <div
        className={cn(
          'group flex items-center transition-colors hover:bg-muted/30',
          !isMatch && 'opacity-50',
        )}
        data-testid={`agent-tree-node-${agent.id}`}
      >
        {/* Tree connector lines */}
        <div className="flex items-stretch shrink-0" style={{ width: depth * 24 + 8 }}>
          {Array.from({ length: depth }, (_, i) => (
            <div
              key={i}
              className="w-6 shrink-0 relative"
            >
              {parentLines[i] && (
                <div className="absolute left-[11px] top-0 bottom-0 w-px bg-border" />
              )}
            </div>
          ))}
        </div>

        {/* Connector to this node */}
        {depth > 0 && (
          <div className="relative w-0 h-8 shrink-0" style={{ marginLeft: -13 }}>
            <div className={cn(
              'absolute left-0 top-0 w-px bg-border',
              isLast ? 'h-4' : 'h-full',
            )} />
            <div className="absolute left-0 top-4 w-3 h-px bg-border -translate-y-px" />
          </div>
        )}

        {/* Expand/collapse toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) toggleExpanded(agent.id)
          }}
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors',
            hasChildren
              ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
              : 'text-transparent',
          )}
          tabIndex={hasChildren ? 0 : -1}
          data-testid={`agent-tree-toggle-${agent.id}`}
        >
          {hasChildren && (
            isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )
          )}
        </button>

        {/* Agent info row — clickable */}
        <div
          onClick={() => router.push(`/backoffice/agent-management/${agent.id}?view=tree`)}
          className="flex flex-1 items-center gap-2 py-1.5 px-2 cursor-pointer min-w-0"
        >
          {/* Avatar */}
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20">
            <span className="text-[10px] font-medium text-primary">
              {getInitials(agent.name)}
            </span>
          </div>

          {/* Name with hover card */}
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <span
                className="truncate font-medium text-sm cursor-default"
                onClick={(e) => e.stopPropagation()}
                data-testid={`agent-name-hover-trigger-${agent.id}`}
              >
                {agent.name}
              </span>
            </HoverCardTrigger>
            <HoverCardContent align="start" className="w-56 p-3" data-testid={`agent-name-hover-${agent.id}`}>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Zelle:</span>{' '}
                  <span className="font-mono">{agent.zelle || '\u2014'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">State:</span>{' '}
                  <span className="font-mono font-medium">{extractState(agent.address) || '\u2014'}</span>
                </div>
                <Separator />
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="font-mono font-semibold text-success">
                      ${(agent.totalEarned / 1000).toFixed(1)}K
                    </p>
                    <p className="text-[9px] text-muted-foreground">Total Earned</p>
                  </div>
                  <div>
                    <p className="font-mono font-semibold">
                      ${agent.thisMonthEarned.toLocaleString()}
                    </p>
                    <p className="text-[9px] text-muted-foreground">This Month</p>
                  </div>
                  <div>
                    <p className="font-mono font-semibold">
                      {agent.newClientsThisMonth}
                    </p>
                    <p className="text-[9px] text-muted-foreground">New Clients</p>
                  </div>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>

          {/* Tier badge */}
          <span className="shrink-0 rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
            {displayTier}
          </span>

          {/* Phone */}
          {agent.phone && (
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
              {agent.phone}
            </span>
          )}

          {/* Client count */}
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
            {agent.clients} clients
          </span>

          {/* Subordinate count badge — clickable to filter by team */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onFilterTeam?.(agent.id)
              }}
              title={teamFilterId === agent.id ? 'Clear team filter' : `Filter ${agent.name}'s team`}
              className={cn(
                'ml-auto shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors',
                teamFilterId === agent.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary',
              )}
              data-testid={`agent-tree-team-filter-${agent.id}`}
            >
              <Users className="h-3 w-3" />
              {descendantCount}
            </button>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        children.map((child, i) => (
          <TreeNodeRow
            key={child.agent.id}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            toggleExpanded={toggleExpanded}
            matchedIds={matchedIds}
            hasActiveFilter={hasActiveFilter}
            isLast={i === children.length - 1}
            parentLines={[...parentLines, !isLast]}
            onFilterTeam={onFilterTeam}
            teamFilterId={teamFilterId}
          />
        ))
      )}
    </>
  )
}
