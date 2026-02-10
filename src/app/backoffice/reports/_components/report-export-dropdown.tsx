'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'

export function ReportExportDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="gap-2"
          data-testid="report-export-btn"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          data-testid="export-partner-csv"
          onClick={() => {
            window.location.href = '/api/export/reports/partner-profit'
          }}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Partner Profit CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          data-testid="export-partner-pdf"
          onClick={() => {
            window.location.href = '/api/export/reports/partner-profit/pdf'
          }}
        >
          <FileText className="mr-2 h-4 w-4" />
          Partner Profit PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-testid="export-agent-csv"
          onClick={() => {
            window.location.href = '/api/export/reports/agent-commission'
          }}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Agent Commission CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          data-testid="export-agent-pdf"
          onClick={() => {
            window.location.href = '/api/export/reports/agent-commission/pdf'
          }}
        >
          <FileText className="mr-2 h-4 w-4" />
          Agent Commission PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-testid="export-ltv-csv"
          onClick={() => {
            window.location.href = '/api/export/reports/client-ltv'
          }}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Client LTV CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          data-testid="export-ltv-pdf"
          onClick={() => {
            window.location.href = '/api/export/reports/client-ltv/pdf'
          }}
        >
          <FileText className="mr-2 h-4 w-4" />
          Client LTV PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
