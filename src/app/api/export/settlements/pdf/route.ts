import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { auth } from '@/backend/auth'
import { UserRole } from '@/types'
import { getClientsForSettlement } from '@/backend/data/operations'

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
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  // --- Header ---
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Settlement Report', 14, 20)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  const date = new Date().toISOString().split('T')[0]
  doc.text(`Generated ${date} by ${session.user.name ?? 'Unknown'}`, 14, 28)
  doc.setTextColor(0, 0, 0)

  // Horizontal rule
  doc.setDrawColor(200, 200, 200)
  doc.line(14, 32, pageWidth - 14, 32)

  let cursorY = 40

  // --- Per-client sections ---
  for (const client of clients) {
    // Check if we need a new page (need at least 60pt for client header + tables)
    if (cursorY > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage()
      cursorY = 20
    }

    // Client header
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(client.name, 14, cursorY)
    cursorY += 6

    // Summary line
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Deposited: $${client.totalDeposited.toLocaleString()}  |  Withdrawn: $${client.totalWithdrawn.toLocaleString()}  |  Net: $${client.netBalance.toLocaleString()}`,
      14,
      cursorY,
    )
    cursorY += 5

    // Settlement status bar
    doc.setTextColor(100, 100, 100)
    doc.text(
      `Pending: ${client.settlementCounts.pendingReview}  |  Confirmed: ${client.settlementCounts.confirmed}  |  Rejected: ${client.settlementCounts.rejected}`,
      14,
      cursorY,
    )
    doc.setTextColor(0, 0, 0)
    cursorY += 6

    // Platform breakdown table
    if (client.platforms.length > 0) {
      autoTable(doc, {
        startY: cursorY,
        head: [['Platform', 'Category', 'Deposited', 'Withdrawn', 'Net']],
        body: client.platforms.map((p) => [
          p.name,
          p.category,
          `$${p.deposited.toLocaleString()}`,
          `$${p.withdrawn.toLocaleString()}`,
          `$${(p.deposited - p.withdrawn).toLocaleString()}`,
        ]),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [41, 41, 41], textColor: [255, 255, 255] },
        margin: { left: 14, right: 14 },
      })
      cursorY = doc.lastAutoTable.finalY + 4
    }

    // Transactions table
    if (client.recentTransactions.length > 0) {
      autoTable(doc, {
        startY: cursorY,
        head: [
          [
            'Date',
            'Type',
            'Platform',
            'Amount',
            'Status',
            'Settlement',
            'Reviewed By',
          ],
        ],
        body: client.recentTransactions.map((tx) => [
          tx.date,
          tx.type === 'deposit' ? 'Deposit' : 'Withdrawal',
          tx.platform,
          `$${tx.amount.toLocaleString()}`,
          tx.status,
          STATUS_LABELS[tx.settlementStatus] ?? tx.settlementStatus,
          tx.reviewedBy ?? '',
        ]),
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
        margin: { left: 14, right: 14 },
      })
      cursorY = doc.lastAutoTable.finalY + 15
    } else {
      cursorY += 15
    }
  }

  // --- Footer on each page ---
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const pageHeight = doc.internal.pageSize.getHeight()

    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)

    const footerText = 'Maestro L.A.B — Confidential'
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
      'Content-Disposition': `attachment; filename="settlement-report-${date}.pdf"`,
    },
  })
}
