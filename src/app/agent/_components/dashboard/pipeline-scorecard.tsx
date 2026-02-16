import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Pipeline ────────────────────────────────────────────────────────────────

interface PipelineProps {
  prequal: number
  phoneIssued: number
  inExecution: number
  readyForApproval: number
  approved: number
  rejected: number
}

const stages = [
  { key: 'prequal', label: 'Pre-qualification', dot: 'bg-muted-foreground' },
  { key: 'phoneIssued', label: 'Phone Issued', dot: 'bg-blue-500' },
  { key: 'inExecution', label: 'In Execution', dot: 'bg-primary' },
  { key: 'readyForApproval', label: 'Ready for Approval', dot: 'bg-warning' },
] as const

export function Pipeline(props: PipelineProps) {
  return (
    <div className="card-terminal" data-testid="pipeline">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Pipeline
      </h3>

      <div className="space-y-0.5">
        {stages.map(({ key, label, dot }) => (
          <div
            key={key}
            className="flex items-center justify-between py-1.5"
            data-testid={`pipeline-${key}`}
          >
            <div className="flex items-center gap-2">
              <div className={cn('h-1.5 w-1.5 rounded-full', dot)} />
              <span className="text-sm text-foreground">{label}</span>
            </div>
            <span className="font-mono text-sm font-bold">{props[key]}</span>
          </div>
        ))}
      </div>

      <div className="my-2 border-t border-border/40" />

      <div className="space-y-0.5">
        <div
          className="flex items-center justify-between py-1.5"
          data-testid="pipeline-approved"
        >
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-success" />
            <span className="text-sm text-success">Approved</span>
          </div>
          <span className="font-mono text-sm font-bold text-success">
            {props.approved}
          </span>
        </div>
        <div
          className="flex items-center justify-between py-1.5"
          data-testid="pipeline-rejected"
        >
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
            <span className="text-sm text-destructive">Rejected</span>
          </div>
          <span className="font-mono text-sm font-bold text-destructive">
            {props.rejected}
          </span>
        </div>
      </div>

      <div className="mt-3">
        <Link
          href="/agent/clients"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
          data-testid="pipeline-view-clients"
        >
          View Clients <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}

// ── Scorecard ───────────────────────────────────────────────────────────────

interface ScorecardProps {
  successRate: number
  avgDaysToConvert: number | null
  overdueTodos: number
  totalClients: number
  percentile: number
}

const scorecardRows = [
  { key: 'successRate', label: 'Success Rate' },
  { key: 'avgDays', label: 'Avg Conversion' },
  { key: 'overdueTodos', label: 'Overdue Tasks' },
  { key: 'totalClients', label: 'Total Clients' },
  { key: 'ranking', label: 'Ranking' },
] as const

export function Scorecard({
  successRate,
  avgDaysToConvert,
  overdueTodos,
  totalClients,
  percentile,
}: ScorecardProps) {
  return (
    <div className="card-terminal" data-testid="scorecard">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Scorecard
      </h3>

      <div className="space-y-0.5">
        {/* Success Rate */}
        <div
          className="flex items-center justify-between py-1.5"
          data-testid="scorecard-success-rate"
        >
          <span className="text-sm text-foreground">Success Rate</span>
          <span
            className={cn(
              'font-mono text-sm font-bold',
              successRate >= 80
                ? 'text-success'
                : successRate >= 50
                  ? 'text-warning'
                  : 'text-destructive',
            )}
          >
            {successRate}%
          </span>
        </div>

        {/* Avg Conversion */}
        <div
          className="flex items-center justify-between py-1.5"
          data-testid="scorecard-avg-days"
        >
          <span className="text-sm text-foreground">Avg Conversion</span>
          <span className="font-mono text-sm font-bold">
            {avgDaysToConvert != null ? `${avgDaysToConvert}d` : '\u2014'}
          </span>
        </div>

        {/* Overdue Tasks */}
        <div
          className="flex items-center justify-between py-1.5"
          data-testid="scorecard-overdue"
        >
          <span className="text-sm text-foreground">Overdue Tasks</span>
          <span
            className={cn(
              'font-mono text-sm font-bold',
              overdueTodos > 0 ? 'text-destructive' : 'text-foreground',
            )}
          >
            {overdueTodos}
          </span>
        </div>

        {/* Total Clients */}
        <div
          className="flex items-center justify-between py-1.5"
          data-testid="scorecard-total-clients"
        >
          <span className="text-sm text-foreground">Total Clients</span>
          <span className="font-mono text-sm font-bold">{totalClients}</span>
        </div>

        {/* Ranking */}
        <div
          className="flex items-center justify-between py-1.5"
          data-testid="scorecard-ranking"
        >
          <span className="text-sm text-foreground">Ranking</span>
          <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
            Top {100 - percentile}%
          </span>
        </div>
      </div>
    </div>
  )
}
