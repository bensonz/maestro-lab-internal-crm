'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Award,
  Clock,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import type { CockpitAgentActivity } from '@/types/backend-types'
import { InsightsSection } from './fund-war-room'

interface AgentActivityProps {
  data: CockpitAgentActivity
}

export function AgentActivity({ data }: AgentActivityProps) {
  const [insightsOpen, setInsightsOpen] = useState(false)
  const { ranking, teamMetrics, lowSuccessAgents } = data

  return (
    <div className="card-terminal space-y-3 p-4" data-testid="agent-activity">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
        Agent Activity
      </h2>

      {/* Agent Ranking */}
      <div className="rounded-md border border-border bg-card p-3">
        <h3 className="mb-2 flex items-center gap-2 text-xs font-medium text-foreground">
          <Trophy className="h-3.5 w-3.5 text-warning" />
          Agent Ranking
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <RankingCard
            label="Most Clients"
            icon={<Users className="h-3 w-3" />}
            value={ranking.mostClients ? `${ranking.mostClients.count}` : '—'}
            name={ranking.mostClients?.name ?? 'N/A'}
            accent="text-primary"
          />
          <RankingCard
            label="Speed Champion"
            icon={<Zap className="h-3 w-3" />}
            value={ranking.fastestAgent ? `${ranking.fastestAgent.avgDays}d` : '—'}
            name={ranking.fastestAgent?.name ?? 'N/A'}
            accent="text-success"
          />
          <RankingCard
            label="Month's Most"
            icon={<Award className="h-3 w-3" />}
            value={ranking.monthMostClients ? `${ranking.monthMostClients.count}` : '—'}
            name={ranking.monthMostClients?.name ?? 'N/A'}
            accent="text-primary"
          />
          <RankingCard
            label="Month's Fastest"
            icon={<Clock className="h-3 w-3" />}
            value={ranking.monthFastestAgent ? `${ranking.monthFastestAgent.avgDays}d` : '—'}
            name={ranking.monthFastestAgent?.name ?? 'N/A'}
            accent="text-success"
          />
        </div>
      </div>

      {/* Team Metrics */}
      <div className="rounded-md border border-border bg-card p-3">
        <h3 className="mb-2 text-xs font-medium text-foreground">Team Metrics</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <MetricBox
            label="Team"
            value={`${teamMetrics.activeAgents}/${teamMetrics.totalAgents}`}
            sublabel="active"
          />
          <MetricBox
            label="Avg Days"
            value={teamMetrics.globalAvgDays !== null ? `${teamMetrics.globalAvgDays}` : '—'}
            sublabel="per client"
          />
          <MetricBox
            label="End-to-End"
            value={teamMetrics.globalEndToEndDays !== null ? `${teamMetrics.globalEndToEndDays}d` : '—'}
            sublabel="avg"
          />
        </div>
        {teamMetrics.zeroSuccessCount > 0 && (
          <div className="mt-2 rounded bg-destructive/10 px-2 py-1 text-center text-[10px] font-medium text-destructive">
            {teamMetrics.zeroSuccessCount} agent{teamMetrics.zeroSuccessCount !== 1 ? 's' : ''} with 0 approvals
          </div>
        )}
      </div>

      {/* Low Success Agents */}
      {lowSuccessAgents.length > 0 && (
        <div className="rounded-md border border-warning/30 bg-warning/5 p-3">
          <h3 className="mb-2 text-xs font-medium text-warning">
            Low Success (&lt;85%) — {lowSuccessAgents.length} agent{lowSuccessAgents.length !== 1 ? 's' : ''}
          </h3>
          <div className="space-y-1">
            {lowSuccessAgents.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-foreground">{a.name}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-[10px]">{a.displayTier}</span>
                  <span className={cn('font-mono font-semibold', a.successRate < 50 ? 'text-destructive' : 'text-warning')}>
                    {a.successRate}%
                  </span>
                  <span className="text-[10px]">
                    {a.approvedClients}/{a.totalClients}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {data.insights.length > 0 && (
        <InsightsSection
          insights={data.insights}
          open={insightsOpen}
          onToggle={() => setInsightsOpen(!insightsOpen)}
        />
      )}
    </div>
  )
}

function RankingCard({
  label,
  icon,
  value,
  name,
  accent,
}: {
  label: string
  icon: React.ReactNode
  value: string
  name: string
  accent: string
}) {
  return (
    <div className="rounded border border-border/50 bg-background p-2">
      <div className="mb-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn('font-mono text-lg font-bold', accent)}>{value}</div>
      <div className="truncate text-[10px] text-muted-foreground">{name}</div>
    </div>
  )
}

function MetricBox({
  label,
  value,
  sublabel,
}: {
  label: string
  value: string
  sublabel: string
}) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-mono text-sm font-bold text-foreground">{value}</div>
      <div className="text-[10px] text-muted-foreground">{sublabel}</div>
    </div>
  )
}
