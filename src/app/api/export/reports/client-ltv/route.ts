import { auth } from '@/backend/auth'
import { UserRole } from '@/types'
import { getClientLTVReport } from '@/backend/data/reports'
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

  const report = await getClientLTVReport()

  const headers = [
    'Client Name',
    'Agent',
    'Partner',
    'Days Active',
    'Total Deposited',
    'Total Withdrawn',
    'Net Flow',
    'Commission Cost',
    'LTV',
    'Monthly Run Rate',
  ]

  const rows = report.clients.map((c) => [
    c.clientName,
    c.agentName,
    c.partnerName ?? '',
    String(c.daysSinceCreated),
    c.totalDeposited.toFixed(2),
    c.totalWithdrawn.toFixed(2),
    c.netFlow.toFixed(2),
    c.commissionCost.toFixed(2),
    c.ltv.toFixed(2),
    c.monthlyLTV.toFixed(2),
  ])

  const csv = generateCSV(headers, rows)
  const date = new Date().toISOString().split('T')[0]
  return csvResponse(csv, `client-ltv-report-${date}.csv`)
}
