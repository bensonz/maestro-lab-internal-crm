'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, Clock, Phone, Shield, Users } from 'lucide-react'
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

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Users className="h-4 w-4" />
            New Client Intake
          </div>
          <Badge variant="outline" className="font-mono">
            {clients.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {selectedAgentId
              ? 'No clients for selected agent'
              : 'No clients in intake process'}
          </p>
        ) : (
          <div className="space-y-2">
            {clients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between rounded-xl bg-muted/30 p-4 ring-1 ring-border/30 transition-colors hover:bg-muted/50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/backoffice/client-management?client=${client.id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {client.name}
                    </Link>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', client.statusColor)}
                    >
                      {client.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{getStatusTypeLabel(client.statusType)}</span>
                    <span className="text-muted-foreground/50">•</span>
                    <Link
                      href={`/backoffice/agent-management/${client.agentId}`}
                      className="text-primary hover:underline"
                    >
                      {client.agentName}
                    </Link>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {client.daysLabel}
                  </div>
                  {client.canApprove ? (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(client.id, client.name)}
                      disabled={isPending}
                      className="bg-success/20 text-success hover:bg-success/30 border-success/30"
                      data-testid={`approve-${client.id}`}
                    >
                      <Check className="h-4 w-4 mr-1" />
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
                        <Shield className="h-4 w-4 mr-1" />
                        Review Pre-Qual
                      </Link>
                    </Button>
                  ) : client.statusType === 'pending_platform' ? (
                    <Button
                      size="sm"
                      onClick={() => handleVerifyBetmgm(client.id, client.name)}
                      disabled={isPending}
                      variant="outline"
                      className="text-primary border-primary/30 hover:bg-primary/10"
                      data-testid={`verify-betmgm-${client.id}`}
                    >
                      <Shield className="h-4 w-4 mr-1" />
                      Verify BetMGM
                    </Button>
                  ) : client.canAssignPhone ? (
                    <Link href="/backoffice/phone-tracking">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-primary border-primary/30 hover:bg-primary/10"
                        data-testid={`assign-phone-${client.id}`}
                      >
                        <Phone className="h-4 w-4 mr-1" />
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
        )}
      </CardContent>
    </Card>
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
