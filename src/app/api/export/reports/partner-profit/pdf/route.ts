import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { auth } from '@/backend/auth'
import { UserRole } from '@/types'
import { getPartnerProfitReport } from '@/backend/data/reports'
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
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const date = new Date().toISOString().split('T')[0]

  // --- Header ---
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Partner Profit Report', 14, 20)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  doc.text(`Generated ${date} by ${req.auth.user.name ?? 'Unknown'}`, 14, 28)
  doc.setTextColor(0, 0, 0)

  doc.setDrawColor(200, 200, 200)
  doc.line(14, 32, pageWidth - 14, 32)

  // --- Summary Metrics ---
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', 14, 40)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Gross Volume: $${report.totals.gross.toLocaleString()}`, 14, 48)
  doc.text(`Total Fees: $${report.totals.fees.toLocaleString()}`, 14, 54)
  doc.text(
    `Partner Payouts: $${report.totals.partnerShare.toLocaleString()}`,
    100,
    48,
  )
  doc.text(
    `Company Retained: $${report.totals.companyShare.toLocaleString()}`,
    100,
    54,
  )

  // --- Data Table ---
  autoTable(doc, {
    startY: 62,
    head: [
      [
        'Partner',
        'Type',
        'Txns',
        'Gross',
        'Fees',
        'Partner Share',
        'Company Share',
        'Pending',
        'Paid',
      ],
    ],
    body: report.byPartner.map((p) => [
      p.partnerName,
      p.partnerType,
      String(p.transactionCount),
      `$${p.grossTotal.toLocaleString()}`,
      `$${p.feeTotal.toLocaleString()}`,
      `$${p.partnerTotal.toLocaleString()}`,
      `$${p.companyTotal.toLocaleString()}`,
      `$${p.pendingAmount.toLocaleString()}`,
      `$${p.paidAmount.toLocaleString()}`,
    ]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 41, 41], textColor: [255, 255, 255] },
    margin: { left: 14, right: 14 },
  })

  // --- Footer ---
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const pageHeight = doc.internal.pageSize.getHeight()
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)

    const footerText = 'Maestro L.A.B \u2014 Confidential'
    const footerWidth = doc.getTextWidth(footerText)
    doc.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - 10)

    const pageText = `Page ${i} of ${totalPages}`
    const pageTextWidth = doc.getTextWidth(pageText)
    doc.text(pageText, (pageWidth - pageTextWidth) / 2, pageHeight - 6)

    doc.setTextColor(0, 0, 0)
  }

  const buffer = doc.output('arraybuffer')

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="partner-profit-report-${date}.pdf"`,
    },
  })
}) as unknown as (req: NextRequest) => Promise<Response>
