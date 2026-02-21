'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronDown, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAgentDisplayTier } from '@/lib/commission-constants'

interface Agent {
  id: string
  name: string
  tier: string
  starLevel: number
  leadershipTier: string
  phone: string
  clients: number
  supervisorId: string | null
}

interface TreeNode {
  agent: Agent
  children: TreeNode[]
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
}

export function AgentTreeView({ agents, allAgents, hasActiveFilter }: AgentTreeViewProps) {
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
          onClick={() => router.push(`/backoffice/agent-management/${agent.id}`)}
          className="flex flex-1 items-center gap-2 py-1.5 px-2 cursor-pointer min-w-0"
        >
          {/* Avatar */}
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20">
            <span className="text-[10px] font-medium text-primary">
              {getInitials(agent.name)}
            </span>
          </div>

          {/* Name */}
          <span className="truncate font-medium text-sm">
            {agent.name}
          </span>

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

          {/* Subordinate count badge */}
          {hasChildren && (
            <span className="ml-auto shrink-0 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Users className="h-3 w-3" />
              {descendantCount}
            </span>
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
          />
        ))
      )}
    </>
  )
}
