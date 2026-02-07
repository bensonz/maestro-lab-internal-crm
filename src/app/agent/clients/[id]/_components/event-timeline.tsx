'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  History,
  ChevronDown,
  Lock,
  User,
  Settings,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { EventType } from '@/types'
import { cn } from '@/lib/utils'

interface Event {
  id: string
  eventType: EventType
  description: string
  metadata: unknown
  oldValue: string | null
  newValue: string | null
  userName: string
  createdAt: Date
}

interface EventTimelineProps {
  events: Event[]
}

type EventCategory = 'system' | 'agent' | 'milestone' | 'compliance'

function getEventCategory(eventType: EventType): EventCategory {
  switch (eventType) {
    case EventType.APPLICATION_SUBMITTED:
    case EventType.APPROVAL:
    case EventType.PHONE_ISSUED:
    case EventType.PHONE_RETURNED:
      return 'milestone'
    case EventType.REJECTION:
    case EventType.KPI_IMPACT:
    case EventType.DEADLINE_MISSED:
      return 'compliance'
    case EventType.COMMENT:
    case EventType.PLATFORM_UPLOAD:
    case EventType.TODO_COMPLETED:
      return 'agent'
    default:
      return 'system'
  }
}

function getCategoryColor(category: EventCategory) {
  switch (category) {
    case 'milestone':
      return 'bg-success'
    case 'compliance':
      return 'bg-destructive'
    case 'agent':
      return 'bg-primary'
    default:
      return 'bg-muted-foreground'
  }
}

function formatDateTime(date: Date): { date: string; time: string } {
  const d = new Date(date)
  return {
    date: d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    time: d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
  }
}

export function EventTimeline({ events }: EventTimelineProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Group events by date
  const groupedEvents = events.reduce(
    (groups, event) => {
      const { date } = formatDateTime(event.createdAt)
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(event)
      return groups
    },
    {} as Record<string, Event[]>,
  )

  const dateKeys = Object.keys(groupedEvents)

  // Recent events for collapsed preview
  const recentEvents = events.slice(0, 3)

  return (
    <Card className="card-terminal">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="px-3 pb-2 pt-3">
          <CollapsibleTrigger className="flex w-full items-center justify-between">
            <CardTitle className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <History className="h-3.5 w-3.5" />
              Event Timeline
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="flex items-center gap-1 rounded text-[10px] text-muted-foreground"
              >
                <Lock className="h-2.5 w-2.5" />
                Immutable
              </Badge>
              <Badge
                variant="outline"
                className="font-mono text-[10px]"
              >
                {events.length}
              </Badge>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform',
                  isOpen && 'rotate-180',
                )}
              />
            </div>
          </CollapsibleTrigger>

          {/* Collapsed preview — horizontal mini-timeline */}
          {!isOpen && recentEvents.length > 0 && (
            <div className="mt-2 flex items-center gap-3 overflow-x-auto">
              {recentEvents.map((event) => {
                const category = getEventCategory(event.eventType)
                const { time } = formatDateTime(event.createdAt)
                return (
                  <div
                    key={event.id}
                    className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full',
                        getCategoryColor(category),
                      )}
                    />
                    <span className="max-w-[180px] truncate text-[11px]">
                      {event.description}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground/60">
                      {time}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="p-2.5 pt-0">
            {events.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <History className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">No events recorded</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dateKeys.map((dateKey) => (
                  <div key={dateKey}>
                    <p className="mb-2 text-[10px] font-medium text-muted-foreground">
                      {dateKey}
                    </p>
                    <div className="relative space-y-2 pl-5">
                      {/* Timeline line */}
                      <div className="absolute bottom-2 left-[5px] top-2 w-px bg-border/50" />

                      {groupedEvents[dateKey].map((event) => {
                        const category = getEventCategory(event.eventType)
                        const { time } = formatDateTime(event.createdAt)

                        return (
                          <div key={event.id} className="relative flex gap-2">
                            {/* Timeline dot */}
                            <div
                              className={cn(
                                'absolute -left-5 top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full',
                                getCategoryColor(category),
                              )}
                            >
                              <div className="h-1 w-1 rounded-full bg-background" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs text-foreground">
                                  {event.description}
                                </p>
                                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                                  {time}
                                </span>
                              </div>
                              {event.userName !== 'System' && (
                                <p className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                  <User className="h-2.5 w-2.5" />
                                  {event.userName}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Legend */}
            <div className="mt-3 border-t border-border/30 pt-2">
              <div className="flex flex-wrap gap-3">
                {[
                  { color: 'bg-muted-foreground', label: 'System' },
                  { color: 'bg-primary', label: 'Agent' },
                  { color: 'bg-success', label: 'Milestone' },
                  { color: 'bg-destructive', label: 'Compliance' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1">
                    <div className={cn('h-2 w-2 rounded-full', color)} />
                    <span className="text-[10px] text-muted-foreground">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
