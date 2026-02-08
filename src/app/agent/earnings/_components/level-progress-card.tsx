'use client'

import { Star, TrendingUp, Users, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface StarLevel {
  current_level: number
  current_label: string
  next_level: number
  next_label: string
  next_level_bonus: string
  direct_referrals: { current: number; required: number }
  team_size: { current: number; required: number }
}

// TODO: implement star level system
const defaultLevel: StarLevel = {
  current_level: 2,
  current_label: '2-Star Agent',
  next_level: 3,
  next_label: '3-Star Agent',
  next_level_bonus: '+$150/client',
  direct_referrals: { current: 3, required: 5 },
  team_size: { current: 8, required: 15 },
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

export function LevelProgressCard() {
  const level = defaultLevel

  const referralProgress =
    (level.direct_referrals.current / level.direct_referrals.required) * 100
  const teamProgress =
    (level.team_size.current / level.team_size.required) * 100

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

            <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Next Level:</span>
              <div className="flex items-center gap-1">
                {renderStars(level.next_level)}
              </div>
              <span className="font-medium text-primary">
                {level.next_label}
              </span>
            </div>

            {/* Progress Bars */}
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3 w-3" /> Direct Referrals
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
                Unlocks at {level.next_level}-Star
              </span>
            </div>
            <p className="font-mono text-lg font-bold text-success">
              {level.next_level_bonus}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
