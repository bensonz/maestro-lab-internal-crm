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
      <p className="py-6 text-center text-sm text-muted-foreground">
        {selectedAgentId
          ? 'No clients for selected agent'
          : 'No clients in this category'}
      </p>
    )
  }

  return (
    <div className="divide-y divide-border/30">
      {clients.map((client) => (
        <div
          key={client.id}
          className="flex items-center justify-between bg-card/50 px-4 py-3 transition-colors hover:bg-card"
          data-testid={`intake-row-${client.id}`}
        >
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/backoffice/client-management?client=${client.id}`}
                className="truncate font-medium text-foreground hover:text-primary hover:underline"
              >
                {client.name}
              </Link>
              <Badge
                variant="outline"
                className={cn('shrink-0 text-xs', client.statusColor)}
              >
                {client.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{getStatusTypeLabel(client.statusType)}</span>
              <span className="text-muted-foreground/50">&bull;</span>
              <Link
                href={`/backoffice/agent-management/${client.agentId}`}
                className="text-primary hover:underline"
              >
                {client.agentName}
              </Link>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {client.daysLabel}
            </div>
            {client.canApprove ? (
              <Button
                size="sm"
                onClick={() => handleApprove(client.id, client.name)}
                disabled={isPending}
                className="border-success/30 bg-success/20 text-success hover:bg-success/30"
                data-testid={`approve-${client.id}`}
              >
                <Check className="mr-1 h-4 w-4" />
                Approve
              </Button>
            ) : client.canReviewPrequal ? (
              <Button
                size="sm"
                variant="outline"
                className="border-warning/30 bg-warning/10 text-warning hover:bg-warning/20"
                asChild
              >
                <Link href={`/backoffice/client-management?client=${client.id}`}>
                  <Shield className="mr-1 h-4 w-4" />
                  Review Pre-Qual
                </Link>
              </Button>
            ) : client.statusType === 'pending_platform' ? (
              <Button
                size="sm"
                onClick={() => handleVerifyBetmgm(client.id, client.name)}
                disabled={isPending}
                variant="outline"
                className="border-primary/30 text-primary hover:bg-primary/10"
                data-testid={`verify-betmgm-${client.id}`}
              >
                <Shield className="mr-1 h-4 w-4" />
                Verify BetMGM
              </Button>
            ) : client.canAssignPhone ? (
              <Link href="/backoffice/phone-tracking">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-primary/30 text-primary hover:bg-primary/10"
                  data-testid={`assign-phone-${client.id}`}
                >
                  <Phone className="mr-1 h-4 w-4" />
                  Assign Phone
                </Button>
              </Link>
            ) : client.statusType === 'followup' ? (
              <span className="text-sm text-primary">
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

function getStatusTypeLabel(statusType: string): string {
  const labels: Record<string, string> = {
    needs_info: 'Document Review',
    pending_platform: 'Platform Verification',
    ready: 'Approval',
    followup: 'Follow-up',
  }
  return labels[statusType] || statusType
}
