import { getBackofficeTodos, getBackofficeTodoStats } from '@/backend/data/operations'
import { Card, CardContent } from '@/components/ui/card'
import {
  Clock,
  Calendar,
  CalendarDays,
  AlertTriangle,
} from 'lucide-react'
import { TodoListView } from './_components/todo-list-view'

export default async function BackofficeTodoListPage() {
  const [agentTasks, stats] = await Promise.all([
    getBackofficeTodos(),
    getBackofficeTodoStats(),
  ])

  const statItems = [
    { label: "Today's Tasks", value: stats.todaysTasks, icon: Clock, color: 'text-slate-300', bg: 'bg-emerald-500/10', borderColor: 'border-emerald-500' },
    { label: '3-Day Tasks', value: stats.threeDayTasks, icon: Calendar, color: 'text-slate-300', bg: 'bg-slate-800', borderColor: 'border-slate-700' },
    { label: '7-Day Tasks', value: stats.sevenDayTasks, icon: CalendarDays, color: 'text-slate-300', bg: 'bg-slate-800', borderColor: 'border-slate-700' },
    { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10', borderColor: 'border-red-500' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">To-Do List</h1>
        <p className="text-slate-400">Global task execution view across all agents and clients</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {statItems.map((stat) => (
          <Card key={stat.label} className={`bg-slate-900 border ${stat.borderColor}`}>
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

      {/* Interactive TodoListView */}
      <TodoListView agentTasks={agentTasks} />
    </div>
  )
}
