'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import {
  Search,
  Plus,
  CheckCircle2,
  DollarSign,
  MessageSquare,
  UserCog,
  ClipboardList,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { completeTodoAsBackoffice, createBackofficeTodo } from '@/lib/mock-actions'
import { toast } from 'sonner'
import type { EnhancedAgentTasks, ActiveAgent, EnhancedTask } from './types'

interface AgentTaskOverviewProps {
  agentTasks: EnhancedAgentTasks[]
  activeAgents: ActiveAgent[]
}

type TypeFilter = 'all' | 'transaction' | 'sales' | 'manager' | 'other'

const typeConfig: Record<
  string,
  { label: string; icon: typeof DollarSign; color: string }
> = {
  transaction: { label: 'Transaction', icon: DollarSign, color: 'text-success' },
  sales: { label: 'Sales', icon: MessageSquare, color: 'text-primary' },
  manager: { label: 'Manager', icon: UserCog, color: 'text-warning' },
  other: { label: 'Other', icon: ClipboardList, color: 'text-muted-foreground' },
}

function getDueColor(dueIn: string, overdue: boolean) {
  if (overdue) return 'bg-destructive/20 text-destructive'
  const match = dueIn.match(/(\d+)/)
  if (!match) return 'bg-muted text-muted-foreground'
  const num = parseInt(match[1])
  if (dueIn.includes('h') && num < 12) return 'bg-destructive/20 text-destructive'
  if (dueIn.includes('h') && num < 24) return 'bg-warning/20 text-warning'
  if (dueIn.includes('d') && num <= 3) return 'bg-primary/20 text-primary'
  return 'bg-muted text-muted-foreground'
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function TaskRow({
  task,
  onComplete,
}: {
  task: EnhancedTask
  onComplete: (id: string) => void
}) {
  const [completing, setCompleting] = useState(false)
  const config = typeConfig[task.category]
  const TypeIcon = config?.icon || ClipboardList
  const typeColor = config?.color || 'text-muted-foreground'

  async function handleComplete() {
    setCompleting(true)
    try {
      const result = await completeTodoAsBackoffice(task.id)
      if (result.success) {
        toast.success(`Task completed: ${task.title}`)
        onComplete(task.id)
      } else {
        toast.error(result.error || 'Failed to complete task')
      }
    } catch {
      toast.error('Failed to complete task')
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between p-2.5 transition-colors hover:bg-muted/30',
        task.overdue && 'border-l-2 border-l-destructive',
      )}
      data-testid={`task-row-${task.id}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <TypeIcon className={cn('h-4 w-4 flex-shrink-0', typeColor)} />
        <div className="min-w-0 flex-1">
          <span className="truncate text-sm font-medium">{task.title}</span>
          <p className="truncate text-[11px] text-muted-foreground">
            {task.client}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          className={cn(
            'flex-shrink-0 font-mono text-[10px]',
            getDueColor(task.dueIn, task.overdue),
          )}
        >
          {task.overdue ? `${task.dueIn} overdue` : task.dueIn}
        </Badge>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={handleComplete}
          disabled={completing}
          data-testid={`complete-task-${task.id}`}
        >
          {completing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  )
}

function CreateTodoDialog({ activeAgents }: { activeAgents: ActiveAgent[] }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [agentId, setAgentId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('0')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function resetForm() {
    setTitle('')
    setDescription('')
    setAgentId('')
    setDueDate('')
    setPriority('0')
    setErrors({})
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = 'Title is required'
    if (!agentId) newErrors.agentId = 'Agent is required'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    setErrors({})
    try {
      const result = await createBackofficeTodo({
        title: title.trim(),
        description: description.trim() || undefined,
        agentId,
        dueDate: dueDate || undefined,
        priority: parseInt(priority),
      })
      if (result.success) {
        toast.success('Task created successfully')
        resetForm()
        setOpen(false)
      } else {
        toast.error(result.error || 'Failed to create task')
        if (result.error) setErrors({ submit: result.error })
      }
    } catch {
      toast.error('Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="create-task-btn">
          <Plus className="mr-1 h-4 w-4" />
          Create Task
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="create-task-dialog">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="task-title">Title</FieldLabel>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title..."
              data-testid="task-title-input"
            />
            {errors.title && <FieldError>{errors.title}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor="task-description">Description</FieldLabel>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              className="h-20 resize-none"
              data-testid="task-description-input"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="task-agent">Assign to Agent</FieldLabel>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger id="task-agent" data-testid="task-agent-select">
                <SelectValue placeholder="Select agent..." />
              </SelectTrigger>
              <SelectContent>
                {activeAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.agentId && <FieldError>{errors.agentId}</FieldError>}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="task-due-date">Due Date</FieldLabel>
              <Input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                data-testid="task-due-date-input"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="task-priority">Priority</FieldLabel>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="task-priority" data-testid="task-priority-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Normal</SelectItem>
                  <SelectItem value="1">High</SelectItem>
                  <SelectItem value="2">Critical</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          {errors.submit && <FieldError>{errors.submit}</FieldError>}

          <DialogFooter>
            <Button type="submit" disabled={loading} data-testid="task-submit-btn">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AgentTaskOverview({
  agentTasks: initialTasks,
  activeAgents,
}: AgentTaskOverviewProps) {
  const [agentTasks, setAgentTasks] = useState(initialTasks)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  function handleTaskComplete(taskId: string) {
    setAgentTasks((prev) =>
      prev
        .map((agent) => ({
          ...agent,
          tasks: agent.tasks.filter((t) => t.id !== taskId),
        }))
        .filter((agent) => agent.tasks.length > 0),
    )
  }

  const filteredAgentTasks = agentTasks
    .map((agent) => ({
      ...agent,
      tasks: agent.tasks.filter((task) => {
        const matchesSearch =
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
          agent.agentName.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType = typeFilter === 'all' || task.category === typeFilter
        return matchesSearch && matchesType
      }),
    }))
    .filter((agent) => agent.tasks.length > 0)

  return (
    <Card data-testid="agent-task-overview">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <ClipboardList className="h-4 w-4 text-primary" />
          Agent Tasks
          <Badge variant="secondary" className="ml-1 text-xs">
            {agentTasks.reduce((s, a) => s + a.tasks.length, 0)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tasks, clients, or agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="task-search-input"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as TypeFilter)}
          >
            <SelectTrigger className="w-40" data-testid="task-type-filter">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="transaction">Transaction</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <CreateTodoDialog activeAgents={activeAgents} />
        </div>

        {/* Agent Groups */}
        <div className="space-y-3">
          {filteredAgentTasks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-md border px-4 py-8">
              <CheckCircle2 className="h-10 w-10 text-success" />
              <p className="text-sm text-muted-foreground">
                {agentTasks.length === 0
                  ? 'No tasks assigned'
                  : 'No tasks match your filters'}
              </p>
            </div>
          ) : (
            filteredAgentTasks.map((agent) => (
              <div
                key={agent.agentId}
                className="rounded-md border"
                data-testid={`agent-group-${agent.agentId}`}
              >
                <div className="flex items-center gap-2 border-b px-3 py-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
                    <span className="text-[10px] font-medium text-primary">
                      {getInitials(agent.agentName)}
                    </span>
                  </div>
                  <span className="text-sm font-medium">
                    {agent.agentName}
                  </span>
                  <Badge variant="outline" className="ml-auto text-[10px]">
                    {agent.tasks.length}
                  </Badge>
                </div>
                <div className="divide-y divide-border">
                  {agent.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onComplete={handleTaskComplete}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
