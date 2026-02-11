'use client'

import { ArrowRight, Star, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GrowthSignalsCardProps {
  currentStar: number
}

const ROLE_LABELS: Record<number, string> = {
  0: 'Individual Producer',
  1: 'Individual Producer',
  2: 'Individual Producer',
  3: 'Individual Producer',
  4: 'Senior Producer',
  5: 'Team Operator',
  6: 'Team Operator',
}

const MILESTONE_REWARDS: { star: number; reward: string }[] = [
  { star: 1, reward: '—' },
  { star: 2, reward: '$1,000' },
  { star: 3, reward: '$3,000' },
  { star: 4, reward: '$5,000' },
  { star: 5, reward: '$10,000' },
  { star: 6, reward: '$30,000' },
]

function getNextRole(current: number): string {
  if (current < 4) return 'Senior Producer'
  if (current < 5) return 'Team Operator'
  return 'Team Operator'
}

function getPromotionBenefit(current: number): string {
  if (current < 4) return 'Unlock team leadership and override commissions'
  if (current < 5) return 'Access P&L revenue share and leadership payouts'
  return 'Maximize team size and override earnings'
}

export function GrowthSignalsCard({ currentStar }: GrowthSignalsCardProps) {
  const currentRole = ROLE_LABELS[currentStar] ?? 'Individual Producer'
  const nextRole = getNextRole(currentStar)
  const promotionBenefit = getPromotionBenefit(currentStar)

  return (
    <div
      className="rounded-lg border border-border bg-card p-5"
      data-testid="growth-signals-card"
    >
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          Growth Signals & Long-Term Incentives
        </h3>
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
          Role progression and bonus milestones
        </p>
      </div>

      {/* Role transition */}
      <div className="mb-4 flex items-center gap-3 rounded-md border border-border/40 bg-muted/10 p-3">
        <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-1.5">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
            Current
          </p>
          <p className="mt-0.5 text-xs font-semibold text-foreground">
            {currentRole}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="rounded-md border border-success/20 bg-success/10 px-3 py-1.5">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
            Next
          </p>
          <p className="mt-0.5 text-xs font-semibold text-success">
            {nextRole}
          </p>
        </div>
        <div className="ml-auto hidden items-center gap-1.5 sm:flex">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] text-muted-foreground">
            {promotionBenefit}
          </span>
        </div>
      </div>

      {/* Bonus milestones bar */}
      <div>
        <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Bonus Milestones
        </p>
        <div className="flex gap-1">
          {MILESTONE_REWARDS.map(({ star, reward }) => {
            const isReached = currentStar >= star
            const isCurrent = currentStar === star

            return (
              <div
                key={star}
                className={cn(
                  'flex flex-1 flex-col items-center rounded-md border px-1 py-2',
                  isCurrent
                    ? 'border-primary/30 bg-primary/10'
                    : isReached
                      ? 'border-success/20 bg-success/5'
                      : 'border-border/30 bg-muted/10',
                )}
              >
                <div className="flex items-center gap-0.5">
                  <Star
                    className={cn(
                      'h-3 w-3',
                      isReached
                        ? 'fill-warning text-warning'
                        : 'text-muted-foreground/30',
                    )}
                  />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {star}
                  </span>
                </div>
                <span
                  className={cn(
                    'mt-1 font-mono text-[10px] font-semibold',
                    isReached ? 'text-success' : 'text-muted-foreground',
                  )}
                >
                  {reward}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
