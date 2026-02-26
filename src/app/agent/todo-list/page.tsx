import {
  MOCK_TODO_DATA,
  MOCK_AGENT_CLIENTS,
  MOCK_EARNINGS,
  MOCK_TEAM_MEMBERS,
  MOCK_SESSION,
} from '@/lib/mock-data'
import { TodoPageClient } from './_components/todo-page-client'
import { auth } from '@/backend/auth'
import { getTodosByAgent } from '@/backend/data/todos'

export default async function TodoListPage() {
  // Map client data to the shape expected by TodoPageClient
  const clientData = MOCK_AGENT_CLIENTS.map((c) => ({
    id: c.id,
    name: c.name,
    intakeStatus: c.intakeStatus,
    nextTask: c.nextTask,
    step: c.step,
    totalSteps: c.totalSteps,
    deadline: c.deadline,
  }))

  // Merge real DB todos into mock todo data
  let todoData = { ...MOCK_TODO_DATA }
  let agentName = MOCK_SESSION.user.name || 'Agent'
  let agentStarLevel = 2

  try {
    const session = await auth()
    if (session?.user) {
      agentName = session.user.name || agentName
      agentStarLevel = (session.user as { starLevel?: number }).starLevel ?? agentStarLevel

      const realTodos = await getTodosByAgent(session.user.id)
      if (realTodos.length > 0) {
        const realPendingTasks = realTodos.map((t) => {
          const clientName = [t.clientDraft.firstName, t.clientDraft.lastName]
            .filter(Boolean)
            .join(' ') || 'Unknown'
          const daysUntil = Math.floor(
            (t.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          )
          return {
            id: t.id,
            task: t.title,
            description: t.description || `${t.issueCategory} — ${clientName}`,
            client: clientName,
            clientId: t.clientDraftId,
            due: daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : `${daysUntil}d`,
            dueDate: t.dueDate.toISOString(),
            overdue: daysUntil < 0,
            stepNumber: t.clientDraft.step,
            createdAt: t.createdAt.toISOString(),
            extensionsUsed: 0,
            maxExtensions: 2,
            createdByName: t.createdBy.name,
            metadata: null,
          }
        })

        todoData = {
          ...todoData,
          pendingTasks: [...realPendingTasks, ...todoData.pendingTasks],
          todaysTasks: todoData.todaysTasks + realPendingTasks.length,
          thisWeek: todoData.thisWeek + realPendingTasks.length,
          overdue: todoData.overdue + realPendingTasks.filter((t) => t.overdue).length,
        }
      }
    }
  } catch (e) {
    console.error('[todo-list] todos fetch error:', e)
  }

  return (
    <TodoPageClient
      todoData={todoData}
      clients={clientData}
      agentName={agentName}
      agentStarLevel={agentStarLevel}
      earningsData={MOCK_EARNINGS}
      teamMembers={MOCK_TEAM_MEMBERS}
    />
  )
}
