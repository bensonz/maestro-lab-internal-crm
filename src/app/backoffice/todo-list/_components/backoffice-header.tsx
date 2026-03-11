'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TraderReportDialog } from './trader-report-dialog'
import type {
  ActionHubKPIs,
  MotivationData,
  FundAllocationEntry,
  OverdueDevice,
  DeviceReservation,
  ActionHubTodo,
  ProcessedEmailEntry,
  TodoTimelineEntry,
  DiscrepancyEntry,
  TraderReportData,
} from './types'

interface BackofficeHeaderProps {
  userName: string
  userRole: string
  kpis: ActionHubKPIs
  motivation: MotivationData
  todayAllocations: FundAllocationEntry[]
  overdueDevices: OverdueDevice[]
  deviceReservations: DeviceReservation[]
  unconfirmedAllocations: FundAllocationEntry[]
  discrepancyAllocations: DiscrepancyEntry[]
  allTodos: ActionHubTodo[]
  processedEmails: ProcessedEmailEntry[]
  timeline: TodoTimelineEntry[]
  traderReportData: TraderReportData | null
}

export function BackofficeHeader({
  userName,
  userRole,
  kpis,
  motivation,
  todayAllocations,
  overdueDevices,
  deviceReservations,
  unconfirmedAllocations,
  discrepancyAllocations,
  allTodos,
  processedEmails,
  timeline,
  traderReportData,
}: BackofficeHeaderProps) {
  const [reportOpen, setReportOpen] = useState(false)
  const firstName = userName.split(' ')[0]
  const h = new Date().getHours()
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      <div
        className="card-terminal flex items-center justify-between border border-border/50 px-5 py-3"
        data-testid="action-hub-header"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{greeting}, {firstName}</span>
          <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase text-primary">
            {userRole}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 text-xs"
          onClick={() => setReportOpen(true)}
          data-testid="generate-report-btn"
        >
          <FileText className="h-3.5 w-3.5" />
          Generate Today&apos;s Report
        </Button>
      </div>

      <TraderReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        userName={userName}
        todayAllocations={todayAllocations}
        discrepancyAllocations={discrepancyAllocations}
        allTodos={allTodos}
        processedEmails={processedEmails}
        timeline={timeline}
        kpis={kpis}
        traderReportData={traderReportData}
      />
    </>
  )
}
