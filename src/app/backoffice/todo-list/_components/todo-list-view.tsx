'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  DollarSign,
  MessageSquare,
  UserCog,
  ClipboardList,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Task {
  id: string
  title: string
  client: string
  category: string
  dueIn: string
  overdue: boolean
}

interface AgentTasks {
  agentId: string
  agentName: string
  tasks: Task[]
}

interface TodoListViewProps {
  agentTasks: AgentTasks[]
}

type TimeFilter = '1day' | '3days' | '7days' | 'all'
type TypeFilter = 'all' | 'transaction' | 'sales' | 'manager' | 'other'

const typeConfig: Record<
  string,
  {
    label: string
    icon: typeof DollarSign
    color: string
  }
> = {
  transaction: {
    label: 'Transaction',
    icon: DollarSign,
    color: 'text-success',
  },
  sales: {
    label: 'Sales Interaction',
    icon: MessageSquare,
    color: 'text-primary',
  },
  manager: {
    label: 'Manager Assigned',
    icon: UserCog,
    color: 'text-warning',
  },
  other: {
    label: 'Other',
    icon: ClipboardList,
    color: 'text-muted-foreground',
  },
}

const timeFilters: { value: TimeFilter; label: string }[] = [
  { value: '1day', label: '1 day' },
  { value: '3days', label: '3 days' },
  { value: '7days', label: '7 days' },
  { value: 'all', label: 'all' },
]

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function getDueColor(dueIn: string, overdue: boolean) {
  if (overdue) return 'bg-destructive/20 text-destructive'
  // Parse hours from dueIn string
  const match = dueIn.match(/(\d+)/)
  if (!match) return 'bg-muted text-muted-foreground'
  const num = parseInt(match[1])
  if (dueIn.includes('h') && num < 12) return 'bg-destructive/20 text-destructive'
  if (dueIn.includes('h') && num < 24) return 'bg-warning/20 text-warning'
  if (dueIn.includes('d') && num <= 3) return 'bg-primary/20 text-primary'
  return 'bg-muted text-muted-foreground'
}

export function TodoListView({ agentTasks }: TodoListViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('1day')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const filteredAgentTasks = agentTasks
    .map((agent) => ({
      ...agent,
      tasks: agent.tasks.filter((task) => {
        const matchesSearch =
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
          agent.agentName.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType =
          typeFilter === 'all' || task.category === typeFilter
        return matchesSearch && matchesType
      }),
    }))
    .filter((agent) => agent.tasks.length > 0)

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks, clients, or agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="todo-search-input"
          />
        </div>

        {/* Time filter pills */}
        <div className="flex items-center gap-1">
          {timeFilters.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeFilter(tf.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                timeFilter === tf.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 hover:bg-muted',
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as TypeFilter)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="transaction">Transaction</SelectItem>
            <SelectItem value="sales">Sales Interaction</SelectItem>
            <SelectItem value="manager">Manager Assigned</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Agent Task Groups */}
      <div className="space-y-4">
        {filteredAgentTasks.length === 0 ? (
          <Card className="card-terminal">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-success" />
              <p className="text-muted-foreground">
                {agentTasks.length === 0
                  ? 'No tasks assigned'
                  : 'No tasks match your filters'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAgentTasks.map((agent) => (
            <Card key={agent.agentId} className="card-terminal">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
                    <span className="text-[10px] font-medium text-primary">
                      {getInitials(agent.agentName)}
                    </span>
                  </div>
                  Agent: {agent.agentName} ({agent.agentId})
                  <Badge variant="outline" className="ml-auto text-xs">
                    {agent.tasks.length} tasks
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {agent.tasks.map((task) => {
                    const config = typeConfig[task.category]
                    const TypeIcon = config?.icon || ClipboardList
                    const typeColor =
                      config?.color || 'text-muted-foreground'

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          'flex items-center justify-between p-2.5 transition-colors hover:bg-muted/30',
                          task.overdue && 'border-l-2 border-l-destructive',
                        )}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <TypeIcon
                            className={cn(
                              'h-4 w-4 flex-shrink-0',
                              typeColor,
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium truncate">
                              {task.title}
                            </span>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {task.client}
                            </p>
                          </div>
                        </div>
                        <Badge
                          className={cn(
                            'flex-shrink-0 font-mono text-[10px]',
                            getDueColor(task.dueIn, task.overdue),
                          )}
                        >
                          {task.overdue
                            ? `${task.dueIn} overdue`
                            : task.dueIn}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  )
}
