import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Bell } from 'lucide-react'
import {
  getOverviewStats,
  getPriorityTasks,
  getReminders,
  getOverviewRecentActivity,
  getPendingExtensionRequests,
  getDelayedClients,
} from '@/backend/data/backoffice'
import { OverviewStats } from './_components/overview-stats'
import { PriorityTasks } from './_components/priority-tasks'
import { ExtensionRequests } from './_components/extension-requests'
import { DelayedClients } from './_components/delayed-clients'
import { QuickActions } from './_components/quick-actions'
import { RemindersPanel } from './_components/reminders-panel'
import { RecentActivity } from './_components/recent-activity'

export default async function BackofficeOverviewPage() {
  const [stats, tasks, reminders, activities, extensionRequests, delayedClients] = await Promise.all([
    getOverviewStats(),
    getPriorityTasks(),
    getReminders(),
    getOverviewRecentActivity(),
    getPendingExtensionRequests(),
    getDelayedClients(),
  ])

  const today = format(new Date(), 'EEEE, MMMM d')

  return (
    <div className="min-h-screen p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between animate-fade-in-up">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Daily operations dashboard • {today}
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Bell className="h-4 w-4" />
          View All Alerts
        </Button>
      </div>

      {/* Stats Row */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
        <OverviewStats
          pendingReviews={stats.pendingReviews}
          approvedToday={stats.approvedToday}
          urgentActions={stats.urgentActions}
          activeClients={stats.activeClients}
          pendingExtensions={stats.pendingExtensions}
          delayedClients={stats.delayedClients}
        />
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column - Priority Tasks + Quick Actions */}
        <div className="lg:col-span-3 space-y-6">
          <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <PriorityTasks tasks={tasks} />
          </div>
          {extensionRequests.length > 0 && (
            <div className="animate-fade-in-up" style={{ animationDelay: '0.125s' }}>
              <ExtensionRequests requests={extensionRequests} />
            </div>
          )}
          {delayedClients.length > 0 && (
            <div className="animate-fade-in-up" style={{ animationDelay: '0.135s' }}>
              <DelayedClients clients={delayedClients} />
            </div>
          )}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <QuickActions />
          </div>
        </div>

        {/* Right Column - Reminders + Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <RemindersPanel reminders={reminders} />
          </div>
          <div className="animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <RecentActivity activities={activities} />
          </div>
        </div>
      </div>
    </div>
  )
}
