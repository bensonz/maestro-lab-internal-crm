'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Check, Clock, Eye, Loader2, Phone, RotateCcw, Undo2 } from 'lucide-react'
import { returnDevice, reissueDevice } from '@/app/actions/phone-assignments'
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

  const handleReissue = (assignmentId: string, clientName: string) => {
    startTransition(async () => {
      const result = await reissueDevice(assignmentId)
      if (result.success) {
        toast.success(`Device re-issued for ${clientName}`)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to re-issue device')
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
        // Status badge: based on device activity, not step
        const showStatus = client.status === 'PHONE ISSUED' || client.status === 'PHONE RETURNED'

        // Assign Device — step-2 or step-3 when device requested but not yet assigned
        const showAssignDevice = client.canAssignPhone

        // Mark Returned — active device (PHONE ISSUED), any step
        const showMarkReturned = client.status === 'PHONE ISSUED' && !!client.activeAssignmentId

        // Undo/Re-issue — PHONE RETURNED with a returned assignment, any step
        const showReissue = client.status === 'PHONE RETURNED' && !!client.returnedAssignmentId

        // Approve — only pending-approval (submitted) drafts
        const showApprove = client.subStage === 'pending-approval' && !!client.resultClientId

        return (
          <div
            key={client.id}
            className="grid grid-cols-[1fr_auto_48px_auto] items-center gap-3 px-5 py-2 transition-colors hover:bg-muted/30"
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
              <Link
                href={`/backoffice/agent-management/${client.agentId}`}
                className="shrink-0 text-[11px] text-muted-foreground hover:text-primary"
              >
                {client.agentName}
              </Link>
              {showStatus && (
                client.assignedPhone ? (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className={cn('ml-auto shrink-0 cursor-default text-[10px]', client.statusColor)}
                        >
                          {client.status}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {client.assignedPhone}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Badge
                    variant="outline"
                    className={cn('ml-auto shrink-0 text-[10px]', client.statusColor)}
                  >
                    {client.status}
                  </Badge>
                )
              )}
            </div>

            {/* Inner: Action buttons (Assign Device / Mark Returned / Approve) */}
            <div className="flex items-center justify-end gap-1.5">
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

              {showReissue && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2.5 text-xs"
                  onClick={() => handleReissue(client.returnedAssignmentId!, client.name)}
                  disabled={isPending}
                  data-testid={`reissue-device-${client.id}`}
                >
                  {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3 w-3" />
                  )}
                  Re-issue
                </Button>
              )}

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

            {/* Far right: Days since update */}
            <div className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {client.daysLabel}
            </div>

            {/* Far right: Review — always visible */}
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
          </div>
        )
      })}
    </div>
  )
}
