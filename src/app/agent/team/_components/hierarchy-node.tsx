'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { HierarchyNode as HierarchyNodeType } from '@/backend/data/hierarchy'

function starLabel(starLevel: number, tier: string): string {
  if (starLevel === 0) return tier
  return `${starLevel}★`
}

export function HierarchyNode({
  node,
  currentUserId,
  depth = 0,
}: {
  node: HierarchyNodeType
  currentUserId: string
  depth?: number
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.subordinates.length > 0
  const isCurrentUser = node.id === currentUserId

  return (
    <div data-testid={`hierarchy-node-${node.id}`}>
      <button
        type="button"
        onClick={() => hasChildren && setExpanded(!expanded)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
          hasChildren
            ? 'cursor-pointer hover:bg-muted/50'
            : 'cursor-default',
          isCurrentUser && 'bg-primary/5 font-medium',
        )}
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
        data-testid={`hierarchy-toggle-${node.id}`}
      >
        {/* Expand/collapse toggle */}
        <span className="flex h-4 w-4 items-center justify-center text-muted-foreground">
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )
          ) : (
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
          )}
        </span>

        {/* Star badge */}
        <Badge
          variant={node.starLevel > 0 ? 'default' : 'secondary'}
          className="min-w-[3.5rem] justify-center gap-0.5 text-[10px]"
        >
          {node.starLevel > 0 && <Star className="h-2.5 w-2.5" />}
          {starLabel(node.starLevel, node.tier)}
        </Badge>

        {/* Name */}
        <span className={cn('truncate', isCurrentUser && 'text-primary')}>
          {node.name}
          {isCurrentUser && (
            <span className="ml-1 text-[10px] text-muted-foreground">
              (you)
            </span>
          )}
        </span>

        {/* Stats */}
        <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span data-testid={`node-clients-${node.id}`}>
            {node.totalClients} clients
          </span>
          <span data-testid={`node-rate-${node.id}`}>
            {node.successRate > 0
              ? `${Math.round(node.successRate * 100)}%`
              : '--'}
          </span>
          <Badge
            variant={node.isActive ? 'outline' : 'destructive'}
            className="text-[10px]"
          >
            {node.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </span>
      </button>

      {/* Children */}
      {expanded &&
        node.subordinates.map((sub) => (
          <HierarchyNode
            key={sub.id}
            node={sub}
            currentUserId={currentUserId}
            depth={depth + 1}
          />
        ))}
    </div>
  )
}
