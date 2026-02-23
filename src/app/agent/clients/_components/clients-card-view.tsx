'use client'

import Link from 'next/link'
import {
  Clock,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { IntakeStatus } from '@/types'
import { cn } from '@/lib/utils'
import { DeadlineCountdown } from '@/components/deadline-countdown'
import type { AgentClient, AgentDraft } from './types'

const STEP_LABELS: Record<number, string> = {
  1: 'Pre-Qual',
  2: 'Background',
  3: 'Platforms',
  4: 'Contract',
}

interface StatusGroup {
  key: string
  label: string
  statuses: IntakeStatus[]
}

const statusGroups: StatusGroup[] = [
  {
    key: 'verification-needed',
    label: 'Verification Needed',
    statuses: [
      IntakeStatus.NEEDS_MORE_INFO,
      IntakeStatus.PENDING_EXTERNAL,
      IntakeStatus.EXECUTION_DELAYED,
    ],
  },
  {
    key: 'approved',
    label: 'Approved',
    statuses: [IntakeStatus.APPROVED],
  },
]

const STATUS_BORDER_COLOR: Record<string, string> = {
  [IntakeStatus.IN_EXECUTION]: 'border-l-primary',
  [IntakeStatus.PHONE_ISSUED]: 'border-l-primary',
  [IntakeStatus.NEEDS_MORE_INFO]: 'border-l-destructive',
  [IntakeStatus.PENDING_EXTERNAL]: 'border-l-destructive',
  [IntakeStatus.EXECUTION_DELAYED]: 'border-l-warning',
  [IntakeStatus.READY_FOR_APPROVAL]: 'border-l-warning',
  [IntakeStatus.PENDING]: 'border-l-muted-foreground',
  [IntakeStatus.INACTIVE]: 'border-l-muted-foreground',
  [IntakeStatus.APPROVED]: 'border-l-success',
  [IntakeStatus.REJECTED]: 'border-l-destructive',
  [IntakeStatus.PARTNERSHIP_ENDED]: 'border-l-muted-foreground',
}

interface ClientsCardViewProps {
  clients: AgentClient[]
  drafts: AgentDraft[]
}

export function ClientsCardView({ clients, drafts }: ClientsCardViewProps) {
  return (
    <div className="space-y-6">
      {/* In Progress section (drafts) */}
      <div className={cn(drafts.length === 0 && 'opacity-60')}>
        <div className="mb-3 flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">In Progress</span>
          <Badge
            variant="outline"
            className="h-6 border-primary/30 bg-primary/10 px-2.5 font-mono text-xs font-semibold text-primary"
          >
            {drafts.length}
          </Badge>
        </div>
        {drafts.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {drafts.map((draft) => {
              const progressPct = draft.innerStepTotal > 0
                ? Math.round((draft.innerStepCompleted / draft.innerStepTotal) * 100)
                : 0

              return (
                <Link key={draft.id} href={`/agent/new-client?draft=${draft.id}`}>
                  <Card
                    className="group h-full cursor-pointer border-l-2 border-dashed border-border/50 border-l-muted-foreground bg-muted/20 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
                    data-testid={`draft-card-${draft.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground transition-colors group-hover:text-primary">
                            {draft.name}
                          </p>
                        </div>
                        <Badge variant="outline" className="ml-2 shrink-0 gap-1 border-dashed text-[10px] font-medium text-muted-foreground">
                          Step {draft.step}: {STEP_LABELS[draft.step] || ''}
                        </Badge>
                      </div>
                      <div className="mb-3">
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {draft.innerStepCompleted}/{draft.innerStepTotal} completed
                          </span>
                          <span className="font-mono text-primary/60">
                            {progressPct}%
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary/60 transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-border/40 pt-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Updated {draft.lastUpdated}</span>
                        </div>
                        <span className="text-xs text-muted-foreground transition-colors group-hover:text-primary">
                          Continue →
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Status groups for clients */}
      {statusGroups.map((group) => {
        const groupClients = clients.filter((c) =>
          group.statuses.includes(c.intakeStatus),
        )

        const isTerminalGroup =
          group.key === 'approved' || group.key === 'rejected' || group.key === 'partnership-ended'

        return (
          <div key={group.key} className={cn(groupClients.length === 0 && 'opacity-60')}>
            <div className="mb-3 flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">
                {group.label}
              </span>
              <Badge
                variant="outline"
                className="h-6 border-primary/30 bg-primary/10 px-2.5 font-mono text-xs font-semibold text-primary"
              >
                {groupClients.length}
              </Badge>
            </div>
            {groupClients.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groupClients.map((client) => (
                <Link key={client.id} href={`/agent/clients/${client.id}`}>
                  <Card
                    className={cn(
                      'group h-full cursor-pointer border-l-2 border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10',
                      STATUS_BORDER_COLOR[client.intakeStatus] ||
                        'border-l-muted-foreground',
                      isTerminalGroup && 'opacity-60',
                    )}
                    data-testid={`client-card-${client.id}`}
                  >
                    <CardContent className="p-4">
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
                      </div>

                      {/* Progress */}
                      {!isTerminalGroup && (
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
              ))}
            </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
