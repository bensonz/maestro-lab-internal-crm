'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, Zap, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ConversionClient {
  id: string
  name: string
  currentStep: string
  completedSteps: number
  totalSteps: number
  isOneStepAway: boolean
  payoutOnComplete: number
}

interface ConversionTasksCardProps {
  clients: ConversionClient[]
  dailyCompleted: number
  dailyTarget: number
}

export function ConversionTasksCard({
  clients,
  dailyCompleted,
  dailyTarget,
}: ConversionTasksCardProps) {
  const router = useRouter()

  return (
    <div
      className="rounded-lg border border-border bg-card p-5"
      data-testid="conversion-tasks-card"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Client Conversion
          </h3>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            New client pipeline
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono text-xs text-muted-foreground">
            {dailyCompleted}/{dailyTarget} today
          </span>
        </div>
      </div>

      {/* Client list */}
      {clients.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/50 py-8 text-center">
          <p className="text-xs text-muted-foreground">No active clients in pipeline</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map((client) => {
            const progressPercent = client.totalSteps > 0
              ? Math.round((client.completedSteps / client.totalSteps) * 100)
              : 0

            return (
              <div
                key={client.id}
                className="rounded-md border border-border/40 bg-muted/10 p-3"
                data-testid={`conversion-client-${client.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-medium text-foreground">
                        {client.name}
                      </span>
                      {client.isOneStepAway && (
                        <Badge
                          variant="outline"
                          className="shrink-0 border-success/30 bg-success/10 px-1.5 py-0 text-[9px] text-success"
                        >
                          <Zap className="mr-0.5 h-2.5 w-2.5" />
                          1 step away
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {client.currentStep}
                    </p>
                  </div>

                  <div className="ml-3 flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-success">
                      ${client.payoutOnComplete}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => router.push(`/agent/clients/${client.id}`)}
                      data-testid={`execute-client-${client.id}`}
                    >
                      Execute
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/40">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        client.isOneStepAway ? 'bg-success' : 'bg-primary/70',
                      )}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {client.completedSteps}/{client.totalSteps}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
