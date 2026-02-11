'use client'

import Link from 'next/link'
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Hourglass,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { IntakeStatus } from '@/types'
import { cn } from '@/lib/utils'
import { DeadlineCountdown } from '@/components/deadline-countdown'
import type { AgentClient } from './types'

const statusBadgeConfig: Record<
  string,
  { icon: React.ElementType | null; className: string }
> = {
  [IntakeStatus.IN_EXECUTION]: {
    icon: Clock,
    className: 'bg-primary/20 text-primary border-primary/30',
  },
  [IntakeStatus.PHONE_ISSUED]: {
    icon: Clock,
    className: 'bg-primary/20 text-primary border-primary/30',
  },
  [IntakeStatus.NEEDS_MORE_INFO]: {
    icon: AlertCircle,
    className: 'bg-destructive/20 text-destructive border-destructive/30',
  },
  [IntakeStatus.PENDING_EXTERNAL]: {
    icon: AlertCircle,
    className: 'bg-destructive/20 text-destructive border-destructive/30',
  },
  [IntakeStatus.EXECUTION_DELAYED]: {
    icon: AlertCircle,
    className: 'bg-warning/20 text-warning border-warning/30',
  },
  [IntakeStatus.READY_FOR_APPROVAL]: {
    icon: Hourglass,
    className: 'bg-warning/20 text-warning border-warning/30',
  },
  [IntakeStatus.APPROVED]: {
    icon: CheckCircle2,
    className: 'bg-success/20 text-success border-success/30',
  },
  [IntakeStatus.REJECTED]: {
    icon: XCircle,
    className: 'bg-destructive/20 text-destructive border-destructive/30',
  },
  [IntakeStatus.PREQUAL_REVIEW]: {
    icon: Hourglass,
    className: 'bg-warning/20 text-warning border-warning/30',
  },
  [IntakeStatus.PREQUAL_APPROVED]: {
    icon: CheckCircle2,
    className: 'bg-success/20 text-success border-success/30',
  },
  [IntakeStatus.PENDING]: {
    icon: Clock,
    className: 'bg-muted text-muted-foreground border-muted',
  },
  [IntakeStatus.INACTIVE]: {
    icon: null,
    className: 'bg-muted text-muted-foreground border-muted',
  },
  [IntakeStatus.PARTNERSHIP_ENDED]: {
    icon: null,
    className: 'bg-muted text-muted-foreground border-muted',
  },
}

const STATUS_BORDER_COLOR: Record<string, string> = {
  [IntakeStatus.IN_EXECUTION]: 'border-l-primary',
  [IntakeStatus.PHONE_ISSUED]: 'border-l-primary',
  [IntakeStatus.NEEDS_MORE_INFO]: 'border-l-destructive',
  [IntakeStatus.PENDING_EXTERNAL]: 'border-l-destructive',
  [IntakeStatus.EXECUTION_DELAYED]: 'border-l-warning',
  [IntakeStatus.READY_FOR_APPROVAL]: 'border-l-warning',
  [IntakeStatus.PREQUAL_REVIEW]: 'border-l-warning',
  [IntakeStatus.PREQUAL_APPROVED]: 'border-l-success',
  [IntakeStatus.PENDING]: 'border-l-muted-foreground',
  [IntakeStatus.INACTIVE]: 'border-l-muted-foreground',
  [IntakeStatus.APPROVED]: 'border-l-success',
  [IntakeStatus.REJECTED]: 'border-l-destructive',
  [IntakeStatus.PARTNERSHIP_ENDED]: 'border-l-muted-foreground',
}

interface ClientsCardViewProps {
  clients: AgentClient[]
}

export function ClientsCardView({ clients }: ClientsCardViewProps) {
  if (clients.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No clients found matching your criteria.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {clients.map((client) => {
        const badge = statusBadgeConfig[client.intakeStatus] ?? {
          icon: null,
          className: 'bg-muted text-muted-foreground',
        }
        const BadgeIcon = badge.icon
        const isTerminal =
          client.intakeStatus === IntakeStatus.APPROVED ||
          client.intakeStatus === IntakeStatus.REJECTED
        const isHighPriority =
          client.intakeStatus === IntakeStatus.NEEDS_MORE_INFO ||
          client.intakeStatus === IntakeStatus.PENDING_EXTERNAL

        return (
          <Link key={client.id} href={`/agent/clients/${client.id}`}>
            <Card
              className={cn(
                'group h-full cursor-pointer border-l-2 border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10',
                STATUS_BORDER_COLOR[client.intakeStatus] ||
                  'border-l-muted-foreground',
                isTerminal && 'opacity-60',
              )}
              data-testid={`client-card-${client.id}`}
            >
              <CardContent className="p-4">
                {/* Header */}
                <div className="mb-3 flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground transition-colors group-hover:text-primary">
                      {client.name}
                    </p>
                    {client.nextTask && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        Next: {client.nextTask}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'ml-2 shrink-0 gap-1 text-[10px] font-medium',
                      badge.className,
                    )}
                  >
                    {BadgeIcon && <BadgeIcon className="h-3 w-3" />}
                    <span>{client.status}</span>
                  </Badge>
                </div>

                {/* Progress */}
                {!isTerminal && (
                  <div className="mb-3">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Step {client.step} of {client.totalSteps}
                      </span>
                      <span className="font-mono text-primary">
                        {client.progress}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${client.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Deadline */}
                {client.deadline && (
                  <div className="mb-3">
                    <DeadlineCountdown
                      deadline={client.deadline}
                      variant="badge"
                    />
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border/40 pt-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Updated {client.lastUpdated}</span>
                  </div>
                  <span className="text-xs text-muted-foreground transition-colors group-hover:text-primary">
                    View →
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
