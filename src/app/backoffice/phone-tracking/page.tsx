import {
  getPhoneAssignments,
  getPhoneStats,
  getEligibleClientsForPhone,
} from '@/backend/data/operations'
import { Card, CardContent } from '@/components/ui/card'
import { Phone, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { PhoneTable } from './_components/phone-table'
import { PhoneTrackingHeader } from './_components/phone-tracking-header'

export default async function PhoneTrackingPage() {
  const [phoneNumbers, stats, eligibleClients] = await Promise.all([
    getPhoneAssignments(),
    getPhoneStats(),
    getEligibleClientsForPhone(),
  ])

  const statItems = [
    {
      label: 'Total Issued',
      value: stats.total,
      icon: Phone,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/20',
    },
    {
      label: 'Active',
      value: stats.active,
      valueColor: 'text-success',
      icon: CheckCircle2,
      iconColor: 'text-success',
      iconBg: 'bg-success/20',
    },
    {
      label: 'Pending',
      value: stats.pending,
      valueColor: 'text-warning',
      icon: Clock,
      iconColor: 'text-warning',
      iconBg: 'bg-warning/20',
    },
    {
      label: 'Suspended',
      value: stats.suspended,
      valueColor: 'text-destructive',
      icon: XCircle,
      iconColor: 'text-destructive',
      iconBg: 'bg-destructive/20',
    },
  ]

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* Header */}
      <PhoneTrackingHeader eligibleClients={eligibleClients} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statItems.map((stat) => (
          <Card key={stat.label} className="card-terminal">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                  <p
                    className={`mt-1 text-2xl font-mono font-semibold ${stat.valueColor || ''}`}
                  >
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.iconBg}`}
                >
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
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
