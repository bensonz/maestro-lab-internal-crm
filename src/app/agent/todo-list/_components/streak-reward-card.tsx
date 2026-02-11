'use client'

import { Flame, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Milestone {
  label: string
  days: number
  reached: boolean
}

interface StreakRewardCardProps {
  currentStreak: number
  rewardMultiplier: number
  avgCompletionDays: number
}

const MILESTONES: Omit<Milestone, 'reached'>[] = [
  { label: 'Bronze', days: 3 },
  { label: 'Silver', days: 5 },
  { label: 'Gold', days: 10 },
  { label: 'Diamond', days: 20 },
]

export function StreakRewardCard({
  currentStreak,
  rewardMultiplier,
  avgCompletionDays,
}: StreakRewardCardProps) {
  const milestones: Milestone[] = MILESTONES.map((m) => ({
    ...m,
    reached: currentStreak >= m.days,
  }))

  const nextMilestone = milestones.find((m) => !m.reached)
  const daysToNext = nextMilestone ? nextMilestone.days - currentStreak : 0

  return (
    <div
      className="rounded-lg border border-border bg-card p-5"
      data-testid="streak-reward-card"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Streak & Rewards
          </h3>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            Consistency drives multiplied rewards
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-warning/20 bg-warning/10 px-3 py-1">
          <Flame className="h-3.5 w-3.5 text-warning" />
          <span className="font-mono text-[11px] font-semibold text-warning">
            {currentStreak}d
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-md border border-border/40 bg-muted/15 px-3 py-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
            Current
          </p>
          <p className="mt-0.5 font-mono text-base font-semibold text-foreground">
            {currentStreak}d
          </p>
        </div>
        <div className="rounded-md border border-warning/15 bg-warning/5 px-3 py-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
            Multiplier
          </p>
          <p className="mt-0.5 font-mono text-base font-semibold text-warning">
            {rewardMultiplier.toFixed(1)}x
          </p>
        </div>
        <div className="rounded-md border border-border/40 bg-muted/15 px-3 py-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
            Avg Days
          </p>
          <p className="mt-0.5 font-mono text-base font-semibold text-foreground">
            {avgCompletionDays.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Milestone timeline */}
      <div>
        <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Milestones
        </p>
        <div className="flex items-center gap-1">
          {milestones.map((m, i) => (
            <div key={m.label} className="flex flex-1 flex-col items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border',
                  m.reached
                    ? 'border-warning/30 bg-warning/15 text-warning'
                    : 'border-border/50 bg-muted/20 text-muted-foreground/50',
                )}
              >
                <Trophy className="h-3.5 w-3.5" />
              </div>
              <span
                className={cn(
                  'mt-1 text-[9px] font-medium',
                  m.reached ? 'text-warning' : 'text-muted-foreground/50',
                )}
              >
                {m.label}
              </span>
              <span className="font-mono text-[9px] text-muted-foreground">
                {m.days}d
              </span>
              {/* Connector line */}
              {i < milestones.length - 1 && (
                <div className="absolute" />
              )}
            </div>
          ))}
        </div>
        {nextMilestone && daysToNext > 0 && (
          <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground">
            {daysToNext} day{daysToNext > 1 ? 's' : ''} to {nextMilestone.label}
          </p>
        )}
      </div>
    </div>
  )
}
