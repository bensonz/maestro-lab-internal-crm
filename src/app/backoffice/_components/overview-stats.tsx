import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle, AlertTriangle, Users } from 'lucide-react'

interface OverviewStatsProps {
  pendingReviews: number
  approvedToday: number
  urgentActions: number
  activeClients: number
  pendingExtensions: number
  delayedClients: number
}

export function OverviewStats({
  pendingReviews,
  approvedToday,
  urgentActions,
  activeClients,
  pendingExtensions,
  delayedClients,
}: OverviewStatsProps) {
  const stats = [
    {
      label: 'PENDING REVIEWS',
      value: pendingReviews,
      icon: Clock,
      iconBg: 'bg-accent/10',
      iconRing: 'ring-accent/20',
      iconColor: 'text-accent',
      hoverBorder: 'hover:border-accent/40',
      hoverShadow: 'hover:shadow-accent/10',
      badge: null as string | null,
    },
    {
      label: 'APPROVED TODAY',
      value: approvedToday,
      icon: CheckCircle,
      iconBg: 'bg-chart-4/10',
      iconRing: 'ring-chart-4/20',
      iconColor: 'text-chart-4',
      hoverBorder: 'hover:border-chart-4/40',
      hoverShadow: 'hover:shadow-chart-4/10',
      badge: null as string | null,
    },
    {
      label: 'URGENT ACTIONS',
      value: urgentActions,
      icon: AlertTriangle,
      iconBg: 'bg-destructive/10',
      iconRing: 'ring-destructive/20',
      iconColor: 'text-destructive',
      hoverBorder: 'hover:border-destructive/40',
      hoverShadow: 'hover:shadow-destructive/10',
      badge:
        [
          pendingExtensions > 0
            ? `${pendingExtensions} extension${pendingExtensions !== 1 ? 's' : ''}`
            : null,
          delayedClients > 0 ? `${delayedClients} delayed` : null,
        ]
          .filter(Boolean)
          .join(' • ') || null,
    },
    {
      label: 'ACTIVE CLIENTS',
      value: activeClients,
      icon: Users,
      iconBg: 'bg-primary/10',
      iconRing: 'ring-primary/20',
      iconColor: 'text-primary',
      hoverBorder: 'hover:border-primary/40',
      hoverShadow: 'hover:shadow-primary/10',
      badge: null as string | null,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card
          key={stat.label}
          className={`group border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 ${stat.hoverBorder} hover:shadow-lg ${stat.hoverShadow}`}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold tracking-tight text-foreground">
                  {stat.value}
                </p>
                {stat.badge && (
                  <Badge className="bg-accent/20 text-accent border-accent/30 text-xs font-medium mt-1">
                    {stat.badge}
                  </Badge>
                )}
              </div>
              <div
                className={`rounded-lg p-3 ring-1 ${stat.iconBg} ${stat.iconRing} transition-all group-hover:scale-105`}
              >
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
