import {
  MOCK_AGENT_CLIENTS,
  MOCK_EARNINGS,
  MOCK_TEAM_MEMBERS,
} from '@/lib/mock-data'
import { TodoPageClient } from './_components/todo-page-client'
import { requireAgent } from '../_require-agent'
import { getTodosByAgent } from '@/backend/data/todos'

export default async function TodoListPage() {
  const agent = await requireAgent()

  // Map client data to the shape expected by TodoPageClient (still mock for now)
  const clientData = MOCK_AGENT_CLIENTS.map((c) => ({
    id: c.id,
    name: c.name,
    intakeStatus: c.intakeStatus,
    nextTask: c.nextTask,
    step: c.step,
    totalSteps: c.totalSteps,
    deadline: c.deadline,
  }))

  // Fetch real todos from DB
  let pendingTasks: Array<{
    id: string; task: string; description: string; client: string;
    clientId: string; due: string; dueDate: string; overdue: boolean;
    stepNumber: number; createdAt: string; extensionsUsed: number;
    maxExtensions: number; createdByName: string; metadata: null;
  }> = []

  try {
    const realTodos = await getTodosByAgent(agent.id)
    const now = Date.now()
    pendingTasks = realTodos.map((t) => {
      const clientName = [t.clientDraft.firstName, t.clientDraft.lastName]
        .filter(Boolean)
        .join(' ') || 'Unknown'
      const daysUntil = Math.floor(
        (t.dueDate.getTime() - now) / (1000 * 60 * 60 * 24),
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
  } catch (e) {
    console.error('[todo-list] todos fetch error:', e)
  }

  const now = Date.now()
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfDay)
  endOfWeek.setDate(endOfWeek.getDate() + 7)

  const todoData = {
    todaysTasks: pendingTasks.filter((t) => new Date(t.dueDate) <= new Date(startOfDay.getTime() + 86400000)).length,
    thisWeek: pendingTasks.filter((t) => new Date(t.dueDate) <= endOfWeek).length,
    overdue: pendingTasks.filter((t) => t.overdue).length,
    completedToday: 0,
    pendingTasks,
  }

  return (
    <TodoPageClient
      todoData={todoData}
      clients={clientData}
      agentName={agent.name ?? 'Agent'}
      agentStarLevel={(agent as { starLevel?: number }).starLevel ?? 0}
      earningsData={MOCK_EARNINGS}
      teamMembers={MOCK_TEAM_MEMBERS}
    />
  )
}
