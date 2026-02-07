import { Clock, CheckCircle2, AlertTriangle, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface OverviewStatsProps {
  pendingReviews: number
  approvedToday: number
  urgentActions: number
  activeClients: number
}

const metrics = [
  { key: 'pendingReviews', label: 'Pending Reviews', icon: Clock, variant: 'warning' },
  { key: 'approvedToday', label: 'Approved Today', icon: CheckCircle2, variant: 'success' },
  { key: 'urgentActions', label: 'Urgent Actions', icon: AlertTriangle, variant: 'destructive' },
  { key: 'activeClients', label: 'Active Clients', icon: Users, variant: 'primary' },
] as const

export function OverviewStats({
  pendingReviews,
  approvedToday,
  urgentActions,
  activeClients,
}: OverviewStatsProps) {
  const values: Record<string, number> = {
    pendingReviews,
    approvedToday,
    urgentActions,
    activeClients,
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon
        return (
          <Card
            key={metric.key}
            className="card-terminal"
            data-testid={`stat-${metric.key}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className="mt-1 text-3xl font-mono font-semibold">
                    {values[metric.key]}
                  </p>
                </div>
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-lg',
                    metric.variant === 'warning' && 'bg-warning/20',
                    metric.variant === 'success' && 'bg-success/20',
                    metric.variant === 'destructive' && 'bg-destructive/20',
                    metric.variant === 'primary' && 'bg-primary/20',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-6 w-6',
                      metric.variant === 'warning' && 'text-warning',
                      metric.variant === 'success' && 'text-success',
                      metric.variant === 'destructive' && 'text-destructive',
                      metric.variant === 'primary' && 'text-primary',
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
