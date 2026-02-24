'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, Clock, Eye, Loader2, Phone, Undo2 } from 'lucide-react'
import { returnDevice } from '@/app/actions/phone-assignments'
import { toast } from 'sonner'
import type { IntakeClient } from '@/types/backend-types'
import { cn } from '@/lib/utils'

interface ClientIntakeListProps {
  clients: IntakeClient[]
  selectedAgentId: string | null
  onSelectClient?: (clientId: string) => void
  onReviewDraft?: (draftId: string, name: string, resultClientId?: string | null) => void
  onAssignDevice?: (draftId: string, clientName: string, agentName: string) => void
}

export function ClientIntakeList({
  clients,
  selectedAgentId,
  onSelectClient,
  onReviewDraft,
  onAssignDevice,
}: ClientIntakeListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleReturn = (assignmentId: string, clientName: string) => {
    startTransition(async () => {
      const result = await returnDevice(assignmentId)
      if (result.success) {
        toast.success(`Device returned for ${clientName}`)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to mark device returned')
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
    <div className="divide-y divide-border/20">
      {clients.map((client) => {
        // Status badge: only PHONE ISSUED (step-3) or PHONE RETURNED (step-4)
        const showStatus = client.status === 'PHONE ISSUED' || client.status === 'PHONE RETURNED'

        // Assign Device — only step-3 when no device assigned yet
        const showAssignDevice = client.subStage === 'step-3' && client.canAssignPhone

        // Mark Returned — step-3 with active device (PHONE ISSUED)
        const showMarkReturned = client.status === 'PHONE ISSUED' && !!client.activeAssignmentId

        // Approve — only step-4 submitted drafts
        const showApprove = client.subStage === 'step-4' && !!client.resultClientId

        return (
          <div
            key={client.id}
            className="grid grid-cols-[1fr_48px_auto] items-center gap-3 px-5 py-2 transition-colors hover:bg-muted/30"
            data-testid={`intake-row-${client.id}`}
          >
            {/* Left: Name + agent + status badge */}
            <div className="flex min-w-0 items-center gap-2">
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
              {showStatus && (
                <Badge
                  variant="outline"
                  className={cn('ml-auto shrink-0 text-[10px]', client.statusColor)}
                >
                  {client.status}
                </Badge>
              )}
            </div>

            {/* Days since update — fixed width column for alignment */}
            <div className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {client.daysLabel}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-1.5">
              {/* Review — always visible */}
              <Button
                size="sm"
                variant="outline"
                className="h-7 cursor-pointer gap-1 px-2 text-xs"
                onClick={() => onReviewDraft?.(client.id, client.name, client.resultClientId)}
                data-testid={`review-draft-${client.id}`}
              >
                <Eye className="h-3 w-3" />
                Review
              </Button>

              {/* Assign Device — step-3, no device yet */}
              {showAssignDevice && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2.5 text-xs"
                  onClick={() => onAssignDevice?.(client.id, client.name, client.agentName)}
                  data-testid={`assign-phone-${client.id}`}
                >
                  <Phone className="h-3 w-3" />
                  Assign Device
                </Button>
              )}

              {/* Mark Returned — step-3 with active device (PHONE ISSUED) */}
              {showMarkReturned && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2.5 text-xs"
                  onClick={() => handleReturn(client.activeAssignmentId!, client.name)}
                  disabled={isPending}
                  data-testid={`return-device-${client.id}`}
                >
                  {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Undo2 className="h-3 w-3" />
                  )}
                  Mark Returned
                </Button>
              )}

              {/* Approve — only step-4 submitted drafts */}
              {showApprove && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2.5 text-xs"
                  onClick={() => onReviewDraft?.(client.id, client.name, client.resultClientId)}
                  data-testid={`approve-${client.id}`}
                >
                  <Check className="h-3 w-3" />
                  Approve
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
