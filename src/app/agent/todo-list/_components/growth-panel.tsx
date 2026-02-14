'use client'

import { UserPlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { GrowthClient } from './types'

// Client Card

function ClientCard({ client }: { client: GrowthClient }) {
  return (
    <div
      className="rounded-md border border-border/30 bg-muted/10 px-3 py-2.5"
      data-testid={`growth-client-${client.id}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {client.name}
            </span>
            <Badge
              variant="outline"
              className={cn(
                'h-4 px-1.5 text-[9px]',
                client.stage === 'in_progress'
                  ? 'border-primary/40 text-primary'
                  : client.stage === 'phone_issued'
                    ? 'border-warning/40 text-warning'
                    : client.stage === 'review'
                      ? 'border-success/40 text-success'
                      : 'border-border text-muted-foreground',
              )}
            >
              {client.stageLabel}
            </Badge>
          </div>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {client.pendingTasks} tasks &middot; Day {client.daysInPipeline}
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="font-mono text-sm font-bold text-success">
            ${client.expectedIncome}
          </p>
          <p className="text-[9px] text-muted-foreground">expected</p>
        </div>
      </div>
    </div>
  )
}

// Growth Panel

interface GrowthPanelProps {
  clients: GrowthClient[]
  starLevel: number
}

export function GrowthPanel({ clients, starLevel }: GrowthPanelProps) {
  const totalExpected = clients.reduce((s, c) => s + c.expectedIncome, 0)

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-lg border border-primary/15 bg-card"
      data-testid="growth-panel"
    >
      {/* Header */}
      <div className="border-b border-border/40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Growth Track
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted-foreground">
              {clients.length} lead{clients.length !== 1 ? 's' : ''}
            </span>
            <span className="font-mono text-xs font-semibold text-success">
              ${totalExpected}
            </span>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="max-h-[260px] space-y-2 overflow-y-auto p-3">
        {clients.length > 0 ? (
          clients.map((c) => <ClientCard key={c.id} client={c} />)
        ) : (
          <div className="py-8 text-center">
            <UserPlus className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No active leads</p>
          </div>
        )}
      </div>
    </div>
  )
}
