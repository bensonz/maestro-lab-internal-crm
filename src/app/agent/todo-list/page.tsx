import { auth } from '@/backend/auth'
import { redirect } from 'next/navigation'
import { getAgentTodos } from '@/backend/data/agent'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function TodoListPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const todos = await getAgentTodos(session.user.id)

  return (
    <div className="p-6 text-white">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">To-Do List</h1>
        <p className="text-slate-400">Your pending tasks</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Today&apos;s Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{todos.todaysTasks}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{todos.thisWeek}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{todos.overdue}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Completed Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{todos.completedToday}</div>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-lg text-white">Pending Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {todos.pendingTasks.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No tasks assigned</p>
          ) : (
            <div className="space-y-4">
              {todos.pendingTasks.map((todo) => (
                <div key={todo.id} className="flex items-center justify-between rounded-lg bg-slate-800 p-4">
                  <div>
                    <p className="font-medium text-white">{todo.task}</p>
                    <p className="text-sm text-slate-400">{todo.client}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={todo.overdue ? 'bg-red-500' : 'bg-slate-600'}>
                      {todo.due}
                    </Badge>
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
