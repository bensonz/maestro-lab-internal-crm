import {
  getBackofficeTodos,
  getBackofficeTodoStats,
} from '@/backend/data/operations'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, Calendar, AlertTriangle, ClipboardList } from 'lucide-react'
import { TodoListView } from './_components/todo-list-view'

export default async function BackofficeTodoListPage() {
  const [agentTasks, stats] = await Promise.all([
    getBackofficeTodos(),
    getBackofficeTodoStats(),
  ])

  const statItems = [
    {
      label: "Today's Tasks",
      value: stats.todaysTasks,
      icon: Clock,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/20',
    },
    {
      label: '3-Day Tasks',
      value: stats.threeDayTasks,
      valueColor: 'text-warning',
      icon: Calendar,
      iconColor: 'text-warning',
      iconBg: 'bg-warning/20',
    },
    {
      label: '7-Day Tasks',
      value: stats.sevenDayTasks,
      icon: ClipboardList,
      iconColor: 'text-muted-foreground',
      iconBg: 'bg-muted',
    },
    {
      label: 'Overdue',
      value: stats.overdue,
      valueColor: 'text-destructive',
      icon: AlertTriangle,
      iconColor: 'text-destructive',
      iconBg: 'bg-destructive/20',
    },
  ]

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Backoffice To-Do List
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All tasks across agents and clients
        </p>
      </div>

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

      {/* Interactive TodoListView */}
      <TodoListView agentTasks={agentTasks} />
    </div>
  )
}
