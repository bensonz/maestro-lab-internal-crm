import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, ArrowRight } from 'lucide-react'

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
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm h-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <FileText className="h-4 w-4" />
          Today&apos;s Priority Tasks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No priority tasks for today
          </p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-4 rounded-xl bg-muted/30 ring-1 ring-border/30 transition-colors hover:bg-muted/50"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{task.title}</span>
                  {task.isUrgent && (
                    <Badge className="bg-accent/20 text-accent border-accent/30 text-xs font-medium">
                      URGENT
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{task.type}</span>
                  {task.clientName && (
                    <>
                      <span className="text-muted-foreground/50">•</span>
                      {task.clientId ? (
                        <Link
                          href={`/backoffice/clients/${task.clientId}`}
                          className="text-primary hover:underline"
                        >
                          {task.clientName}
                        </Link>
                      ) : (
                        <span className="text-primary">{task.clientName}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                asChild
              >
                <Link
                  href={
                    task.clientId
                      ? `/backoffice/clients/${task.clientId}`
                      : '/backoffice/fund-allocation'
                  }
                >
                  Review
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
