'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, User, Play, XCircle } from 'lucide-react'
import { resumeExecution, changeClientStatus } from '@/app/actions/status'
import { IntakeStatus } from '@/types'

interface DelayedClient {
  id: string
  name: string
  agentName: string
  executionDeadline: Date | null
  delayedSince: Date
  pendingTodosCount: number
  completedTodosCount: number
}

interface DelayedClientsProps {
  clients: DelayedClient[]
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  const minutes = Math.floor(diff / (1000 * 60))
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

export function DelayedClients({ clients }: DelayedClientsProps) {
  const [isPending, startTransition] = useTransition()

  function handleResume(clientId: string) {
    startTransition(async () => {
      const result = await resumeExecution(clientId, 3)
      if (result.success) {
        toast.success('Client resumed with new 3-day deadline')
      } else {
        toast.error(result.error || 'Failed to resume execution')
      }
    })
  }

  function handleMarkInactive(clientId: string) {
    startTransition(async () => {
      const result = await changeClientStatus(
        clientId,
        IntakeStatus.INACTIVE,
        'Execution delayed beyond recovery',
      )
      if (result.success) {
        toast.success('Client marked as inactive')
      } else {
        toast.error(result.error || 'Failed to mark client inactive')
      }
    })
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          Delayed Clients
          {clients.length > 0 && (
            <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 text-xs font-medium ml-1">
              {clients.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {clients.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No delayed clients
          </p>
        ) : (
          clients.map((client) => {
            const totalTodos =
              client.pendingTodosCount + client.completedTodosCount

            return (
              <div
                key={client.id}
                data-testid={`delayed-client-${client.id}`}
                className="rounded-xl bg-muted/30 ring-1 ring-border/30 p-4 space-y-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <span className="font-medium text-foreground">
                      {client.name}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{client.agentName}</span>
                      <span className="text-muted-foreground/50 mx-1">•</span>
                      <span>
                        Delayed {formatRelativeTime(client.delayedSince)}
                      </span>
                    </div>
                  </div>
                  {totalTodos > 0 && (
                    <Badge
                      variant="outline"
                      className="text-xs whitespace-nowrap shrink-0"
                    >
                      {client.completedTodosCount}/{totalTodos} todos
                    </Badge>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-chart-4 hover:bg-chart-4/90 text-white"
                    onClick={() => handleResume(client.id)}
                    disabled={isPending}
                    data-testid={`resume-client-${client.id}`}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    {isPending ? 'Resuming...' : 'Resume (+3 days)'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => handleMarkInactive(client.id)}
                    disabled={isPending}
                    data-testid={`inactive-client-${client.id}`}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Mark Inactive
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
