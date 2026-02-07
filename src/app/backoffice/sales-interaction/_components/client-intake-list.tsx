'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, Clock, Phone, Users } from 'lucide-react'
import { approveClientIntake } from '@/app/actions/backoffice'
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

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
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
                      href={`/backoffice/clients/${client.id}`}
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
                      href={`/backoffice/agents/${client.agentId}`}
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
                  {client.canAssignPhone ? (
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
                  ) : client.canApprove ? (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(client.id, client.name)}
                      disabled={isPending}
                      className="bg-chart-4/20 text-chart-4 hover:bg-chart-4/30 border-chart-4/30"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
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
