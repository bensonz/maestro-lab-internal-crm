'use client'

import { Award, Zap, Shield, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TeamComparisonCardProps {
  percentile: number
  myRank: number
  totalMembers: number
  speed: number
  stability: number
  influence: number
}

interface MetricBarProps {
  label: string
  value: number
  description: string
  icon: React.ReactNode
  color: string
}

function MetricBar({ label, value, description, icon, color }: MetricBarProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-xs font-medium text-foreground">{label}</span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {Math.round(value)}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted/40">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <p className="font-mono text-[10px] text-muted-foreground">{description}</p>
    </div>
  )
}

export function TeamComparisonCard({
  percentile,
  myRank,
  totalMembers,
  speed,
  stability,
  influence,
}: TeamComparisonCardProps) {
  const maxInfluence = Math.max(influence, 50)
  const influencePercent = Math.round((influence / maxInfluence) * 100)

  return (
    <div
      className="rounded-lg border border-border bg-card p-5"
      data-testid="team-comparison-card"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Team Performance
          </h3>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            Your ranking among {totalMembers} agents
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
          <Award className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-[11px] font-semibold text-primary">
            Top {percentile}%
          </span>
        </div>
      </div>

      {/* Rank indicator */}
      <div className="mb-4 rounded-md border border-border/40 bg-muted/15 p-3 text-center">
        <p className="font-mono text-2xl font-bold text-foreground">
          #{myRank}
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
          out of {totalMembers} agents
        </p>
      </div>

      {/* Metric bars */}
      <div className="space-y-3">
        <MetricBar
          label="Speed"
          value={speed}
          description={`Faster than ${Math.round(speed)}% of team members`}
          icon={<Zap className="h-3 w-3 text-warning" />}
          color="bg-warning"
        />
        <MetricBar
          label="Stability"
          value={stability}
          description={`${Math.round(100 - stability)}% delay rate`}
          icon={<Shield className="h-3 w-3 text-primary" />}
          color="bg-primary"
        />
        <MetricBar
          label="Influence"
          value={influencePercent}
          description={`${influence} clients managed`}
          icon={<Users className="h-3 w-3 text-success" />}
          color="bg-success"
        />
      </div>
    </div>
  )
}
