import prisma from '@/backend/prisma/client'
import type { AgentKPIs } from '@/types/backend-types'

/**
 * Compute real KPIs for an agent from the database.
 */
export async function computeAgentKPIs(agentId: string): Promise<AgentKPIs> {
  // Get all client records for this agent (unified model covers drafts + approved + rejected)
  const records = await prisma.clientRecord.findMany({
    where: { closerId: agentId },
    select: {
      id: true,
      status: true,
      createdAt: true,
      approvedAt: true,
    },
  })

  const totalClients = records.length
  const approvedClients = records.filter((c) => c.status === 'APPROVED').length
  const rejectedClients = records.filter((c) => c.status === 'REJECTED').length

  // In-progress = DRAFT or SUBMITTED
  const inProgressClients = records.filter(
    (c) => c.status === 'DRAFT' || c.status === 'SUBMITTED'
  ).length

  // Success rate (approved / (approved + rejected))
  const denominator = approvedClients + rejectedClients
  const successRate = denominator > 0
    ? Math.round((approvedClients / denominator) * 1000) / 10
    : 0

  // Get todos for this agent
  const todos = await prisma.todo.findMany({
    where: { assignedToId: agentId },
    select: { id: true, status: true, dueDate: true },
  })

  const pendingTodos = todos.filter((t) => t.status === 'PENDING').length
  const overdueTodos = todos.filter(
    (t) => t.status === 'PENDING' && t.dueDate < new Date()
  ).length

  // Avg days to convert (from client record creation to approval)
  const approvedWithDates = records.filter((c) => c.status === 'APPROVED' && c.approvedAt)
  let avgDaysToConvert: number | null = null
  if (approvedWithDates.length > 0) {
    const totalDays = approvedWithDates.reduce((sum, c) => {
      const days = (c.approvedAt!.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      return sum + days
    }, 0)
    avgDaysToConvert = Math.round((totalDays / approvedWithDates.length) * 10) / 10
  }

  return {
    totalClients,
    approvedClients,
    rejectedClients,
    inProgressClients,
    delayedClients: 0,
    successRate,
    delayRate: 0,
    extensionRate: 0,
    avgDaysToInitiate: null,
    avgDaysToConvert,
    pendingTodos,
    overdueTodos,
  }
}
