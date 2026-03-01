'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TodoTimelineEntry } from './types'

interface ActivityFeedProps {
  entries: TodoTimelineEntry[]
}

export function ActivityFeed({ entries }: ActivityFeedProps) {
  return (
    <Card data-testid="activity-feed">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Activity Feed</CardTitle>
          <span className="text-xs text-muted-foreground">
            Recent events
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No recent activity
          </p>
        ) : (
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 rounded-md px-3 py-2 hover:bg-muted/50"
                data-testid={`activity-entry-${entry.id}`}
              >
                <div
                  className={cn(
                    'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                    entry.type === 'success' && 'bg-success',
                    entry.type === 'warning' && 'bg-warning',
                    entry.type === 'info' && 'bg-primary',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{entry.event}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {entry.date} at {entry.time}
                    {entry.actor && ` — ${entry.actor}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
