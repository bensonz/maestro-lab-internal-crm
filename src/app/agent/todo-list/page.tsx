import {
  MOCK_TODO_DATA,
  MOCK_AGENT_CLIENTS,
  MOCK_EARNINGS,
  MOCK_TEAM_MEMBERS,
  MOCK_SESSION,
} from '@/lib/mock-data'
import { TodoPageClient } from './_components/todo-page-client'

export default function TodoListPage() {
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

  return (
    <TodoPageClient
      todoData={MOCK_TODO_DATA}
      clients={clientData}
      agentName={MOCK_SESSION.user.name || 'Agent'}
      agentStarLevel={2}
      earningsData={MOCK_EARNINGS}
      teamMembers={MOCK_TEAM_MEMBERS}
    />
  )
}
