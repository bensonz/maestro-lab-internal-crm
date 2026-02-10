import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { PlatformStatus, UserRole } from '@/types'
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

  const clients = await prisma.client.findMany({
    include: {
      agent: { select: { name: true } },
      platforms: { select: { status: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const headers = [
    'Name',
    'Email',
    'Phone',
    'Status',
    'Agent',
    'Platforms',
    'Verified Platforms',
    'Created',
    'Last Updated',
  ]

  const rows = clients.map((c) => {
    const verifiedCount = c.platforms.filter(
      (p) => p.status === PlatformStatus.VERIFIED,
    ).length

    return [
      `${c.firstName} ${c.lastName}`,
      c.email ?? '',
      c.phone ?? '',
      c.intakeStatus,
      c.agent?.name ?? '',
      String(c.platforms.length),
      String(verifiedCount),
      c.createdAt.toISOString().split('T')[0],
      c.statusChangedAt.toISOString().split('T')[0],
    ]
  })

  const csv = generateCSV(headers, rows)
  const date = new Date().toISOString().split('T')[0]
  return csvResponse(csv, `clients-export-${date}.csv`)
}) as unknown as (req: NextRequest) => Promise<Response>
