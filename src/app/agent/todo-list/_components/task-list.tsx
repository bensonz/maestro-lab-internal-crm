'use client'

import { useMemo } from 'react'
import {
  Clock,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Timer,
  ChevronDown,
  ChevronRight,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { cn } from '@/lib/utils'
import type { Todo, TimeRange } from './types'

// Time Filter

function TimeFilter({
  selected,
  onSelect,
}: {
  selected: TimeRange
  onSelect: (r: TimeRange) => void
}) {
  const opts: { value: TimeRange; label: string }[] = [
    { value: '1day', label: '1D' },
    { value: '3days', label: '3D' },
    { value: '7days', label: '7D' },
  ]
  return (
    <div className="flex items-center gap-0.5 rounded-md bg-muted/40 p-0.5">
      {opts.map((o) => (
        <Button
          key={o.value}
          variant={selected === o.value ? 'default' : 'ghost'}
          size="sm"
          className={cn(
            'h-6 px-2.5 text-[11px] font-medium',
            selected === o.value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => onSelect(o.value)}
          data-testid={`time-filter-${o.value}`}
        >
          {o.label}
        </Button>
      ))}
    </div>
  )
}

// Helpers

const formatCountdown = (hours: number): string => {
  if (hours < 0) {
    const abs = Math.abs(hours)
    return abs < 24 ? `${abs}h overdue` : `${Math.floor(abs / 24)}d overdue`
  }
  if (hours < 24) return `${hours}h`
  if (hours <= 72) return `${Math.floor(hours / 24)}d ${hours % 24}h`
  return `${Math.floor(hours / 24)}d`
}

const countdownColor = (todo: Todo): string => {
  if (todo.completed) return 'bg-success/20 text-success'
  if (todo.dueHours < 0) return 'bg-destructive/20 text-destructive'
  if (todo.dueHours <= 12) return 'bg-destructive/20 text-destructive'
  if (todo.dueHours <= 24) return 'bg-warning/20 text-warning'
  if (todo.dueHours <= 72) return 'bg-primary/20 text-primary'
  return 'bg-muted text-muted-foreground'
}

const estTime = (type: string): string => {
  const map: Record<string, string> = {
    Verification: '~2 min',
    'Bank Setup': '~5 min',
    PayPal: '~3 min',
    Edgeboost: '~5 min',
    Platform: '~10 min',
    Document: '~2 min',
  }
  return map[type] || '~3 min'
}

function consequence(todo: Todo): string | null {
  if (todo.completed) return null
  if (todo.dueHours < 0) return 'Overdue — affects delay rate & ranking'
  if (todo.dueHours <= 12) return 'Due soon — act now to avoid penalty'
  if (todo.taskType === 'Verification') return 'Compliance risk — blocks payout'
  if (todo.taskType === 'Document') return 'Blocks client progress'
  if (todo.taskType === 'Bank Setup') return 'Required for fund allocation'
  if (todo.taskType === 'Platform') return 'Required for client activation'
  return null
}

// Hover Content

function TaskHover({ todo }: { todo: Todo }) {
  return (
    <HoverCardContent
      side="right"
      align="start"
      className="w-72 border-border bg-card p-0"
    >
      <div className="border-b border-border p-2.5">
        <h4 className="text-xs font-medium text-foreground">{todo.title}</h4>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="h-4 px-1 text-[9px]">
            {todo.triggerType}
          </Badge>
          <Badge variant="outline" className="h-4 px-1 text-[9px]">
            Step {todo.linkedStep}
          </Badge>
          <Badge variant="outline" className="h-4 px-1 text-[9px]">
            {todo.taskType}
          </Badge>
        </div>
      </div>
      <div className="space-y-2 p-2.5 text-[11px]">
        <div>
          <p className="mb-1 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            Must Do
          </p>
          <ul className="space-y-0.5">
            {todo.instructions.mustDo.map((item, i) => (
              <li key={i} className="flex items-start gap-1">
                <CheckCircle2 className="mt-0.5 h-2.5 w-2.5 flex-shrink-0 text-success" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            Must NOT Do
          </p>
          <ul className="space-y-0.5">
            {todo.instructions.mustNotDo.map((item, i) => (
              <li key={i} className="flex items-start gap-1">
                <AlertCircle className="mt-0.5 h-2.5 w-2.5 flex-shrink-0 text-destructive" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        {todo.instructions.screenshotGuidance && (
          <div className="rounded bg-muted/30 p-1.5">
            <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Screenshot Guidance
            </p>
            <p>
              <span className="text-muted-foreground">Page:</span>{' '}
              {todo.instructions.screenshotGuidance.page}
            </p>
            <p>
              <span className="text-muted-foreground">Section:</span>{' '}
              {todo.instructions.screenshotGuidance.section}
            </p>
            <p>
              <span className="text-muted-foreground">Success:</span>{' '}
              {todo.instructions.screenshotGuidance.example}
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-1.5 border-t border-border pt-1.5 text-muted-foreground">
          <div>
            <p className="text-[9px] text-muted-foreground/60">Trigger</p>
            <p>{todo.triggerSource}</p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground/60">Created</p>
            <p>{todo.createdAt}</p>
          </div>
        </div>
      </div>
    </HoverCardContent>
  )
}

// Task Row

function TaskRow({
  todo,
  onUpload,
  onExtend,
  onReactivate,
}: {
  todo: Todo
  onUpload: (todo: Todo) => void
  onExtend: (id: string) => void
  onReactivate: (id: string) => void
}) {
  const canExtend = todo.extensionsUsed < todo.maxExtensions && !todo.completed
  const cons = consequence(todo)

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div
          className={cn(
            'group flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/15',
            todo.completed && 'opacity-35',
          )}
          onDoubleClick={() => todo.completed && onReactivate(todo.id)}
          data-testid={`task-row-${todo.id}`}
        >
          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'truncate text-sm font-medium',
                  todo.completed &&
                    'text-muted-foreground line-through',
                )}
              >
                {todo.title}
              </span>
              <Badge
                variant="outline"
                className="h-4 flex-shrink-0 px-1.5 text-[9px]"
              >
                {todo.taskType}
              </Badge>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="truncate text-[11px] text-muted-foreground">
                {todo.client}
              </span>
              {!todo.completed && (
                <>
                  <span className="text-muted-foreground/25">&middot;</span>
                  <span className="flex items-center gap-0.5 font-mono text-[10px] text-muted-foreground/60">
                    <Timer className="h-2.5 w-2.5" />
                    {estTime(todo.taskType)}
                  </span>
                </>
              )}
            </div>
            {cons && !todo.completed && (
              <p
                className={cn(
                  'mt-0.5 flex items-center gap-1 text-[10px]',
                  todo.dueHours < 0
                    ? 'text-destructive'
                    : todo.dueHours <= 12
                      ? 'text-warning'
                      : 'text-muted-foreground/60',
                )}
              >
                <Zap className="h-2.5 w-2.5" />
                {cons}
              </p>
            )}
          </div>

          {/* Right */}
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <Badge
              className={cn(
                'h-5 font-mono text-[10px]',
                countdownColor(todo),
              )}
            >
              {todo.completed ? 'Done' : formatCountdown(todo.dueHours)}
            </Badge>
            {!todo.completed && (
              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="terminal"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={(e) => {
                    e.stopPropagation()
                    onUpload(todo)
                  }}
                  data-testid={`upload-btn-${todo.id}`}
                >
                  <Upload className="mr-1 h-3 w-3" />
                  Submit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-1.5 text-[10px]"
                  disabled={!canExtend}
                  onClick={(e) => {
                    e.stopPropagation()
                    onExtend(todo.id)
                  }}
                  data-testid={`extend-btn-${todo.id}`}
                >
                  +3d
                </Button>
              </div>
            )}
            {todo.completed && (
              <RotateCcw className="h-3 w-3 text-muted-foreground/30" />
            )}
          </div>
        </div>
      </HoverCardTrigger>
      <TaskHover todo={todo} />
    </HoverCard>
  )
}

// Main Component

interface TaskListProps {
  todos: Todo[]
  timeFilter: TimeRange
  onTimeFilterChange: (r: TimeRange) => void
  onUpload: (todo: Todo) => void
  onExtend: (id: string) => void
  onReactivate: (id: string) => void
  showCompleted: boolean
  onShowCompletedChange: (v: boolean) => void
}

export function TaskList({
  todos,
  timeFilter,
  onTimeFilterChange,
  onUpload,
  onExtend,
  onReactivate,
  showCompleted,
  onShowCompletedChange,
}: TaskListProps) {
  const active = useMemo(() => todos.filter((t) => !t.completed), [todos])
  const completed = useMemo(() => todos.filter((t) => t.completed), [todos])

  const groups = useMemo(() => {
    const buckets = [
      {
        label: 'Overdue',
        items: active.filter((t) => t.dueHours < 0),
        color: 'text-destructive',
        bg: 'bg-destructive',
      },
      {
        label: 'Today',
        items: active.filter((t) => t.dueHours >= 0 && t.dueHours <= 24),
        color: 'text-warning',
        bg: 'bg-warning',
      },
      {
        label: '3 Days',
        items: active.filter((t) => t.dueHours > 24 && t.dueHours <= 72),
        color: 'text-primary',
        bg: 'bg-primary',
      },
      {
        label: '7 Days',
        items: active.filter((t) => t.dueHours > 72),
        color: 'text-muted-foreground',
        bg: 'bg-muted-foreground',
      },
    ]
    return buckets.filter((b) => b.items.length > 0)
  }, [active])

  return (
    <div
      className="overflow-hidden rounded-lg border border-border bg-card"
      data-testid="task-list"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-foreground" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Active Tasks
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Hover for instructions &middot; Double-click completed to
              reactivate
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">
            {active.length} pending
          </span>
          <TimeFilter selected={timeFilter} onSelect={onTimeFilterChange} />
        </div>
      </div>

      {/* Distribution bar */}
      {active.length > 0 && (
        <div className="flex items-center gap-3 border-b border-border/20 px-4 py-1.5">
          <div className="flex h-1 flex-1 overflow-hidden rounded-full bg-muted/20">
            {groups.map((g) => (
              <div
                key={g.label}
                className={cn('h-full', g.bg)}
                style={{
                  width: `${(g.items.length / active.length) * 100}%`,
                }}
              />
            ))}
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {groups.map((g) => (
              <div key={g.label} className="flex items-center gap-1">
                <div className={cn('h-1.5 w-1.5 rounded-full', g.bg)} />
                <span className="font-mono text-[9px] text-muted-foreground">
                  {g.items.length}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Groups */}
      <div className="max-h-[520px] overflow-y-auto">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="flex items-center justify-between border-b border-border/20 bg-muted/10 px-3 py-1">
              <span
                className={cn(
                  'text-[9px] font-semibold uppercase tracking-widest',
                  g.color,
                )}
              >
                {g.label}
              </span>
              <span className="font-mono text-[9px] text-muted-foreground/50">
                {g.items.length}
              </span>
            </div>
            <div className="divide-y divide-border/20">
              {g.items.map((t) => (
                <TaskRow
                  key={t.id}
                  todo={t}
                  onUpload={onUpload}
                  onExtend={onExtend}
                  onReactivate={onReactivate}
                />
              ))}
            </div>
          </div>
        ))}

        {groups.length === 0 && (
          <div className="p-10 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-success/30" />
            <p className="text-xs text-muted-foreground">
              No pending tasks in this range
            </p>
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div className="border-t border-border/40">
            <button
              onClick={() => onShowCompletedChange(!showCompleted)}
              className="flex w-full items-center gap-2 bg-success/3 px-3 py-2 transition-colors hover:bg-success/5"
              data-testid="toggle-completed"
            >
              {showCompleted ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
              <CheckCircle2 className="h-3 w-3 text-success/50" />
              <span className="text-[10px] text-muted-foreground">
                Completed ({completed.length})
              </span>
            </button>
            {showCompleted && (
              <div className="divide-y divide-border/20">
                {completed.map((t) => (
                  <TaskRow
                    key={t.id}
                    todo={t}
                    onUpload={onUpload}
                    onExtend={onExtend}
                    onReactivate={onReactivate}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
