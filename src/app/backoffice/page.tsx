import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Bell } from 'lucide-react'
import {
  getOverviewStats,
  getPriorityTasks,
  getReminders,
  getOverviewRecentActivity,
} from '@/backend/data/backoffice'
import { OverviewStats } from './_components/overview-stats'
import { PriorityTasks } from './_components/priority-tasks'
import { QuickActions } from './_components/quick-actions'
import { RemindersPanel } from './_components/reminders-panel'
import { RecentActivity } from './_components/recent-activity'

export default async function BackofficeOverviewPage() {
  const [stats, tasks, reminders, activities] = await Promise.all([
    getOverviewStats(),
    getPriorityTasks(),
    getReminders(),
    getOverviewRecentActivity(),
  ])

  const today = format(new Date(), 'EEEE, MMMM d')

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Daily operations dashboard &bull; {today}
          </p>
        </div>
        <Button variant="terminal" className="gap-2">
          <Bell className="h-4 w-4" />
          View All Alerts
        </Button>
      </div>

      {/* Summary Metrics */}
      <OverviewStats
        pendingReviews={stats.pendingReviews}
        approvedToday={stats.approvedToday}
        urgentActions={stats.urgentActions}
        activeClients={stats.activeClients}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <PriorityTasks tasks={tasks} />
        <RemindersPanel reminders={reminders} />
      </div>

      {/* Quick Actions + Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <QuickActions />
        <RecentActivity activities={activities} />
      </div>
    </div>
  )
}
