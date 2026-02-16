import Link from 'next/link'
import { ArrowUpRight, CheckCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PriorityAction } from '@/backend/data/agent'

const typeConfig: Record<
  PriorityAction['type'],
  { dot: string; row?: string; label: string }
> = {
  overdue: {
    dot: 'bg-destructive',
    row: 'border-destructive/20 bg-destructive/5',
    label: 'Overdue',
  },
  'due-today': { dot: 'bg-warning', label: 'Due Today' },
  'deadline-approaching': { dot: 'bg-warning', label: 'Deadline' },
  'needs-info': { dot: 'bg-primary', label: 'Needs Info' },
  'retry-ready': { dot: 'bg-primary', label: 'Retry' },
}

function formatRelativeTime(date: Date): string {
  const diff = Math.abs(Date.now() - date.getTime())
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  return `${Math.floor(diff / 60_000)}m ago`
}

export function DoNow({ actions }: { actions: PriorityAction[] }) {
  const capped = actions.slice(0, 6)
  const overdueCount = capped.filter((a) => a.type === 'overdue').length
  const dueTodayCount = capped.filter((a) => a.type === 'due-today').length

  return (
    <div data-testid="do-now">
      {/* ── Header ── */}
      <div className="mb-3 flex items-center gap-3">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Do Now
        </h3>
        {overdueCount > 0 && (
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-mono text-[10px] font-bold text-destructive">
            {overdueCount} overdue
          </span>
        )}
        {dueTodayCount > 0 && (
          <span className="rounded-full bg-warning/10 px-2 py-0.5 font-mono text-[10px] font-bold text-warning">
            {dueTodayCount} due today
          </span>
        )}
        <div className="flex-1" />
        <Link
          href="/agent/todo-list"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
          data-testid="do-now-action-hub-link"
        >
          Action Hub <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {/* ── Body ── */}
      {capped.length === 0 ? (
        <div className="card-terminal flex items-center justify-center gap-2 py-8">
          <CheckCircle className="h-4 w-4 text-success" />
          <p className="text-sm text-muted-foreground">
            Nothing urgent — nice work.
          </p>
        </div>
      ) : (
        <div className="card-terminal space-y-1.5">
          {capped.map((action, i) => {
            const cfg = typeConfig[action.type]
            return (
              <Link
                key={`${action.type}-${action.clientId}-${i}`}
                href={action.link}
              >
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-2.5 transition-all hover:bg-muted/30',
                    cfg.row ?? 'border-border',
                  )}
                  data-testid={`do-now-item-${i}`}
                >
                  <div
                    className={cn(
                      'h-2 w-2 shrink-0 rounded-full',
                      cfg.dot,
                    )}
                  />
                  <p className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {action.title}
                  </p>
                  {action.clientName && (
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground/70">
                      {action.clientName}
                    </span>
                  )}
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground/50">
                    {formatRelativeTime(action.createdAt)}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
