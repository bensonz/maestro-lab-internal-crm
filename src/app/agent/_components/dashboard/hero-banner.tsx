import { Star, TrendingUp, TrendingDown } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { STAR_THRESHOLDS } from '@/lib/commission-constants'
import { cn } from '@/lib/utils'

interface HeroBannerProps {
  totalEarnings: number
  pendingPayout: number
  thisMonthEarnings: number
  earningsChange: number
  starLevel: number
  approvedClients: number
  clientsToNextTier: number | null
  successRate: number
  percentile: number
}

export function HeroBanner({
  totalEarnings,
  pendingPayout,
  thisMonthEarnings,
  earningsChange,
  starLevel,
  approvedClients,
  clientsToNextTier,
  successRate,
  percentile,
}: HeroBannerProps) {
  const current = STAR_THRESHOLDS[starLevel] ?? STAR_THRESHOLDS[0]
  const next = STAR_THRESHOLDS[Math.min(starLevel + 1, 4)]
  const isMaxLevel = starLevel >= 4
  const progress = isMaxLevel
    ? 100
    : Math.min(100, (approvedClients / next.min) * 100)

  // Income per close: $200 base + min(starLevel, 4) * $50 from star pool
  const incomePerClose = 200 + Math.min(starLevel, 4) * 50

  return (
    <div
      className="card-terminal space-y-4 border-primary/20"
      data-testid="hero-banner"
    >
      {/* ── Money Row ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div data-testid="hero-total-earned">
          <p className="text-xs text-muted-foreground">Total Earned</p>
          <p className="text-3xl font-mono font-bold text-success">
            ${totalEarnings.toLocaleString()}
          </p>
        </div>
        <div data-testid="hero-pending-payout">
          <p className="text-xs text-muted-foreground">Pending Payout</p>
          <p className="text-xl font-mono font-bold text-warning">
            ${pendingPayout.toLocaleString()}
          </p>
        </div>
        <div data-testid="hero-this-month">
          <p className="text-xs text-muted-foreground">This Month</p>
          <p className="text-xl font-mono font-bold text-foreground">
            ${thisMonthEarnings.toLocaleString()}
          </p>
        </div>
        <div className="flex items-end" data-testid="hero-mom-trend">
          <p className="text-xs text-muted-foreground lg:hidden">MoM Trend</p>
          {earningsChange !== 0 ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-sm font-bold',
                earningsChange > 0
                  ? 'bg-success/10 text-success'
                  : 'bg-destructive/10 text-destructive',
              )}
            >
              {earningsChange > 0 ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {earningsChange > 0 ? '+' : ''}
              {earningsChange}%
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 font-mono text-sm text-muted-foreground">
              —
            </span>
          )}
        </div>
      </div>

      {/* ── Level Row ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 4 }, (_, i) => (
            <Star
              key={i}
              className={cn(
                'h-4 w-4',
                i < starLevel
                  ? 'fill-warning text-warning'
                  : 'text-muted-foreground/30',
              )}
            />
          ))}
        </div>
        <span className="text-sm font-medium">{current.label}</span>
        <div className="flex min-w-32 flex-1 items-center gap-2 lg:max-w-48">
          <Progress value={progress} className="h-1.5" />
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {approvedClients}/{next.min}
          </span>
        </div>
        {isMaxLevel ? (
          <span className="font-mono text-xs text-success">Max level</span>
        ) : clientsToNextTier != null && clientsToNextTier > 0 ? (
          <span className="font-mono text-xs text-muted-foreground">
            ({clientsToNextTier} to go)
          </span>
        ) : null}
      </div>

      {/* ── Context Line ── */}
      <p className="text-xs text-muted-foreground" data-testid="hero-context-line">
        ${incomePerClose}/close &middot; Top {100 - percentile}% &middot;{' '}
        {successRate}% success rate
      </p>
    </div>
  )
}
