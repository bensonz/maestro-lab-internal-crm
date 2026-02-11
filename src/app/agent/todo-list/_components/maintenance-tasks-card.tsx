'use client'

import { AlertTriangle, Clock, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface MaintenanceTask {
  id: string
  clientName: string
  taskDescription: string
  remainingHours: number
  urgency: 'critical' | 'warning' | 'normal'
  earlyBonus: number
  streakImpact: string
}

interface MaintenanceTasksCardProps {
  tasks: MaintenanceTask[]
  earlyCompletionBonus: number
  onProcess: (taskId: string) => void
  onExtend: (taskId: string) => void
}

function getUrgencyStyles(urgency: MaintenanceTask['urgency']) {
  switch (urgency) {
    case 'critical':
      return {
        border: 'border-destructive/30',
        bg: 'bg-destructive/5',
        badge: 'border-destructive/30 bg-destructive/10 text-destructive',
        label: 'Critical',
      }
    case 'warning':
      return {
        border: 'border-warning/30',
        bg: 'bg-warning/5',
        badge: 'border-warning/30 bg-warning/10 text-warning',
        label: 'Warning',
      }
    default:
      return {
        border: 'border-border/40',
        bg: 'bg-muted/10',
        badge: 'border-border/50 bg-muted/20 text-muted-foreground',
        label: 'Normal',
      }
  }
}

function formatRemainingTime(hours: number): string {
  if (hours < 0) {
    const abs = Math.abs(hours)
    if (abs >= 24) return `${Math.floor(abs / 24)}d overdue`
    return `${Math.round(abs)}h overdue`
  }
  if (hours >= 24) return `${Math.floor(hours / 24)}d left`
  return `${Math.round(hours)}h left`
}

export function MaintenanceTasksCard({
  tasks,
  earlyCompletionBonus,
  onProcess,
  onExtend,
}: MaintenanceTasksCardProps) {
  const sortedTasks = [...tasks].sort((a, b) => {
    const urgencyOrder = { critical: 0, warning: 1, normal: 2 }
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
  })

  return (
    <div
      className="rounded-lg border border-border bg-card p-5"
      data-testid="maintenance-tasks-card"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Maintenance Tasks
          </h3>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            Active tasks sorted by urgency
          </p>
        </div>
        {earlyCompletionBonus > 0 && (
          <Badge
            variant="outline"
            className="border-success/30 bg-success/10 text-[10px] text-success"
          >
            +${earlyCompletionBonus} early bonus
          </Badge>
        )}
      </div>

      {/* Task list */}
      {sortedTasks.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/50 py-8 text-center">
          <p className="text-xs text-muted-foreground">No pending maintenance tasks</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedTasks.map((task) => {
            const styles = getUrgencyStyles(task.urgency)

            return (
              <div
                key={task.id}
                className={cn('rounded-md border p-3', styles.border, styles.bg)}
                data-testid={`maintenance-task-${task.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-medium text-foreground">
                        {task.clientName}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn('shrink-0 px-1.5 py-0 text-[9px]', styles.badge)}
                      >
                        {task.urgency === 'critical' && (
                          <AlertTriangle className="mr-0.5 h-2.5 w-2.5" />
                        )}
                        {styles.label}
                      </Badge>
                    </div>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {task.taskDescription}
                    </p>
                  </div>

                  <div className="ml-3 flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                      onClick={() => onExtend(task.id)}
                      data-testid={`extend-task-${task.id}`}
                    >
                      <Timer className="mr-0.5 h-3 w-3" />
                      +3d
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => onProcess(task.id)}
                      data-testid={`process-task-${task.id}`}
                    >
                      Process
                    </Button>
                  </div>
                </div>

                {/* Footer info */}
                <div className="mt-2 flex items-center gap-3 text-[10px]">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span className={cn(
                      'font-mono',
                      task.remainingHours < 0 ? 'text-destructive' : '',
                    )}>
                      {formatRemainingTime(task.remainingHours)}
                    </span>
                  </div>
                  {task.earlyBonus > 0 && (
                    <span className="font-mono text-success">
                      +${task.earlyBonus} early
                    </span>
                  )}
                  {task.streakImpact && (
                    <span className="text-muted-foreground">
                      {task.streakImpact}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
