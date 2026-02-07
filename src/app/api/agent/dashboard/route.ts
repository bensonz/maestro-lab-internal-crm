import { NextResponse } from 'next/server'
import { auth } from '@/backend/auth'
import { prisma } from '@/backend/prisma/client'
import { IntakeStatus, ToDoStatus } from '@prisma/generated'

export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  // Get client stats for this agent
  const clients = await prisma.client.findMany({
    where: { agentId: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      intakeStatus: true,
      executionDeadline: true,
      createdAt: true,
      updatedAt: true,
      platforms: {
        select: {
          platformType: true,
          status: true,
        },
      },
    },
  })

  // Count by status
  const inProgressStatuses = [
    'PHONE_ISSUED',
    'IN_EXECUTION',
    'NEEDS_MORE_INFO',
  ] as const
  const statusCounts = {
    total: clients.length,
    pending: clients.filter((c) => c.intakeStatus === 'PENDING').length,
    inProgress: clients.filter((c) =>
      inProgressStatuses.includes(
        c.intakeStatus as (typeof inProgressStatuses)[number],
      ),
    ).length,
    pendingApproval: clients.filter(
      (c) => c.intakeStatus === 'READY_FOR_APPROVAL',
    ).length,
    approved: clients.filter((c) => c.intakeStatus === 'APPROVED').length,
    rejected: clients.filter((c) => c.intakeStatus === 'REJECTED').length,
  }

  // Get to-dos for this agent
  const todos = await prisma.toDo.findMany({
    where: {
      assignedToId: userId,
      status: {
        in: [ToDoStatus.PENDING, ToDoStatus.IN_PROGRESS, ToDoStatus.OVERDUE],
      },
    },
    include: {
      client: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
    take: 10,
  })

  // Get today's tasks (due within 24h)
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const todaysTasks = todos.filter((t) => t.dueDate && t.dueDate <= tomorrow)

  // Get earnings
  const earnings = await prisma.earning.aggregate({
    where: {
      client: { agentId: userId },
    },
    _sum: { amount: true },
  })

  const pendingEarnings = await prisma.earning.aggregate({
    where: {
      client: { agentId: userId },
      status: 'pending',
    },
    _sum: { amount: true },
  })

  // Get this month's earnings
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEarnings = await prisma.earning.aggregate({
    where: {
      client: { agentId: userId },
      createdAt: { gte: startOfMonth },
    },
    _sum: { amount: true },
  })

  // Get agent metrics
  const metrics = await prisma.agentMetrics.findUnique({
    where: { agentId: userId },
  })

  return NextResponse.json({
    clientStats: statusCounts,
    financialOverview: {
      totalEarnings: earnings._sum.amount?.toNumber() ?? 0,
      pendingPayout: pendingEarnings._sum.amount?.toNumber() ?? 0,
      thisMonth: monthEarnings._sum.amount?.toNumber() ?? 0,
    },
    todaysTasks: todaysTasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      type: t.type,
      status: t.status,
      dueDate: t.dueDate,
      clientName: t.client
        ? `${t.client.firstName} ${t.client.lastName}`
        : null,
      isUrgent: t.dueDate && t.dueDate <= now,
    })),
    recentClients: clients
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        status: c.intakeStatus,
        platformsVerified: c.platforms.filter((p) => p.status === 'VERIFIED')
          .length,
        platformsTotal: c.platforms.length,
        deadline: c.executionDeadline,
      })),
    metrics: metrics
      ? {
          successRate: metrics.successRate,
          delayRate: metrics.delayRate,
          totalClients: metrics.totalClients,
          approvedClients: metrics.approvedClients,
        }
      : null,
  })
}
