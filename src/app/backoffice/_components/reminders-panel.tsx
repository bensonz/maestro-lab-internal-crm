import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Reminder {
  message: string
  timeLabel: string
  isOverdue: boolean
}

interface RemindersPanelProps {
  reminders: Reminder[]
}

export function RemindersPanel({ reminders }: RemindersPanelProps) {
  return (
    <Card className="card-terminal" data-testid="reminders-panel">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          <Bell className="h-4 w-4" />
          Reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reminders.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground">
            No reminders
          </p>
        ) : (
          reminders.map((reminder, idx) => (
            <div
              key={idx}
              className={cn(
                'rounded-lg border p-3',
                reminder.isOverdue
                  ? 'border-destructive/30 bg-destructive/5'
                  : 'border-border bg-muted/20',
              )}
            >
              <p className="text-sm">{reminder.message}</p>
              <p
                className={cn(
                  'mt-1 font-mono text-xs',
                  reminder.isOverdue
                    ? 'text-destructive'
                    : 'text-muted-foreground',
                )}
              >
                {reminder.timeLabel}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
