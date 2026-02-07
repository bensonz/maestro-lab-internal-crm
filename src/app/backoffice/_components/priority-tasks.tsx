import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PriorityTask {
  id: string
  title: string
  type: string
  clientId: string | null
  clientName: string | null
  isUrgent: boolean
}

interface PriorityTasksProps {
  tasks: PriorityTask[]
}

export function PriorityTasks({ tasks }: PriorityTasksProps) {
  return (
    <Card className="card-terminal lg:col-span-2" data-testid="priority-tasks">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          <FileCheck className="h-4 w-4" />
          Today&apos;s Priority Tasks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No priority tasks for today
          </p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                'flex items-center justify-between rounded-lg border p-3 transition-all hover:bg-muted/30',
                task.isUrgent
                  ? 'border-warning/30 bg-warning/5'
                  : 'border-border',
              )}
              data-testid={`task-${task.id}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {task.title}
                  </span>
                  {task.isUrgent && (
                    <span className="rounded bg-warning/20 px-1.5 py-0.5 font-mono text-[10px] uppercase text-warning">
                      Urgent
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {task.type}
                  </span>
                  {task.clientName && (
                    <>
                      <span className="text-muted-foreground">&bull;</span>
                      <span className="text-xs text-primary">
                        {task.clientName}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                asChild
              >
                <Link
                  href={
                    task.clientId
                      ? `/backoffice/client-management/${task.clientId}`
                      : '/backoffice/fund-allocation'
                  }
                >
                  Review &rarr;
                </Link>
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
