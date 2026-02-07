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

function getCategoryIcon(category: EventCategory) {
  switch (category) {
    case 'milestone':
      return <CheckCircle2 className="h-3 w-3" />
    case 'compliance':
      return <AlertCircle className="h-3 w-3" />
    case 'agent':
      return <User className="h-3 w-3" />
    default:
      return <Settings className="h-3 w-3" />
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
  const [isOpen, setIsOpen] = useState(true)

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

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm h-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-4">
          <CollapsibleTrigger className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-semibold">
                Event Timeline
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-muted/50 text-muted-foreground text-xs rounded-md flex items-center gap-1"
              >
                <Lock className="h-3 w-3" />
                Immutable
              </Badge>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No events recorded</p>
              </div>
            ) : (
              <div className="space-y-6">
                {dateKeys.map((dateKey) => (
                  <div key={dateKey}>
                    <p className="text-xs font-medium text-muted-foreground mb-3">
                      {dateKey}
                    </p>
                    <div className="relative space-y-4 pl-6">
                      {/* Timeline line */}
                      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/50" />

                      {groupedEvents[dateKey].map((event) => {
                        const category = getEventCategory(event.eventType)
                        const { time } = formatDateTime(event.createdAt)

                        return (
                          <div key={event.id} className="relative flex gap-3">
                            {/* Timeline dot */}
                            <div
                              className={`absolute -left-6 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full ${getCategoryColor(
                                category,
                              )}`}
                            >
                              <div className="h-1.5 w-1.5 rounded-full bg-background" />
                            </div>

                            <div className="flex-1 space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm text-foreground">
                                  {event.description}
                                </p>
                                <span className="shrink-0 text-xs text-muted-foreground">
                                  {time}
                                </span>
                              </div>
                              {event.userName !== 'System' && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <User className="h-3 w-3" />
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
            <div className="mt-6 pt-4 border-t border-border/30">
              <p className="text-xs text-muted-foreground mb-2">Legend</p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
                  <span className="text-xs text-muted-foreground">System</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                  <span className="text-xs text-muted-foreground">Agent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-success" />
                  <span className="text-xs text-muted-foreground">
                    Milestone
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-destructive" />
                  <span className="text-xs text-muted-foreground">
                    Compliance
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
