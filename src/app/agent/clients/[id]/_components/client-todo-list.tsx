'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, ListTodo } from 'lucide-react'
import { ToDoCard } from './todo-card'
import { ToDoStatus, PlatformType } from '@/types'

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

export function ClientTodoList({ toDos }: ClientTodoListProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterType>('all')

  // Add default values for new fields if not present
  const normalizedTodos = toDos.map((todo) => ({
    ...todo,
    platformType: (todo as Todo & { platformType?: PlatformType | null }).platformType || null,
    stepNumber: (todo as Todo & { stepNumber?: number | null }).stepNumber || null,
    extensionsUsed: (todo as Todo & { extensionsUsed?: number }).extensionsUsed || 0,
    maxExtensions: (todo as Todo & { maxExtensions?: number }).maxExtensions || 3,
  }))

  // Sort by urgency: Overdue → Due ≤24h → Normal
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
      : sortedTodos.filter((t) => getUrgencyLevel(t.dueDate, t.status) === filter)

  // Count by urgency
  const overdueCount = sortedTodos.filter(
    (t) => getUrgencyLevel(t.dueDate, t.status) === 'overdue'
  ).length
  const dueSoonCount = sortedTodos.filter(
    (t) => getUrgencyLevel(t.dueDate, t.status) === 'due_soon'
  ).length
  const normalCount = sortedTodos.length - overdueCount - dueSoonCount

  const handleUpdate = () => {
    router.refresh()
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-semibold uppercase tracking-wide">
            Auto-Generated To-Dos
          </CardTitle>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 pt-3">
          <button
            onClick={() => setFilter('overdue')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              filter === 'overdue'
                ? 'bg-destructive/20 text-destructive ring-1 ring-destructive/30'
                : 'bg-muted/50 text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-destructive" />
            Overdue
            {overdueCount > 0 && <span>({overdueCount})</span>}
          </button>
          <button
            onClick={() => setFilter('due_soon')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              filter === 'due_soon'
                ? 'bg-accent/20 text-accent ring-1 ring-accent/30'
                : 'bg-muted/50 text-muted-foreground hover:bg-accent/10 hover:text-accent'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-accent" />
            Due ≤24h
            {dueSoonCount > 0 && <span>({dueSoonCount})</span>}
          </button>
          <button
            onClick={() => setFilter('normal')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              filter === 'normal'
                ? 'bg-muted text-foreground ring-1 ring-border'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-muted-foreground" />
            Normal
            {normalCount > 0 && <span>({normalCount})</span>}
          </button>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="text-xs text-muted-foreground hover:text-foreground ml-2"
            >
              Clear filter
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {filteredTodos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {filter === 'all' ? 'No pending to-dos' : `No ${filter.replace('_', ' ')} to-dos`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTodos.map((todo) => (
              <ToDoCard key={todo.id} todo={todo} onUpdate={handleUpdate} />
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center mt-4 pt-4 border-t border-border/30 italic">
          System-generated only • Hover ⓘ for detailed instructions
        </p>
      </CardContent>
    </Card>
  )
}
