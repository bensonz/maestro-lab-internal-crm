import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Activity {
  id: string
  title: string
  subtitle: string
  timestamp: Date
}

interface RecentActivityProps {
  activities: Activity[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm h-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Clock className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No recent activity
          </p>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start justify-between p-3 rounded-xl bg-muted/30 ring-1 ring-border/30 transition-colors hover:bg-muted/50"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  {activity.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activity.subtitle}
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                {formatDistanceToNow(new Date(activity.timestamp), {
                  addSuffix: true,
                })}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
