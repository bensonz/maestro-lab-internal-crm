import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { UserRole } from '@/types'
import { getAgentKPIs } from '@/backend/services/agent-kpis'
import { generateCSV, csvResponse } from '@/backend/utils/csv'
import { NextRequest } from 'next/server'

export const GET = auth(async (req) => {
  if (!req.auth?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const allowedRoles = new Set<string>([UserRole.ADMIN, UserRole.BACKOFFICE])
  if (!allowedRoles.has(req.auth.user.role)) {
    return new Response('Forbidden', { status: 403 })
  }

  const agents = await prisma.user.findMany({
    where: { role: UserRole.AGENT, isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })

  const headers = [
    'Name',
    'Email',
    'Total Clients',
    'Approved Clients',
    'Success Rate',
    'Delay Rate',
    'Extension Rate',
    'Avg Days to Convert',
  ]

  const rows = await Promise.all(
    agents.map(async (agent) => {
      const kpis = await getAgentKPIs(agent.id)
      return [
        agent.name,
        agent.email,
        String(kpis.totalClients),
        String(kpis.approvedClients),
        String(kpis.successRate),
        String(kpis.delayRate),
        String(kpis.extensionRate),
        kpis.avgDaysToConvert !== null ? String(kpis.avgDaysToConvert) : '',
      ]
    }),
  )

  const csv = generateCSV(headers, rows)
  const date = new Date().toISOString().split('T')[0]
  return csvResponse(csv, `agents-export-${date}.csv`)
}) as unknown as (req: NextRequest) => Promise<Response>
