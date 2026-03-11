'use client'

import { Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TodoTimelineEntry } from './types'

interface ActivityFeedProps {
  entries: TodoTimelineEntry[]
}

export function ActivityFeed({ entries }: ActivityFeedProps) {
  return (
    <div className="card-terminal min-h-[320px] p-0" data-testid="activity-feed">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-3">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Activity
        </h3>
        <span className="font-mono text-xs text-muted-foreground">
          {entries.length} events
        </span>
      </div>

      {/* Content */}
      {entries.length === 0 ? (
        <div className="flex h-full items-center justify-center px-5 py-8">
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </div>
      ) : (
        <div className="max-h-[400px] divide-y divide-border/30 overflow-y-auto">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 px-5 py-2.5 transition-colors hover:bg-muted/20"
              data-testid={`activity-entry-${entry.id}`}
            >
              <div
                className={cn(
                  'mt-2 h-2 w-2 shrink-0 rounded-full',
                  entry.type === 'success' && 'bg-success',
                  entry.type === 'warning' && 'bg-warning',
                  entry.type === 'info' && 'bg-primary',
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{entry.event}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.time}
                  {entry.actor && ` — ${entry.actor}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
