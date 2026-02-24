import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/backend/prisma/client'

/**
 * Public endpoint — used by the agent application form to autocomplete
 * the "Referred By" field. Returns only active agent names (no sensitive data).
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  if (!q || q.length < 2) {
    return NextResponse.json({ agents: [] })
  }

  const agents = await prisma.user.findMany({
    where: {
      role: 'AGENT',
      isActive: true,
      name: { contains: q, mode: 'insensitive' },
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
    take: 10,
  })

  return NextResponse.json({ agents })
}
