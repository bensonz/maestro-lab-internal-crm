'use client'

import { AlertTriangle, Info, Lightbulb, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const STAR_THRESHOLDS = [3, 7, 15, 21, 35, 50]

interface Reminder {
  type: 'urgent' | 'info' | 'tip'
  text: string
}

interface QuickGuidePanelProps {
  agentName: string
  starLevel: number
  totalClients: number
  overdueCount: number
  completedToday: number
  pendingTasksCount: number
  oneStepAwayCount: number
}

function getStarProgress(starLevel: number, totalClients: number) {
  const levels = []
  for (let i = 0; i < 6; i++) {
    const threshold = STAR_THRESHOLDS[i]
    const prevThreshold = i > 0 ? STAR_THRESHOLDS[i - 1] : 0
    const isCurrent = starLevel === i + 1
    const isCompleted = starLevel > i + 1
    const progress = isCompleted
      ? 100
      : isCurrent
        ? Math.min(100, Math.round(((totalClients - prevThreshold) / (threshold - prevThreshold)) * 100))
        : 0

    levels.push({
      level: i + 1,
      threshold,
      isCurrent,
      isCompleted,
      progress: Math.max(0, progress),
    })
  }
  return levels
}

export function QuickGuidePanel({
  agentName,
  starLevel,
  totalClients,
  overdueCount,
  completedToday,
  pendingTasksCount,
  oneStepAwayCount,
}: QuickGuidePanelProps) {
  const firstName = agentName.split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Build reminders from actual data
  const reminders: Reminder[] = []
  if (overdueCount > 0) {
    reminders.push({
      type: 'urgent',
      text: `${overdueCount} overdue task${overdueCount > 1 ? 's' : ''} need attention`,
    })
  }
  if (oneStepAwayCount > 0) {
    reminders.push({
      type: 'info',
      text: `${oneStepAwayCount} client${oneStepAwayCount > 1 ? 's' : ''} one step from completion`,
    })
  }
  const nextThreshold = STAR_THRESHOLDS[starLevel] ?? 999
  const clientsToNext = nextThreshold - totalClients
  if (clientsToNext > 0 && clientsToNext <= 3) {
    reminders.push({
      type: 'tip',
      text: `${clientsToNext} more client${clientsToNext > 1 ? 's' : ''} to reach ${starLevel + 1}★`,
    })
  }

  const starLevels = getStarProgress(starLevel, totalClients)

  return (
    <div
      className="rounded-lg border border-border bg-card p-5"
      data-testid="quick-guide-panel"
    >
      {/* Greeting */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-foreground">
          {greeting}, {firstName}
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          {completedToday} done today &middot; {pendingTasksCount} pending
        </p>
      </div>

      {/* Reminders */}
      {reminders.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Reminders
          </p>
          {reminders.map((r, i) => {
            const Icon = r.type === 'urgent' ? AlertTriangle : r.type === 'info' ? Info : Lightbulb
            return (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-2 rounded-md border px-3 py-2 text-xs',
                  r.type === 'urgent'
                    ? 'border-destructive/20 bg-destructive/5 text-destructive'
                    : r.type === 'info'
                      ? 'border-primary/20 bg-primary/5 text-primary'
                      : 'border-warning/20 bg-warning/5 text-warning',
                )}
              >
                <Icon className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{r.text}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Efficiency tips */}
      <div className="mb-4">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Tips
        </p>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p>Complete overdue tasks first to protect bonuses</p>
          <p>One-step-away clients earn instant payouts</p>
          <p>Maintain streaks for reward multipliers</p>
        </div>
      </div>

      {/* Star growth path */}
      <div>
        <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Star Growth
        </p>
        <div className="space-y-2">
          {starLevels.map((level) => (
            <div key={level.level} className="flex items-center gap-2">
              <div className="flex w-8 items-center gap-0.5">
                <Star
                  className={cn(
                    'h-3 w-3',
                    level.isCompleted || level.isCurrent
                      ? 'fill-warning text-warning'
                      : 'text-muted-foreground/30',
                  )}
                />
                <span className="font-mono text-[10px] text-muted-foreground">
                  {level.level}
                </span>
              </div>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/40">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    level.isCompleted
                      ? 'bg-warning'
                      : level.isCurrent
                        ? 'bg-primary'
                        : 'bg-transparent',
                  )}
                  style={{ width: `${level.progress}%` }}
                />
              </div>
              <span className="w-8 text-right font-mono text-[10px] text-muted-foreground">
                {level.threshold}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
