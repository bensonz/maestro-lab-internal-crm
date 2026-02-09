import { auth } from '@/backend/auth'
import { UserRole } from '@/types'
import { getAgentCommissionReport } from '@/backend/data/reports'
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

  const report = await getAgentCommissionReport()

  const headers = [
    'Agent Name',
    'Tier',
    'Star Level',
    'Direct Total',
    'Star Slice Total',
    'Backfill Total',
    'Override Total',
    'Total Earned',
    'Pending',
    'Paid',
  ]

  const rows = report.byAgent.map((a) => [
    a.agentName,
    a.tier,
    String(a.starLevel),
    a.directTotal.toFixed(2),
    a.starSliceTotal.toFixed(2),
    a.backfillTotal.toFixed(2),
    a.overrideTotal.toFixed(2),
    a.totalEarned.toFixed(2),
    a.pendingAmount.toFixed(2),
    a.paidAmount.toFixed(2),
  ])

  const csv = generateCSV(headers, rows)
  const date = new Date().toISOString().split('T')[0]
  return csvResponse(csv, `agent-commission-report-${date}.csv`)
}
