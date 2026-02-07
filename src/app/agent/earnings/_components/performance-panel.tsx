'use client'

import { Card, CardContent } from '@/components/ui/card'
import {
  Target,
  TrendingDown,
  Percent,
  Timer,
  Hourglass,
  ListTodo,
  AlertTriangle,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentKPIs } from '@/backend/services/agent-kpis'

interface PerformancePanelProps {
  kpis: AgentKPIs
}

function getSuccessRateColor(rate: number) {
  if (rate >= 80) return 'text-success'
  if (rate >= 60) return 'text-warning'
  return 'text-destructive'
}

function getDelayRateColor(rate: number) {
  if (rate <= 10) return 'text-success'
  if (rate <= 20) return 'text-warning'
  return 'text-destructive'
}

const metrics = [
  {
    key: 'successRate',
    label: 'Success Rate',
    icon: Target,
    format: (kpis: AgentKPIs) => `${kpis.successRate}%`,
    color: (kpis: AgentKPIs) => getSuccessRateColor(kpis.successRate),
  },
  {
    key: 'delayRate',
    label: 'Delay Rate',
    icon: TrendingDown,
    format: (kpis: AgentKPIs) => `${kpis.delayRate}%`,
    color: (kpis: AgentKPIs) => getDelayRateColor(kpis.delayRate),
  },
  {
    key: 'extensionRate',
    label: 'Extension Rate',
    icon: Percent,
    format: (kpis: AgentKPIs) => `${kpis.extensionRate}%`,
    color: () => 'text-foreground',
  },
  {
    key: 'avgDaysToConvert',
    label: 'Avg Days to Convert',
    icon: Timer,
    format: (kpis: AgentKPIs) =>
      kpis.avgDaysToConvert !== null ? `${kpis.avgDaysToConvert}d` : '\u2014',
    color: () => 'text-foreground',
  },
  {
    key: 'avgDaysToInitiate',
    label: 'Avg Days to Initiate',
    icon: Hourglass,
    format: (kpis: AgentKPIs) =>
      kpis.avgDaysToInitiate !== null ? `${kpis.avgDaysToInitiate}d` : '\u2014',
    color: () => 'text-foreground',
  },
  {
    key: 'inProgressClients',
    label: 'In Progress',
    icon: Users,
    format: (kpis: AgentKPIs) => String(kpis.inProgressClients),
    color: () => 'text-warning',
  },
  {
    key: 'pendingTodos',
    label: 'Pending Todos',
    icon: ListTodo,
    format: (kpis: AgentKPIs) => String(kpis.pendingTodos),
    color: () => 'text-foreground',
  },
  {
    key: 'overdueTodos',
    label: 'Overdue Todos',
    icon: AlertTriangle,
    format: (kpis: AgentKPIs) => String(kpis.overdueTodos),
    color: (kpis: AgentKPIs) =>
      kpis.overdueTodos > 0 ? 'text-destructive' : 'text-foreground',
  },
] as const

export function PerformancePanel({ kpis }: PerformancePanelProps) {
  return (
    <Card
      className="border-border/50 bg-card/80"
      data-testid="performance-panel"
    >
      <CardContent className="p-0">
        <div className="border-b border-border/50 px-3 py-2.5">
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Performance Metrics
          </h3>
        </div>
        <div className="divide-y divide-border/30">
          {metrics.map((metric) => {
            const Icon = metric.icon
            const value = metric.format(kpis)
            const colorClass = metric.color(kpis)

            return (
              <div
                key={metric.key}
                className="flex items-center justify-between px-3 py-2"
                data-testid={`metric-${metric.key}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {metric.label}
                  </span>
                </div>
                <span className={cn('font-mono text-sm font-medium', colorClass)}>
                  {value}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
