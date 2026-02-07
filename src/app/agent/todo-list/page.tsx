import { auth } from '@/backend/auth'
import { redirect } from 'next/navigation'
import { getAgentTodos, getAgentClients } from '@/backend/data/agent'
import { TodoPageClient } from './_components/todo-page-client'

export default async function TodoListPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [todoData, clients] = await Promise.all([
    getAgentTodos(session.user.id),
    getAgentClients(session.user.id),
  ])

  // Map client data to the shape expected by TodoPageClient
  const clientData = clients.map((c) => ({
    id: c.id,
    name: c.name,
    intakeStatus: c.intakeStatus,
    nextTask: c.nextTask,
    step: c.step,
    totalSteps: c.totalSteps,
    deadline: c.deadline,
  }))

  return (
    <div className="min-h-screen bg-background">
      <TodoPageClient
        todoData={todoData}
        clients={clientData}
        agentName={session.user.name || 'Agent'}
      />
    </div>
  )
}
