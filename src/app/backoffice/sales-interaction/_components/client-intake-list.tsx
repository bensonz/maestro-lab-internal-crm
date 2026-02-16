'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, Clock, Phone, Shield } from 'lucide-react'
import { approveClientIntake } from '@/app/actions/backoffice'
import { verifyBetmgmManual } from '@/app/actions/betmgm-verification'
import { toast } from 'sonner'
import type { IntakeClient } from '@/backend/data/operations'
import { cn } from '@/lib/utils'

interface ClientIntakeListProps {
  clients: IntakeClient[]
  selectedAgentId: string | null
}

export function ClientIntakeList({
  clients,
  selectedAgentId,
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

  const handleVerifyBetmgm = (clientId: string, clientName: string) => {
    startTransition(async () => {
      const result = await verifyBetmgmManual(clientId)
      if (result.success) {
        toast.success(`BetMGM verified for ${clientName}`)
        router.refresh()
      } else {
        toast.error(result.message || 'Failed to verify BetMGM')
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
      {clients.map((client) => (
        <div
          key={client.id}
          className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-5 py-2 transition-colors hover:bg-muted/30"
          data-testid={`intake-row-${client.id}`}
        >
          {/* Name + agent */}
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href={`/backoffice/client-management?client=${client.id}`}
              className="truncate text-sm font-medium text-foreground hover:text-primary hover:underline"
            >
              {client.name}
            </Link>
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

          {/* Days */}
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {client.daysLabel}
          </div>

          {/* Action */}
          <div className="w-28 text-right">
            {client.canApprove ? (
              <Button
                size="sm"
                onClick={() => handleApprove(client.id, client.name)}
                disabled={isPending}
                className="h-7 border-success/30 bg-success/20 px-2.5 text-xs text-success hover:bg-success/30"
                data-testid={`approve-${client.id}`}
              >
                <Check className="mr-1 h-3 w-3" />
                Approve
              </Button>
            ) : client.canReviewPrequal ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-warning/30 bg-warning/10 px-2.5 text-xs text-warning hover:bg-warning/20"
                asChild
              >
                <Link href={`/backoffice/client-management?client=${client.id}`}>
                  <Shield className="mr-1 h-3 w-3" />
                  Review
                </Link>
              </Button>
            ) : client.statusType === 'pending_platform' ? (
              <Button
                size="sm"
                onClick={() => handleVerifyBetmgm(client.id, client.name)}
                disabled={isPending}
                variant="outline"
                className="h-7 border-primary/30 px-2.5 text-xs text-primary hover:bg-primary/10"
                data-testid={`verify-betmgm-${client.id}`}
              >
                <Shield className="mr-1 h-3 w-3" />
                Verify
              </Button>
            ) : client.canAssignPhone ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-primary/30 px-2.5 text-xs text-primary hover:bg-primary/10"
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
      ))}
    </div>
  )
}
