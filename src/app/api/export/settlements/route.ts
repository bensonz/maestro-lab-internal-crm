import { auth } from '@/backend/auth'
import { UserRole } from '@/types'
import { getClientsForSettlement } from '@/backend/data/operations'
import { generateCSV, csvResponse } from '@/backend/utils/csv'

const STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: 'Pending Review',
  CONFIRMED: 'Confirmed',
  REJECTED: 'Rejected',
}

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

  // Sort clients alphabetically by name
  const sorted = [...clients].sort((a, b) => a.name.localeCompare(b.name))

  // Detail rows: one per transaction per client
  const headers = [
    'Client Name',
    'Date',
    'Type',
    'Platform',
    'Amount',
    'Currency',
    'Settlement Status',
    'Reviewed By',
    'Reviewed At',
    'Review Notes',
    'Movement Status',
  ]

  const rows: string[][] = []
  for (const client of sorted) {
    // Sort transactions by date desc (they already come this way from the data layer)
    for (const tx of client.recentTransactions) {
      rows.push([
        client.name,
        tx.date,
        tx.type === 'deposit' ? 'Deposit' : 'Withdrawal',
        tx.platform,
        tx.amount.toFixed(2),
        'USD',
        STATUS_LABELS[tx.settlementStatus] ?? tx.settlementStatus,
        tx.reviewedBy ?? '',
        tx.reviewedAt ?? '',
        tx.reviewNotes ?? '',
        tx.status,
      ])
    }
  }

  let csv = generateCSV(headers, rows)

  // Append summary section after an empty row separator
  const emptyRow = ','.repeat(headers.length - 1)
  const summaryHeader = [
    'Client Name',
    'Total Deposited',
    'Total Withdrawn',
    'Net Balance',
    'Pending Count',
    'Confirmed Count',
    'Rejected Count',
  ]
    .concat(Array(headers.length - 7).fill(''))
    .join(',')

  const summaryRows = sorted.map((c) =>
    [
      c.name,
      c.totalDeposited.toFixed(2),
      c.totalWithdrawn.toFixed(2),
      c.netBalance.toFixed(2),
      String(c.settlementCounts.pendingReview),
      String(c.settlementCounts.confirmed),
      String(c.settlementCounts.rejected),
    ]
      .concat(Array(headers.length - 7).fill(''))
      .join(','),
  )

  csv += '\n' + emptyRow
  csv += '\n' + 'Summary' + ','.repeat(headers.length - 1)
  csv += '\n' + summaryHeader
  csv += '\n' + summaryRows.join('\n')

  const date = new Date().toISOString().split('T')[0]
  return csvResponse(csv, `settlement-detail-${date}.csv`)
}
