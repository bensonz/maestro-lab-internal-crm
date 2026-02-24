'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Zap,
  ImageIcon,
  Clock,
  CheckCircle2,
  Receipt,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { PendingAction, PendingActionType } from './types'

interface ActionQueuePanelProps {
  actions: PendingAction[]
}

const typeConfig: Record<
  PendingActionType,
  { icon: typeof ImageIcon; label: string; color: string }
> = {
  screenshot_review: {
    icon: ImageIcon,
    label: 'Screenshot Review',
    color: 'text-primary',
  },
  extension_request: {
    icon: Clock,
    label: 'Extension',
    color: 'text-warning',
  },
  client_approval: {
    icon: CheckCircle2,
    label: 'Approval',
    color: 'text-success',
  },
  settlement_review: {
    icon: Receipt,
    label: 'Settlement',
    color: 'text-primary',
  },
}

const urgencyColors = {
  critical: 'border-l-destructive',
  high: 'border-l-warning',
  normal: '',
}

export function ActionQueuePanel({ actions }: ActionQueuePanelProps) {
  // Group by type
  const grouped = actions.reduce(
    (acc, action) => {
      if (!acc[action.type]) acc[action.type] = []
      acc[action.type].push(action)
      return acc
    },
    {} as Record<PendingActionType, PendingAction[]>,
  )

  const groupOrder: PendingActionType[] = [
    'extension_request',
    'client_approval',
    'screenshot_review',
    'settlement_review',
  ]

  return (
    <Card data-testid="action-queue-panel">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Zap className="h-4 w-4 text-primary" />
          Action Queue
          {actions.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {actions.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {actions.length === 0 ? (
          <div
            className="flex items-center gap-2 rounded-md border border-success/20 bg-success/5 px-3 py-4"
            data-testid="action-queue-empty"
          >
            <CheckCircle2 className="h-5 w-5 text-success" />
            <p className="text-sm text-muted-foreground">
              No pending actions
            </p>
          </div>
        ) : (
          <div
            className="max-h-[360px] space-y-3 overflow-y-auto"
            data-testid="action-queue-scroll"
          >
            {groupOrder.map((type) => {
              const group = grouped[type]
              if (!group?.length) return null
              const config = typeConfig[type]
              const Icon = config.icon

              return (
                <div key={type}>
                  <div className="mb-1 flex items-center gap-2">
                    <Icon
                      className={cn('h-3.5 w-3.5', config.color)}
                    />
                    <span className="text-xs font-medium text-muted-foreground">
                      {config.label}
                    </span>
                    <Badge
                      variant="outline"
                      className="ml-auto text-[10px]"
                    >
                      {group.length}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {group.map((action) => (
                      <Link
                        key={action.id}
                        href={action.link}
                        className={cn(
                          'flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/30',
                          action.urgency !== 'normal' &&
                            'border-l-2',
                          urgencyColors[action.urgency],
                        )}
                        data-testid={`action-item-${action.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {action.clientName}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {action.agentName}
                          </p>
                        </div>
                        <span className="ml-2 flex-shrink-0 text-[10px] text-muted-foreground">
                          {action.ageFormatted}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
