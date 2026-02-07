import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell } from 'lucide-react'

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
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Bell className="h-4 w-4" />
          Reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reminders.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No reminders</p>
        ) : (
          reminders.map((reminder, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl ring-1 transition-colors ${
                reminder.isOverdue
                  ? 'bg-destructive/10 ring-destructive/30'
                  : 'bg-muted/30 ring-border/30 hover:bg-muted/50'
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  reminder.isOverdue ? 'text-foreground' : 'text-foreground'
                }`}
              >
                {reminder.message}
              </p>
              <p
                className={`text-xs mt-1 ${
                  reminder.isOverdue
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                }`}
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
