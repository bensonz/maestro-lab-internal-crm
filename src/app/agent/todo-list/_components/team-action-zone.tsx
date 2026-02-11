'use client'

import { useState, useTransition } from 'react'
import { Bell, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { nudgeTeamMember } from '@/app/actions/todos'

interface TeamMember {
  id: string
  name: string
  currentStep: string
  totalSteps: number
  completedSteps: number
  isOneStepAway: boolean
  totalClients: number
}

interface TeamActionZoneProps {
  members: TeamMember[]
}

export function TeamActionZone({ members }: TeamActionZoneProps) {
  const [nudgedIds, setNudgedIds] = useState<Set<string>>(new Set())
  const [isNudging, startNudgeTransition] = useTransition()

  const handleNudge = (member: TeamMember) => {
    startNudgeTransition(async () => {
      const result = await nudgeTeamMember(member.id)
      if (result.success) {
        setNudgedIds((prev) => new Set([...prev, member.id]))
        toast.success(`Nudge sent to ${member.name}!`)
      } else {
        toast.error(result.error || 'Failed to send nudge')
      }
    })
  }

  if (members.length === 0) return null

  return (
    <div
      className="rounded-lg border border-border bg-card p-5"
      data-testid="team-action-zone"
    >
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          Team Action Zone
        </h3>
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
          Monitor and motivate your team members
        </p>
      </div>

      {/* Grid of member cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => {
          const progressPercent = member.totalSteps > 0
            ? Math.round((member.completedSteps / member.totalSteps) * 100)
            : 0
          const hasBeenNudged = nudgedIds.has(member.id)

          return (
            <div
              key={member.id}
              className="rounded-md border border-border/40 bg-muted/10 p-3"
              data-testid={`team-member-${member.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-medium text-foreground">
                      {member.name}
                    </span>
                    {member.isOneStepAway && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-success/30 bg-success/10 px-1.5 py-0 text-[9px] text-success"
                      >
                        <Zap className="mr-0.5 h-2.5 w-2.5" />
                        Close
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {member.currentStep}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant={hasBeenNudged ? 'ghost' : 'outline'}
                  className={cn(
                    'ml-2 h-7 shrink-0 px-2 text-[10px]',
                    hasBeenNudged && 'text-muted-foreground',
                  )}
                  onClick={() => handleNudge(member)}
                  disabled={isNudging || hasBeenNudged}
                  data-testid={`nudge-member-${member.id}`}
                >
                  <Bell className="mr-0.5 h-3 w-3" />
                  {hasBeenNudged ? 'Sent' : 'Nudge'}
                </Button>
              </div>

              {/* Progress */}
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/40">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      member.isOneStepAway ? 'bg-success' : 'bg-primary/70',
                    )}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {member.completedSteps}/{member.totalSteps}
                </span>
              </div>

              <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                {member.totalClients} clients total
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
