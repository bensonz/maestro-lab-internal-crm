import {
  getDashboardStats,
  getPendingActionCounts,
  getRecentActivity,
  getPlatformOverview,
} from '@/backend/data/backoffice'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  UserCheck,
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
} from 'lucide-react'

export default async function BackofficeOverviewPage() {
  const [stats, pendingActions, recentActivity, platformOverview] = await Promise.all([
    getDashboardStats(),
    getPendingActionCounts(),
    getRecentActivity(),
    getPlatformOverview(),
  ])

  const statCards = [
    {
      title: 'Total Clients',
      value: stats.totalClients.toString(),
      icon: Users,
    },
    {
      title: 'Active Agents',
      value: stats.activeAgents.toString(),
      icon: UserCheck,
    },
    {
      title: 'Total Funds Managed',
      value: stats.totalFundsManaged,
      icon: DollarSign,
    },
    {
      title: 'Monthly Revenue',
      value: stats.monthlyRevenue,
      icon: TrendingUp,
    },
  ]

  const pendingActionItems = [
    { type: 'intake', label: 'Pending Intake Approvals', count: pendingActions.pendingIntake, color: 'text-amber-500' },
    { type: 'verification', label: 'Pending Verifications', count: pendingActions.pendingVerification, color: 'text-blue-500' },
    { type: 'settlement', label: 'Pending Settlements', count: pendingActions.pendingSettlement, color: 'text-purple-500' },
    { type: 'tasks', label: 'Overdue Tasks', count: pendingActions.overdueTasks, color: 'text-red-500' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-slate-400">Welcome to the Back Office Management Console</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-slate-800">
                  <stat.icon className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-slate-400">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Pending Actions */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingActionItems.map((action) => (
              <div
                key={action.type}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800"
              >
                <span className="text-slate-300">{action.label}</span>
                <Badge variant="outline" className={`border-slate-600 ${action.color}`}>
                  {action.count}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-slate-900 border-slate-800 col-span-2">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-center text-slate-400 py-4">No recent activity</p>
            ) : (
              recentActivity.map((activity, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800"
                >
                  <div>
                    <p className="text-white">{activity.action}</p>
                    <p className="text-xs text-slate-400">
                      {activity.client ? `${activity.client} • ` : ''}Agent: {activity.agent}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">{activity.time}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform Overview */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Platform Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {platformOverview.length === 0 ? (
            <p className="text-center text-slate-400 py-4">No platform data available</p>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {platformOverview.map((platform) => (
                <div key={platform.name} className="p-4 rounded-lg bg-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-amber-500 text-lg">🏆</span>
                    <span className="text-white font-medium">{platform.name}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Active Clients</span>
                      <span className="text-sm text-white">{platform.clients}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Total Balance</span>
                      <span className="text-sm text-emerald-500">${platform.balance.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
