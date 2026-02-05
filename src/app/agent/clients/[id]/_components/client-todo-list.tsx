'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ListTodo,
  Clock,
  AlertCircle,
  Upload,
  CalendarClock,
  ChevronRight,
} from 'lucide-react'
import { ToDoType, ToDoStatus } from '@/types'

interface Todo {
  id: string
  title: string
  description: string | null
  type: ToDoType
  status: ToDoStatus
  priority: number
  dueDate: Date | null
  metadata: unknown
  createdAt: Date
}

interface ClientTodoListProps {
  toDos: Todo[]
}

type UrgencyLevel = 'overdue' | 'due_soon' | 'normal'

function getUrgencyLevel(dueDate: Date | null, status: ToDoStatus): UrgencyLevel {
  if (status === ToDoStatus.OVERDUE) return 'overdue'
  if (!dueDate) return 'normal'

  const now = new Date()
  const due = new Date(dueDate)
  const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursUntilDue < 0) return 'overdue'
  if (hoursUntilDue <= 24) return 'due_soon'
  return 'normal'
}

function getUrgencyColor(urgency: UrgencyLevel) {
  switch (urgency) {
    case 'overdue':
      return 'border-destructive/50 bg-destructive/5'
    case 'due_soon':
      return 'border-accent/50 bg-accent/5'
    default:
      return 'border-border/50 bg-card/50'
  }
}

function getUrgencyBadge(urgency: UrgencyLevel) {
  switch (urgency) {
    case 'overdue':
      return (
        <Badge className="bg-destructive/20 text-destructive text-xs rounded-md">
          <AlertCircle className="h-3 w-3 mr-1" />
          Overdue
        </Badge>
      )
    case 'due_soon':
      return (
        <Badge className="bg-accent/20 text-accent text-xs rounded-md">
          <Clock className="h-3 w-3 mr-1" />
          Due ≤24h
        </Badge>
      )
    default:
      return (
        <Badge className="bg-muted text-muted-foreground text-xs rounded-md">
          Normal
        </Badge>
      )
  }
}

function formatDueDate(date: Date | null): string {
  if (!date) return 'No deadline'
  const d = new Date(date)
  const now = new Date()
  const diffHours = (d.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (diffHours < 0) {
    const overdueDays = Math.ceil(Math.abs(diffHours) / 24)
    return `Overdue by ${overdueDays} day${overdueDays > 1 ? 's' : ''}`
  }
  if (diffHours < 24) {
    return `Due in ${Math.ceil(diffHours)} hour${Math.ceil(diffHours) !== 1 ? 's' : ''}`
  }
  const days = Math.ceil(diffHours / 24)
  return `Due in ${days} day${days > 1 ? 's' : ''}`
}

function getTypeIcon(type: ToDoType) {
  switch (type) {
    case ToDoType.UPLOAD_SCREENSHOT:
      return <Upload className="h-4 w-4" />
    case ToDoType.VERIFICATION:
      return <AlertCircle className="h-4 w-4" />
    default:
      return <ListTodo className="h-4 w-4" />
  }
}

function getStepFromType(type: ToDoType): string {
  switch (type) {
    case ToDoType.VERIFICATION:
      return 'Step 2'
    case ToDoType.UPLOAD_SCREENSHOT:
    case ToDoType.EXECUTION:
      return 'Step 3'
    case ToDoType.PAYMENT:
      return 'Step 4'
    case ToDoType.PHONE_RETURN:
    case ToDoType.PHONE_SIGNOUT:
      return 'Step 5'
    default:
      return ''
  }
}

export function ClientTodoList({ toDos }: ClientTodoListProps) {
  // Sort by urgency: Overdue → Due ≤24h → Normal
  const sortedTodos = [...toDos].sort((a, b) => {
    const urgencyA = getUrgencyLevel(a.dueDate, a.status)
    const urgencyB = getUrgencyLevel(b.dueDate, b.status)
    const urgencyOrder = { overdue: 0, due_soon: 1, normal: 2 }
    return urgencyOrder[urgencyA] - urgencyOrder[urgencyB]
  })

  const overdueCount = sortedTodos.filter(
    (t) => getUrgencyLevel(t.dueDate, t.status) === 'overdue'
  ).length
  const dueSoonCount = sortedTodos.filter(
    (t) => getUrgencyLevel(t.dueDate, t.status) === 'due_soon'
  ).length

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Auto-Generated To-Dos</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {overdueCount > 0 && (
              <Badge className="bg-destructive/20 text-destructive text-xs rounded-full px-2">
                {overdueCount} Overdue
              </Badge>
            )}
            {dueSoonCount > 0 && (
              <Badge className="bg-accent/20 text-accent text-xs rounded-full px-2">
                {dueSoonCount} Due ≤24h
              </Badge>
            )}
            <Badge className="bg-muted text-muted-foreground text-xs rounded-full px-2">
              {sortedTodos.length - overdueCount - dueSoonCount} Normal
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedTodos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No pending to-dos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTodos.map((todo) => {
              const urgency = getUrgencyLevel(todo.dueDate, todo.status)
              const step = getStepFromType(todo.type)

              return (
                <div
                  key={todo.id}
                  className={`group rounded-lg p-4 ring-1 transition-all hover:ring-primary/30 ${getUrgencyColor(
                    urgency
                  )}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          urgency === 'overdue'
                            ? 'bg-destructive/20 text-destructive'
                            : urgency === 'due_soon'
                            ? 'bg-accent/20 text-accent'
                            : 'bg-muted/50 text-muted-foreground'
                        }`}
                      >
                        {getTypeIcon(todo.type)}
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-foreground">{todo.title}</h4>
                        {todo.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {todo.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarClock className="h-3 w-3" />
                            {formatDueDate(todo.dueDate)}
                          </span>
                          {step && (
                            <>
                              <span className="text-muted-foreground/50">•</span>
                              <span className="flex items-center gap-1 text-xs text-primary">
                                <ChevronRight className="h-3 w-3" />
                                {step}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getUrgencyBadge(urgency)}
                    </div>
                  </div>

                  {/* Action Buttons - Show on hover */}
                  <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs flex-1"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Upload
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                    >
                      <CalendarClock className="h-3 w-3 mr-1" />
                      Request Extension
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
