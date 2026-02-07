import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    <Card className="card-terminal" data-testid="recent-activity">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No recent activity
          </p>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between border-b border-border py-2 last:border-0"
            >
              <div>
                <p className="text-sm">{activity.title}</p>
                <p className="text-xs text-muted-foreground">
                  {activity.subtitle}
                </p>
              </div>
              <span className="ml-4 whitespace-nowrap font-mono text-xs text-muted-foreground">
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
