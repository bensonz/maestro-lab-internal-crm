import prisma from '@/backend/prisma/client'
import type { AgentKPIs } from '@/types/backend-types'

/**
 * Compute real KPIs for an agent from the database.
 */
export async function computeAgentKPIs(agentId: string): Promise<AgentKPIs> {
  // Get all clients for this agent
  const clients = await prisma.client.findMany({
    where: { closerId: agentId },
    select: {
      id: true,
      status: true,
      createdAt: true,
      approvedAt: true,
    },
  })

  const totalClients = clients.length
  const approvedClients = clients.filter((c) => c.status === 'APPROVED').length
  const rejectedClients = clients.filter((c) => c.status === 'REJECTED').length
  const pendingClients = clients.filter((c) => c.status === 'PENDING').length

  // Get drafts for in-progress count
  const drafts = await prisma.clientDraft.findMany({
    where: { closerId: agentId, status: 'DRAFT' },
    select: { id: true },
  })
  const inProgressClients = drafts.length + pendingClients

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

  // Avg days to convert (from client creation to approval)
  const approvedWithDates = clients.filter((c) => c.status === 'APPROVED' && c.approvedAt)
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
