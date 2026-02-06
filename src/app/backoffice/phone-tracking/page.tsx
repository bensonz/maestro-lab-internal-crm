import { getPhoneAssignments, getPhoneStats, getEligibleClientsForPhone } from '@/backend/data/operations'
import { Card, CardContent } from '@/components/ui/card'
import {
  Phone,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react'
import { PhoneTable } from './_components/phone-table'
import { PhoneTrackingHeader } from './_components/phone-tracking-header'

export default async function PhoneTrackingPage() {
  const [phoneNumbers, stats, eligibleClients] = await Promise.all([
    getPhoneAssignments(),
    getPhoneStats(),
    getEligibleClientsForPhone(),
  ])

  const statItems = [
    { label: 'Total Issued', value: stats.total, icon: Phone, iconColor: 'text-primary', iconBg: 'bg-primary/10', iconRing: 'ring-primary/20' },
    { label: 'Active', value: stats.active, icon: CheckCircle, iconColor: 'text-chart-4', iconBg: 'bg-chart-4/10', iconRing: 'ring-chart-4/20' },
    { label: 'Pending', value: stats.pending, icon: Clock, iconColor: 'text-accent', iconBg: 'bg-accent/10', iconRing: 'ring-accent/20' },
    { label: 'Signed Out', value: stats.suspended, icon: XCircle, iconColor: 'text-destructive', iconBg: 'bg-destructive/10', iconRing: 'ring-destructive/20' },
  ]

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <PhoneTrackingHeader eligibleClients={eligibleClients} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold tracking-tight text-foreground">
                    {stat.value}
                  </p>
                </div>
                <div className={`rounded-lg p-3 ring-1 ${stat.iconBg} ${stat.iconRing}`}>
                  <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Interactive Table */}
      <PhoneTable phoneNumbers={phoneNumbers} />
    </div>
  )
}
