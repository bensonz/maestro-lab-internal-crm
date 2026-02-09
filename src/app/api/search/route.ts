import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return Response.json({ results: [] }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return Response.json({ results: [] })

  const query = q.toLowerCase()
  const isAgent = session.user.role === 'AGENT'

  const [clients, agents, todos] = await Promise.all([
    prisma.client.findMany({
      where: {
        ...(isAgent ? { agentId: session.user.id } : {}),
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        intakeStatus: true,
        email: true,
      },
      take: 5,
    }),

    isAgent
      ? []
      : prisma.user.findMany({
          where: {
            role: 'AGENT',
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
              { phone: { contains: query, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            name: true,
            email: true,
            tier: true,
            starLevel: true,
            isActive: true,
          },
          take: 5,
        }),

    prisma.toDo.findMany({
      where: {
        ...(isAgent ? { assignedToId: session.user.id } : {}),
        title: { contains: query, mode: 'insensitive' },
      },
      select: {
        id: true,
        title: true,
        status: true,
        type: true,
        clientId: true,
      },
      take: 5,
    }),
  ])

  const results = [
    ...clients.map((c) => ({
      type: 'client' as const,
      id: c.id,
      title: `${c.firstName} ${c.lastName}`,
      subtitle: c.email ?? c.intakeStatus,
      status: c.intakeStatus,
      link: isAgent
        ? `/agent/clients/${c.id}`
        : `/backoffice/client-management`,
    })),
    ...agents.map((a) => ({
      type: 'agent' as const,
      id: a.id,
      title: a.name,
      subtitle: `${a.tier} • ${a.email}`,
      status: a.isActive ? 'active' : 'inactive',
      link: `/backoffice/agent-management/${a.id}`,
    })),
    ...todos.map((t) => ({
      type: 'task' as const,
      id: t.id,
      title: t.title,
      subtitle: `${t.type} • ${t.status}`,
      status: t.status,
      link: isAgent ? '/agent/todo-list' : '/backoffice/todo-list',
    })),
  ]

  return Response.json({ results })
}
