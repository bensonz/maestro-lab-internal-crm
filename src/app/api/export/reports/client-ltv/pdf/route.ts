import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { auth } from '@/backend/auth'
import { UserRole } from '@/types'
import { getClientLTVReport } from '@/backend/data/reports'

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
  const doc = new jsPDF({ orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const date = new Date().toISOString().split('T')[0]

  // --- Header ---
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Client Lifetime Value Report', 14, 20)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  doc.text(`Generated ${date} by ${session.user.name ?? 'Unknown'}`, 14, 28)
  doc.setTextColor(0, 0, 0)

  doc.setDrawColor(200, 200, 200)
  doc.line(14, 32, pageWidth - 14, 32)

  // --- Summary Metrics ---
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', 14, 40)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Total LTV: $${report.totals.totalLTV.toLocaleString()}`, 14, 48)
  doc.text(
    `Average LTV: $${report.totals.avgLTV.toFixed(2)}`,
    14,
    54,
  )
  doc.text(
    `Total Deposited: $${report.totals.totalDeposited.toLocaleString()}`,
    120,
    48,
  )
  doc.text(
    `Commission Cost: $${report.totals.totalCommissionCost.toLocaleString()}`,
    120,
    54,
  )

  // --- Data Table ---
  autoTable(doc, {
    startY: 62,
    head: [
      [
        'Client',
        'Agent',
        'Partner',
        'Days',
        'Deposited',
        'Withdrawn',
        'Net Flow',
        'Comm. Cost',
        'LTV',
        'Monthly Rate',
      ],
    ],
    body: report.clients.map((c) => [
      c.clientName,
      c.agentName,
      c.partnerName ?? '-',
      String(c.daysSinceCreated),
      `$${c.totalDeposited.toLocaleString()}`,
      `$${c.totalWithdrawn.toLocaleString()}`,
      `$${c.netFlow.toLocaleString()}`,
      `$${c.commissionCost.toLocaleString()}`,
      `$${c.ltv.toLocaleString()}`,
      `$${c.monthlyLTV.toFixed(2)}`,
    ]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 41, 41], textColor: [255, 255, 255] },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      // Color-code negative LTV values in red
      if (data.section === 'body' && data.column.index === 8) {
        const text = String(data.cell.raw)
        if (text.startsWith('$-')) {
          data.cell.styles.textColor = [220, 38, 38]
        }
      }
    },
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
      'Content-Disposition': `attachment; filename="client-ltv-report-${date}.pdf"`,
    },
  })
}
