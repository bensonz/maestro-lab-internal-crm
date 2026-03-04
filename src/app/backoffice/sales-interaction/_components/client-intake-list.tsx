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
import { Check, Clock, CreditCard, Eye, Loader2, Phone, RotateCcw, Undo2 } from 'lucide-react'
import { returnDevice, reissueDevice } from '@/app/actions/phone-assignments'
import { toast } from 'sonner'
import { PlatformProgressBar } from './platform-progress'
import type { IntakeClient } from '@/types/backend-types'
import { cn } from '@/lib/utils'

interface ClientIntakeListProps {
  clients: IntakeClient[]
  selectedAgentId: string | null
  /** Fixed width (px) for the client-name column — aligns Col 2/3 across sibling lists */
  nameColumnWidth?: number
  onSelectClient?: (clientId: string) => void
  onReviewDraft?: (draftId: string, name: string, resultClientId?: string | null) => void
  onAssignDevice?: (draftId: string, clientName: string, agentName: string) => void
  onUploadCard?: (draftId: string, clientName: string, resultClientId?: string | null) => void
  onApprove?: (resultClientId: string, clientName: string, hasDebitCards: boolean) => void
}

export function ClientIntakeList({
  clients,
  selectedAgentId,
  nameColumnWidth,
  onSelectClient,
  onReviewDraft,
  onAssignDevice,
  onUploadCard,
  onApprove,
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
    <div
      className="grid gap-x-1.5"
      style={{
        gridTemplateColumns: `${nameColumnWidth ? `${nameColumnWidth}px` : 'auto'} 110px 72px 1fr auto auto 48px auto`,
      }}
    >
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
            className="col-span-full grid grid-cols-subgrid items-center border-b border-border/20 px-5 py-2 transition-colors last:border-b-0 hover:bg-muted/30"
            data-testid={`intake-row-${client.id}`}
          >
            {/* Col 1: Client name */}
            <button
              type="button"
              onClick={() => onSelectClient?.(client.id)}
              className="truncate text-left text-sm font-medium text-foreground hover:text-primary hover:underline"
              data-testid={`client-name-${client.id}`}
            >
              {client.name}
            </button>

            {/* Col 2: Agent name (fixed width — aligned across rows) */}
            <Link
              href={`/backoffice/agent-management/${client.agentId}`}
              className="truncate text-[11px] text-muted-foreground hover:text-primary"
            >
              {client.agentName}
            </Link>

            {/* Col 3: Platform progress (fixed width — aligned across rows) */}
            <div className="flex items-center">
              {client.subStage !== 'pending-approval' && client.subStage !== 'step-4' ? (
                <PlatformProgressBar
                  verified={client.platformProgress.verified}
                  total={client.platformProgress.total}
                />
              ) : null}
            </div>

            {/* Col 4: Spacer — pushes right-side columns to the end */}
            <div />

            {/* Col 5: Status badge */}
            <div className="flex items-center">
              {showStatus && (
                client.assignedPhone ? (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className={cn('shrink-0 cursor-default text-[10px]', client.statusColor)}
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
                    className={cn('shrink-0 text-[10px]', client.statusColor)}
                  >
                    {client.status}
                  </Badge>
                )
              )}
            </div>

            {/* Col 6: Action buttons (Assign Device / Mark Returned / Approve) */}
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
                <>
                  <Button
                    size="sm"
                    variant={client.hasDebitCards ? 'default' : 'outline'}
                    className={cn(
                      'h-7 gap-1 px-2.5 text-xs',
                      client.hasDebitCards && 'bg-success text-success-foreground hover:bg-success/90',
                    )}
                    onClick={() => onUploadCard?.(client.id, client.name, client.resultClientId)}
                    data-testid={`upload-card-${client.id}`}
                  >
                    {client.hasDebitCards ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <CreditCard className="h-3 w-3" />
                    )}
                    {client.hasDebitCards ? 'Cards Done' : 'Upload Card #'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 px-2.5 text-xs"
                    onClick={() => onApprove?.(client.resultClientId!, client.name, !!client.hasDebitCards)}
                    data-testid={`approve-${client.id}`}
                  >
                    <Check className="h-3 w-3" />
                    Approve
                  </Button>
                </>
              )}
            </div>

            {/* Col 7: Days since update */}
            <div className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {client.daysLabel}
            </div>

            {/* Col 8: Review — always visible */}
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
