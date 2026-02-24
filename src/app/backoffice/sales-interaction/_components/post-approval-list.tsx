'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { FileCheck } from 'lucide-react'
import type { PostApprovalClient } from '@/types/backend-types'

interface PostApprovalListProps {
  clients: PostApprovalClient[]
  selectedAgentId: string | null
}

export function PostApprovalList({
  clients,
  selectedAgentId,
}: PostApprovalListProps) {
  if (clients.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-muted-foreground">
        {selectedAgentId
          ? 'No post-approval clients for selected agent'
          : 'No post-approval verification needed'}
      </p>
    )
  }

  return (
    <div className="divide-y divide-border/20">
      {clients.map((client) => (
        <div
          key={client.id}
          className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-5 py-2 transition-colors hover:bg-muted/30"
          data-testid={`post-approval-row-${client.id}`}
        >
          {/* Name + agent + limited platform badges */}
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/backoffice/client-management?client=${client.id}`}
                className="truncate text-sm font-medium text-foreground hover:text-primary hover:underline"
              >
                {client.name}
              </Link>
              <span className="text-[10px] text-muted-foreground/60">&bull;</span>
              <Link
                href={`/backoffice/agent-management/${client.agentId}`}
                className="shrink-0 text-[11px] text-muted-foreground hover:text-primary"
              >
                {client.agentName}
              </Link>
            </div>
            {/* LIMITED platform badges */}
            {client.limitedPlatforms.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                {client.limitedPlatforms.map((p) => (
                  <Badge
                    key={p.platformType}
                    variant="outline"
                    className="px-1.5 py-0 text-[10px] text-muted-foreground"
                  >
                    {p.name} LIMITED
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Pending todos */}
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {client.pendingVerificationTodos > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <FileCheck className="h-3 w-3" />
                {client.pendingVerificationTodos} {client.pendingVerificationTodos === 1 ? 'task' : 'tasks'}
              </span>
            )}
          </div>

          {/* Time since approval */}
          <div className="text-[11px] text-muted-foreground">
            {client.daysSinceApproval === 0
              ? 'Today'
              : `${client.daysSinceApproval}d ago`}
          </div>
        </div>
      ))}
    </div>
  )
}
