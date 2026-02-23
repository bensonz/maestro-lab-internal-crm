'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, Clock, Eye, Phone } from 'lucide-react'
import { approveClientIntake } from '@/lib/mock-actions'
import { toast } from 'sonner'
import type { IntakeClient } from '@/types/backend-types'
import { cn } from '@/lib/utils'
import { ExceptionBadgeGroup } from './exception-badges'
import { PlatformProgressBar } from './platform-progress'
import { DeadlineCountdown } from '@/components/deadline-countdown'

interface ClientIntakeListProps {
  clients: IntakeClient[]
  selectedAgentId: string | null
  onSelectClient?: (clientId: string) => void
  onReviewDraft?: (draftId: string, name: string, resultClientId?: string | null) => void
}

export function ClientIntakeList({
  clients,
  selectedAgentId,
  onSelectClient,
  onReviewDraft,
}: ClientIntakeListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const handleApprove = (clientId: string, clientName: string) => {
    startTransition(async () => {
      const result = await approveClientIntake(clientId)
      if (result.success) {
        toast.success(`Approved ${clientName}`)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to approve')
      }
    })
  }

  if (clients.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-muted-foreground">
        {selectedAgentId
          ? 'No clients for selected agent'
          : 'No clients in this category'}
      </p>
    )
  }

  return (
    <>
      <div className="divide-y divide-border/20">
        {clients.map((client) => {
          const hasExceptions = client.exceptionStates.length > 0
          const showProgress = client.subStage === 'step-3' && client.platformProgress.total > 0

          return (
            <div
              key={client.id}
              className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-5 py-2 transition-colors hover:bg-muted/30"
              data-testid={`intake-row-${client.id}`}
            >
              {/* Name + agent + badges + progress */}
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectClient?.(client.id)}
                    className="truncate text-sm font-medium text-foreground hover:text-primary hover:underline"
                    data-testid={`client-name-${client.id}`}
                  >
                    {client.name}
                  </button>
                  <span className="text-[10px] text-muted-foreground/60">&bull;</span>
                  <Link
                    href={`/backoffice/agent-management/${client.agentId}`}
                    className="shrink-0 text-[11px] text-muted-foreground hover:text-primary"
                  >
                    {client.agentName}
                  </Link>
                  <Badge
                    variant="outline"
                    className={cn('ml-auto shrink-0 text-[10px]', client.statusColor)}
                  >
                    {client.status}
                  </Badge>
                </div>
                {/* Exception badges + platform progress */}
                {(hasExceptions || showProgress) && (
                  <div className="flex items-center gap-2">
                    <ExceptionBadgeGroup exceptions={client.exceptionStates} />
                    {showProgress && (
                      <PlatformProgressBar
                        verified={client.platformProgress.verified}
                        total={client.platformProgress.total}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Deadline */}
              <div className="flex items-center gap-1">
                {client.executionDeadline ? (
                  <DeadlineCountdown
                    deadline={client.executionDeadline}
                    variant="inline"
                    isDelayed={client.exceptionStates.some((e) => e.type === 'execution-delayed')}
                  />
                ) : (
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {client.daysLabel}
                  </div>
                )}
              </div>

              {/* Extension indicator */}
              <div className="w-16 text-center">
                {client.pendingExtensionRequest ? (
                  <span
                    className="text-[10px] text-muted-foreground"
                    data-testid={`extension-pending-${client.id}`}
                  >
                    Ext pending
                  </span>
                ) : client.deadlineExtensions > 0 ? (
                  <span className="text-[10px] text-muted-foreground" data-testid={`extension-count-${client.id}`}>
                    +{client.deadlineExtensions} ext
                  </span>
                ) : null}
              </div>

              {/* Action */}
              <div className="flex items-center justify-end gap-1.5">
                {onReviewDraft && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => onReviewDraft(client.id, client.name, client.resultClientId)}
                    data-testid={`review-draft-${client.id}`}
                  >
                    <Eye className="h-3 w-3" />
                    Review
                  </Button>
                )}
                {client.canApprove ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApprove(client.id, client.name)}
                    disabled={isPending}
                    className="h-7 px-2.5 text-xs"
                    data-testid={`approve-${client.id}`}
                  >
                    <Check className="mr-1 h-3 w-3" />
                    Approve
                  </Button>
                ) : client.canAssignPhone ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-xs"
                    asChild
                  >
                    <Link href="/backoffice/phone-tracking" data-testid={`assign-phone-${client.id}`}>
                      <Phone className="mr-1 h-3 w-3" />
                      Phone
                    </Link>
                  </Button>
                ) : client.statusType === 'followup' ? (
                  <span className="text-[11px] text-muted-foreground">
                    {client.status.includes('Due today')
                      ? 'Due today'
                      : client.status.match(/\d+ days left/)?.[0] || ''}
                  </span>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

    </>
  )
}
