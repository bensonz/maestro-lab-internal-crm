import { auth } from '@/backend/auth'
import { UserRole } from '@/types'
import { getClientsForSettlement } from '@/backend/data/operations'
import { generateCSV, csvResponse } from '@/backend/utils/csv'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const allowedRoles = new Set<string>([UserRole.ADMIN, UserRole.BACKOFFICE])
  if (!allowedRoles.has(session.user.role)) {
    return new Response('Forbidden', { status: 403 })
  }

  const clients = await getClientsForSettlement()

  const headers = [
    'Client Name',
    'Total Deposited',
    'Total Withdrawn',
    'Net Balance',
    'Platforms',
  ]

  const rows = clients.map((c) => {
    const platformSummary = c.platforms
      .map((p) => `${p.name}: +$${p.deposited}/-$${p.withdrawn}`)
      .join('; ')

    return [
      c.name,
      String(c.totalDeposited),
      String(c.totalWithdrawn),
      String(c.netBalance),
      platformSummary,
    ]
  })

  const csv = generateCSV(headers, rows)
  const date = new Date().toISOString().split('T')[0]
  return csvResponse(csv, `settlements-export-${date}.csv`)
}
