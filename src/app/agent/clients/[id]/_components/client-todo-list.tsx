'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Upload, ListTodo } from 'lucide-react'
import { ToDoCard } from './todo-card'
import { ToDoStatus, PlatformType } from '@/types'
import { cn } from '@/lib/utils'

interface Todo {
  id: string
  title: string
  description: string | null
  status: ToDoStatus
  dueDate: Date | null
  platformType: PlatformType | null
  stepNumber: number | null
  extensionsUsed: number
  maxExtensions: number
  createdAt: Date
}

interface ClientTodoListProps {
  toDos: Todo[]
}

type UrgencyLevel = 'overdue' | 'due_soon' | 'normal'
type FilterType = 'all' | UrgencyLevel

function getUrgencyLevel(
  dueDate: Date | null,
  status: ToDoStatus,
): UrgencyLevel {
  if (status === ToDoStatus.OVERDUE) return 'overdue'
  if (!dueDate) return 'normal'

  const now = new Date()
  const due = new Date(dueDate)
  const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursUntilDue < 0) return 'overdue'
  if (hoursUntilDue <= 24) return 'due_soon'
  return 'normal'
}

export function ClientTodoList({ toDos }: ClientTodoListProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterType>('all')

  // Add default values for new fields if not present
  const normalizedTodos = toDos.map((todo) => ({
    ...todo,
    platformType:
      (todo as Todo & { platformType?: PlatformType | null }).platformType ||
      null,
    stepNumber:
      (todo as Todo & { stepNumber?: number | null }).stepNumber || null,
    extensionsUsed:
      (todo as Todo & { extensionsUsed?: number }).extensionsUsed || 0,
    maxExtensions:
      (todo as Todo & { maxExtensions?: number }).maxExtensions || 3,
  }))

  // Sort by urgency: Overdue -> Due <=24h -> Normal
  const sortedTodos = [...normalizedTodos].sort((a, b) => {
    const urgencyA = getUrgencyLevel(a.dueDate, a.status)
    const urgencyB = getUrgencyLevel(b.dueDate, b.status)
    const urgencyOrder = { overdue: 0, due_soon: 1, normal: 2 }
    return urgencyOrder[urgencyA] - urgencyOrder[urgencyB]
  })

  // Filter todos
  const filteredTodos =
    filter === 'all'
      ? sortedTodos
      : sortedTodos.filter(
          (t) => getUrgencyLevel(t.dueDate, t.status) === filter,
        )

  // Count by urgency
  const overdueCount = sortedTodos.filter(
    (t) => getUrgencyLevel(t.dueDate, t.status) === 'overdue',
  ).length
  const dueSoonCount = sortedTodos.filter(
    (t) => getUrgencyLevel(t.dueDate, t.status) === 'due_soon',
  ).length
  const normalCount = sortedTodos.length - overdueCount - dueSoonCount
  const completedCount = toDos.filter(
    (t) => t.status === ToDoStatus.COMPLETED,
  ).length

  const handleUpdate = () => {
    router.refresh()
  }

  return (
    <Card className="flex h-full flex-col border-border/50 bg-card/80">
      <CardHeader className="px-3 pb-2 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Upload className="h-3.5 w-3.5" />
            Uploads & To-Dos
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <Badge
              variant="outline"
              className="h-5 px-1.5 font-mono text-[10px] text-success border-success/30"
            >
              {completedCount} done
            </Badge>
            {overdueCount > 0 && (
              <Badge
                variant="outline"
                className="h-5 px-1.5 font-mono text-[10px] text-destructive border-destructive/30"
              >
                {overdueCount} overdue
              </Badge>
            )}
            <Badge
              variant="outline"
              className="h-5 px-1.5 font-mono text-[10px]"
            >
              {sortedTodos.length} total
            </Badge>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="mt-2 flex items-center gap-1.5">
          {[
            {
              key: 'overdue' as FilterType,
              label: 'Overdue',
              count: overdueCount,
              color: 'destructive',
            },
            {
              key: 'due_soon' as FilterType,
              label: 'Due Soon',
              count: dueSoonCount,
              color: 'warning',
            },
            {
              key: 'normal' as FilterType,
              label: 'Normal',
              count: normalCount,
              color: 'muted-foreground',
            },
          ].map(({ key, label, count, color }) => (
            <button
              key={key}
              onClick={() => setFilter(filter === key ? 'all' : key)}
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all',
                filter === key
                  ? `bg-${color}/20 text-${color} ring-1 ring-${color}/30`
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  color === 'destructive' && 'bg-destructive',
                  color === 'warning' && 'bg-warning',
                  color === 'muted-foreground' && 'bg-muted-foreground',
                )}
              />
              {label}
              {count > 0 && <span>({count})</span>}
            </button>
          ))}
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="ml-1 text-[10px] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 p-2.5 pt-0">
        {filteredTodos.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <ListTodo className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">
              {filter === 'all'
                ? 'No pending to-dos'
                : `No ${filter.replace('_', ' ')} to-dos`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTodos.map((todo) => (
              <ToDoCard key={todo.id} todo={todo} onUpdate={handleUpdate} />
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="mt-3 border-t border-border/30 pt-3 text-center text-[10px] italic text-muted-foreground">
          System-generated only
        </p>
      </CardContent>
    </Card>
  )
}
