'use client'

import { Star, TrendingUp, Users, Sparkles, Crown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { STAR_THRESHOLDS } from '@/lib/commission-constants'

interface LevelProgressCardProps {
  starLevel: number
  approvedClients: number
  teamSize: number
  directReports: number
}

function renderStars(count: number, filled: boolean = true) {
  return Array(count)
    .fill(0)
    .map((_, i) => (
      <Star
        key={i}
        className={cn(
          'h-4 w-4',
          filled
            ? 'fill-warning text-warning'
            : 'text-muted-foreground/40',
        )}
      />
    ))
}

export function LevelProgressCard({
  starLevel,
  approvedClients,
  teamSize,
}: LevelProgressCardProps) {
  const current = STAR_THRESHOLDS[starLevel] ?? STAR_THRESHOLDS[0]
  const next = STAR_THRESHOLDS[Math.min(starLevel + 1, 4)]
  const isMaxLevel = starLevel >= 4

  // Progress toward next level based on approved client count
  const referralProgress = isMaxLevel
    ? 100
    : Math.min(100, (approvedClients / next.min) * 100)

  // Team size progress — next tier's min as reasonable target
  const teamTarget = isMaxLevel ? teamSize : next.min
  const teamProgress = Math.min(
    100,
    (teamSize / Math.max(teamTarget, 1)) * 100,
  )

  const level = {
    current_level: starLevel,
    current_label: current.label,
    next_level: isMaxLevel ? 4 : starLevel + 1,
    next_label: isMaxLevel ? 'Max Level' : next.label,
    next_level_bonus: isMaxLevel
      ? 'Max tier reached'
      : `+${next.sliceBonus}/client`,
    direct_referrals: {
      current: approvedClients,
      required: isMaxLevel ? approvedClients : next.min,
    },
    team_size: {
      current: teamSize,
      required: isMaxLevel ? teamSize : Math.max(teamTarget, 1),
    },
  }

  return (
    <Card
      className="card-terminal border-primary/30 bg-gradient-to-r from-primary/5 to-transparent"
      data-testid="level-progress-card"
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-6">
          {/* Current Level */}
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex items-center gap-1">
                {renderStars(level.current_level)}
                {renderStars(4 - level.current_level, false)}
              </div>
              <span className="text-sm font-medium text-foreground">
                {level.current_label}
              </span>
            </div>

            {isMaxLevel ? (
              <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Crown className="h-3.5 w-3.5 text-warning" />
                <span className="font-medium text-warning">
                  Maximum Star Level Reached
                </span>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                <span>Next Level:</span>
                <div className="flex items-center gap-1">
                  {renderStars(level.next_level)}
                </div>
                <span className="font-medium text-primary">
                  {level.next_label}
                </span>
              </div>
            )}

            {/* Progress Bars */}
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3 w-3" /> Approved Clients
                  </span>
                  <span className="font-mono">
                    {level.direct_referrals.current} /{' '}
                    {level.direct_referrals.required}
                  </span>
                </div>
                <Progress value={referralProgress} className="h-2" />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <TrendingUp className="h-3 w-3" /> Team Size
                  </span>
                  <span className="font-mono">
                    {level.team_size.current} / {level.team_size.required}
                  </span>
                </div>
                <Progress value={teamProgress} className="h-2" />
              </div>
            </div>
          </div>

          {/* Upgrade Incentive */}
          <div className="min-w-[180px] rounded-lg border border-success/30 bg-success/10 p-3">
            <div className="mb-1 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-success" />
              <span className="text-xs font-medium uppercase tracking-wider text-success">
                {isMaxLevel
                  ? 'Leadership Tier'
                  : `Unlocks at ${level.next_level}-Star`}
              </span>
            </div>
            <p className="font-mono text-lg font-bold text-success">
              {isMaxLevel
                ? 'Executive Path'
                : level.next_level_bonus}
            </p>
            {isMaxLevel && (
              <p className="mt-1 text-[10px] text-success/80">
                Develop 2 four-star agents to unlock Executive Director
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
