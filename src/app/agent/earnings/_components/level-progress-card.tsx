'use client'

import { Star, Crown, Lock, Unlock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { STAR_THRESHOLDS } from '@/lib/commission-constants'

interface LevelProgressCardProps {
  starLevel: number
  approvedClients: number
  fourStarLeaders: number
  teamSize: number
}

function Stars({ count, filled = true }: { count: number; filled?: boolean }) {
  return (
    <>
      {Array(count)
        .fill(0)
        .map((_, i) => (
          <Star
            key={i}
            className={cn(
              'h-3.5 w-3.5',
              filled
                ? 'fill-warning text-warning'
                : 'text-muted-foreground/30',
            )}
          />
        ))}
    </>
  )
}

const PER_CLIENT = [200, 250, 300, 350, 400]

export function LevelProgressCard({
  starLevel,
  approvedClients,
  fourStarLeaders,
  teamSize,
}: LevelProgressCardProps) {
  const current = STAR_THRESHOLDS[starLevel] ?? STAR_THRESHOLDS[0]
  const next = STAR_THRESHOLDS[Math.min(starLevel + 1, 4)]
  const isMaxLevel = starLevel >= 4

  const clientProgress = isMaxLevel
    ? 100
    : Math.min(100, (approvedClients / next.min) * 100)
  const clientsToNext = isMaxLevel ? 0 : Math.max(0, next.min - approvedClients)
  const nextPerClient = isMaxLevel ? 400 : PER_CLIENT[starLevel + 1]

  return (
    <Card
      className="card-terminal border-primary/30 bg-gradient-to-r from-primary/5 to-transparent"
      data-testid="level-progress-card"
    >
      <CardContent className="px-4 py-3">
        <div className="flex items-center gap-5">
          {/* Star Level */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-0.5">
              <Stars count={starLevel} />
              <Stars count={4 - starLevel} filled={false} />
            </div>
            <span className="text-sm font-semibold whitespace-nowrap">
              {current.label}
            </span>
          </div>

          <div className="h-9 w-px shrink-0 bg-border/60" />

          {/* Progress */}
          <div className="min-w-[160px] max-w-[240px] flex-1">
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Clients Closed</span>
              <span className="font-mono font-medium">
                {approvedClients}/{isMaxLevel ? approvedClients : next.min}
              </span>
            </div>
            <Progress value={clientProgress} className="h-1.5" />
          </div>

          <div className="h-9 w-px shrink-0 bg-border/60" />

          {/* Next Unlock */}
          {!isMaxLevel ? (
            <div className="flex items-center gap-2 shrink-0" data-testid="next-star-unlock">
              <Lock className="h-4 w-4 text-muted-foreground/60" />
              <div>
                <p className="text-[10px] leading-tight text-muted-foreground">
                  Unlock at {next.label}
                </p>
                <p className="font-mono text-sm font-bold leading-tight text-primary">
                  +${nextPerClient}/client
                </p>
              </div>
              {clientsToNext > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {clientsToNext} to go
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0" data-testid="next-star-unlock">
              <Unlock className="h-4 w-4 text-success" />
              <div>
                <p className="text-[10px] leading-tight text-success/70">Max unlocked</p>
                <p className="font-mono text-sm font-bold leading-tight text-success">
                  +$400/client
                </p>
              </div>
            </div>
          )}

          <div className="h-9 w-px shrink-0 bg-border/60" />

          {/* ED Leadership Goal */}
          <div className="flex items-center gap-2 shrink-0" data-testid="ed-unlock">
            <Crown className="h-4 w-4 text-warning" />
            <div>
              <p className="text-[10px] leading-tight text-muted-foreground">
                Executive Director
              </p>
              <p className="font-mono text-sm font-bold leading-tight text-warning">
                $10,000
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning leading-none">
                {fourStarLeaders}/2 &#9733;4 leaders
              </span>
              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning leading-none">
                {teamSize}/30 team
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
