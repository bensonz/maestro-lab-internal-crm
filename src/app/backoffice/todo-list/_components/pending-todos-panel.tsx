'use client'

import { ListChecks, AlertTriangle, Clock, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { ActionHubTodo } from './types'

interface PendingTodosPanelProps {
  todos: ActionHubTodo[]
}

export function PendingTodosPanel({ todos }: PendingTodosPanelProps) {
  const overdue = todos.filter((t) => t.overdue)
  const upcoming = todos.filter((t) => !t.overdue)

  return (
    <div id="pending-todos" className="card-terminal p-0" data-testid="pending-todos-panel">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-3">
        <ListChecks className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Operational Todos
        </h3>
        {todos.length > 0 && (
          <span
            className={cn(
              'ml-auto rounded px-2 py-0.5 font-mono text-xs font-semibold',
              overdue.length > 0
                ? 'bg-destructive/20 text-destructive'
                : 'bg-primary/20 text-primary',
            )}
          >
            {todos.length}
          </span>
        )}
      </div>

      {/* Content */}
      {todos.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">
          No pending todos
        </p>
      ) : (
        <div className="max-h-[360px] divide-y divide-border/50 overflow-y-auto">
          {overdue.map((todo) => (
            <TodoRow key={todo.id} todo={todo} />
          ))}
          {upcoming.map((todo) => (
            <TodoRow key={todo.id} todo={todo} />
          ))}
        </div>
      )}
    </div>
  )
}

function TodoRow({ todo }: { todo: ActionHubTodo }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/20',
        todo.overdue && 'bg-destructive/5',
      )}
      data-testid={`todo-row-${todo.id}`}
    >
      {todo.overdue ? (
        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
      ) : (
        <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {todo.issueCategory}
          </span>
          {todo.source === 'EMAIL_AUTO' && (
            <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {todo.clientName} — {todo.agentName}
        </p>
      </div>
      <span
        className={cn(
          'shrink-0 rounded px-2 py-1 font-mono text-xs font-semibold',
          todo.overdue
            ? 'bg-destructive/20 text-destructive'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {todo.overdue
          ? `${Math.abs(todo.daysUntilDue)}d overdue`
          : format(new Date(todo.dueDate), 'MMM d')}
      </span>
    </div>
  )
}
