'use client'

import { useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Phone, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { returnDevice } from '@/app/actions/phone-assignments'
import { toast } from 'sonner'
import type { DeviceRequestItem, ActiveDeviceSignOut } from '@/types/backend-types'

interface DeviceRequestsSectionProps {
  deviceRequests: DeviceRequestItem[]
  activeSignOuts: ActiveDeviceSignOut[]
  onAssignDevice: (draftId: string, clientName: string, agentName: string) => void
  selectedAgentId: string | null
  clientSearch: string
}

export function DeviceRequestsSection({
  deviceRequests,
  activeSignOuts,
  onAssignDevice,
  selectedAgentId,
  clientSearch,
}: DeviceRequestsSectionProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Filter by agent and search
  const filteredRequests = useMemo(() => {
    let result = selectedAgentId
      ? deviceRequests.filter((r) => r.agentId === selectedAgentId)
      : deviceRequests
    if (clientSearch) {
      const q = clientSearch.toLowerCase()
      result = result.filter(
        (r) =>
          r.clientName.toLowerCase().includes(q) ||
          r.agentName.toLowerCase().includes(q),
      )
    }
    return result
  }, [deviceRequests, selectedAgentId, clientSearch])

  const filteredSignOuts = useMemo(() => {
    let result = selectedAgentId
      ? activeSignOuts.filter((s) => s.agentId === selectedAgentId)
      : activeSignOuts
    if (clientSearch) {
      const q = clientSearch.toLowerCase()
      result = result.filter(
        (s) =>
          s.clientName.toLowerCase().includes(q) ||
          s.agentName.toLowerCase().includes(q) ||
          s.phoneNumber.includes(q),
      )
    }
    return result
  }, [activeSignOuts, selectedAgentId, clientSearch])

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

  if (filteredRequests.length === 0 && filteredSignOuts.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No device requests or active sign-outs
      </p>
    )
  }

  return (
    <div>
      {/* Pending Requests */}
      {filteredRequests.length > 0 && (
        <div data-testid="pending-device-requests">
          <div className="flex items-center gap-2 border-b border-border/30 px-5 py-2.5">
            <span className="text-xs font-medium text-muted-foreground">
              Pending Requests
            </span>
            <Badge
              variant="outline"
              className="h-5 px-1.5 font-mono text-[10px] text-muted-foreground"
            >
              {filteredRequests.length}
            </Badge>
          </div>
          <div className="divide-y divide-border/20">
            {filteredRequests.map((req) => (
              <div
                key={req.draftId}
                className="flex items-center justify-between gap-3 px-5 py-2 transition-colors hover:bg-muted/30"
                data-testid={`device-request-${req.draftId}`}
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {req.clientName}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">&bull;</span>
                    <Link
                      href={`/backoffice/agent-management/${req.agentId}`}
                      className="shrink-0 text-[11px] text-muted-foreground hover:text-primary"
                    >
                      {req.agentName}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>Requested: {req.reservationDate}</span>
                    {req.daysSinceRequest > 0 && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'h-4 px-1 text-[9px]',
                          req.daysSinceRequest >= 3
                            ? 'border-destructive/30 text-destructive'
                            : 'border-warning/30 text-warning',
                        )}
                      >
                        {req.daysSinceRequest}d waiting
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => onAssignDevice(req.draftId, req.clientName, req.agentName)}
                  data-testid={`assign-device-${req.draftId}`}
                >
                  <Phone className="h-3 w-3" />
                  Assign &amp; Sign Out
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Sign-Outs */}
      {filteredSignOuts.length > 0 && (
        <div data-testid="active-device-signouts">
          <div className="flex items-center gap-2 border-b border-border/30 px-5 py-2.5">
            <span className="text-xs font-medium text-muted-foreground">
              Active Sign-Outs
            </span>
            <Badge
              variant="outline"
              className="h-5 px-1.5 font-mono text-[10px] text-muted-foreground"
            >
              {filteredSignOuts.length}
            </Badge>
          </div>
          <div className="divide-y divide-border/20">
            {filteredSignOuts.map((so) => (
              <div
                key={so.assignmentId}
                className="flex items-center justify-between gap-3 px-5 py-2 transition-colors hover:bg-muted/30"
                data-testid={`signout-row-${so.assignmentId}`}
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-foreground">
                      {so.phoneNumber}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">&bull;</span>
                    <span className="truncate text-xs text-foreground">
                      {so.clientName}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">&bull;</span>
                    <Link
                      href={`/backoffice/agent-management/${so.agentId}`}
                      className="shrink-0 text-[11px] text-muted-foreground hover:text-primary"
                    >
                      {so.agentName}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {so.carrier && (
                      <Badge variant="outline" className="h-4 px-1 text-[9px]">
                        {so.carrier}
                      </Badge>
                    )}
                    <DueBackBadge hoursRemaining={so.hoursRemaining} isOverdue={so.isOverdue} />
                    <span>by {so.signedOutByName}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => handleReturn(so.assignmentId, so.clientName)}
                  disabled={isPending}
                  data-testid={`return-device-${so.assignmentId}`}
                >
                  {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Undo2 className="h-3 w-3" />
                  )}
                  Mark Returned
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DueBackBadge({ hoursRemaining, isOverdue }: { hoursRemaining: number; isOverdue: boolean }) {
  if (isOverdue) {
    return (
      <Badge
        variant="outline"
        className="h-4 border-destructive/30 bg-destructive/10 px-1 text-[9px] font-semibold text-destructive"
        data-testid="overdue-badge"
      >
        OVERDUE
      </Badge>
    )
  }

  if (hoursRemaining <= 24) {
    return (
      <Badge
        variant="outline"
        className="h-4 border-warning/30 bg-warning/10 px-1 text-[9px] text-warning"
      >
        {hoursRemaining}h remaining
      </Badge>
    )
  }

  const daysRemaining = Math.floor(hoursRemaining / 24)
  return (
    <Badge
      variant="outline"
      className="h-4 border-green-500/30 bg-green-500/10 px-1 text-[9px] text-green-600"
    >
      {daysRemaining}d {hoursRemaining % 24}h remaining
    </Badge>
  )
}
