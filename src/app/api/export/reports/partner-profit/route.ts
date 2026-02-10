import { auth } from '@/backend/auth'
import { UserRole } from '@/types'
import { getPartnerProfitReport } from '@/backend/data/reports'
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

  const report = await getPartnerProfitReport()

  const headers = [
    'Partner Name',
    'Type',
    'Transaction Count',
    'Gross Total',
    'Fees',
    'Partner Share',
    'Company Share',
    'Pending',
    'Paid',
  ]

  const rows = report.byPartner.map((p) => [
    p.partnerName,
    p.partnerType,
    String(p.transactionCount),
    p.grossTotal.toFixed(2),
    p.feeTotal.toFixed(2),
    p.partnerTotal.toFixed(2),
    p.companyTotal.toFixed(2),
    p.pendingAmount.toFixed(2),
    p.paidAmount.toFixed(2),
  ])

  const csv = generateCSV(headers, rows)
  const date = new Date().toISOString().split('T')[0]
  return csvResponse(csv, `partner-profit-report-${date}.csv`)
}) as unknown as (req: NextRequest) => Promise<Response>
