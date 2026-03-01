'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
    <Card id="pending-todos" data-testid="pending-todos-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Pending Todos</CardTitle>
          {todos.length > 0 && (
            <Badge
              variant={overdue.length > 0 ? 'destructive' : 'secondary'}
              className="ml-auto text-[10px]"
            >
              {todos.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {todos.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No pending todos
          </p>
        ) : (
          <div className="space-y-1">
            {/* Overdue items first */}
            {overdue.map((todo) => (
              <TodoRow key={todo.id} todo={todo} />
            ))}
            {/* Upcoming items */}
            {upcoming.map((todo) => (
              <TodoRow key={todo.id} todo={todo} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TodoRow({ todo }: { todo: ActionHubTodo }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md border px-3 py-2',
        todo.overdue
          ? 'border-destructive/20 bg-destructive/5'
          : 'border-border',
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
          <span className="text-sm font-medium truncate">
            {todo.issueCategory}
          </span>
          {todo.source === 'EMAIL_AUTO' && (
            <Mail className="h-3 w-3 shrink-0 text-primary" />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {todo.clientName} — {todo.agentName}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <Badge
          variant={todo.overdue ? 'destructive' : 'secondary'}
          className="text-[10px]"
        >
          {todo.overdue
            ? `${Math.abs(todo.daysUntilDue)}d overdue`
            : `Due ${format(new Date(todo.dueDate), 'MMM d')}`}
        </Badge>
      </div>
    </div>
  )
}
