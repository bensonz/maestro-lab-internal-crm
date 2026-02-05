import { getPhoneAssignments, getPhoneStats } from '@/backend/data/operations'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Phone,
  CheckCircle,
  Clock,
  XCircle,
  Download,
} from 'lucide-react'
import { PhoneTable } from './_components/phone-table'

export default async function PhoneTrackingPage() {
  const [phoneNumbers, stats] = await Promise.all([
    getPhoneAssignments(),
    getPhoneStats(),
  ])

  const statItems = [
    { label: 'Total Issued', value: stats.total, icon: Phone, color: 'text-slate-300', bg: 'bg-slate-700' },
    { label: 'Active', value: stats.active, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Suspended', value: stats.suspended, icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Phone Number Tracking</h1>
          <p className="text-slate-400">Track all issued phone numbers and their assignment status</p>
        </div>
        <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {statItems.map((stat) => (
          <Card key={stat.label} className="bg-slate-900 border-slate-800">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
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
