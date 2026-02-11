'use client'

import { TrendingUp, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GrowthLevelCardProps {
  currentLevel: number
  tasksCompleted: number
  tasksForNextLevel: number
  rewardPotential: number
}

export function GrowthLevelCard({
  currentLevel,
  tasksCompleted,
  tasksForNextLevel,
  rewardPotential,
}: GrowthLevelCardProps) {
  const total = tasksCompleted + tasksForNextLevel
  const progressPercent = total > 0 ? Math.round((tasksCompleted / total) * 100) : 0
  const isGlowing = progressPercent >= 75

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-5',
        isGlowing && 'shadow-[0_0_15px_rgba(var(--primary),0.15)]',
      )}
      data-testid="growth-level-card"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              isGlowing
                ? 'bg-primary/20 text-primary'
                : 'bg-muted/40 text-muted-foreground',
            )}
          >
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                Level {currentLevel}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {tasksCompleted}/{total} tasks
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {tasksForNextLevel > 0
                ? `${tasksForNextLevel} more tasks to next level`
                : 'All tasks completed!'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-warning" />
          <span className="font-mono text-sm font-semibold text-foreground">
            ${rewardPotential}
            <span className="text-xs text-muted-foreground">/task</span>
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/40">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700',
            isGlowing ? 'bg-primary' : 'bg-primary/70',
          )}
          style={{ width: `${progressPercent}%` }}
          data-testid="growth-level-progress"
        />
      </div>
    </div>
  )
}
