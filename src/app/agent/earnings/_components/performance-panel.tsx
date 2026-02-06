'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import type { AgentKPIs } from '@/backend/services/agent-kpis'

interface PerformancePanelProps {
  kpis: AgentKPIs
}

function getSuccessRateColor(rate: number) {
  if (rate >= 80) return 'text-chart-4'
  if (rate >= 60) return 'text-accent'
  return 'text-destructive'
}

function getDelayRateColor(rate: number) {
  if (rate <= 10) return 'text-chart-4'
  if (rate <= 20) return 'text-accent'
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
    label: 'Clients In Progress',
    icon: Users,
    format: (kpis: AgentKPIs) => String(kpis.inProgressClients),
    color: () => 'text-foreground',
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
    color: (kpis: AgentKPIs) => (kpis.overdueTodos > 0 ? 'text-destructive' : 'text-foreground'),
  },
] as const

export function PerformancePanel({ kpis }: PerformancePanelProps) {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm" data-testid="performance-panel">
      <CardHeader>
        <CardTitle className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          const value = metric.format(kpis)
          const colorClass = metric.color(kpis)
          const isLast = index === metrics.length - 1

          return (
            <div
              key={metric.key}
              className={`flex items-center justify-between py-3 ${
                !isLast ? 'border-b border-border/30' : ''
              }`}
              data-testid={`metric-${metric.key}`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{metric.label}</span>
              </div>
              <span className={`text-sm font-semibold font-mono ${colorClass}`}>
                {value}
              </span>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
