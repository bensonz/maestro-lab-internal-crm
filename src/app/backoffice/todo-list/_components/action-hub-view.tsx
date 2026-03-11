'use client'

import { BackofficeHeader } from './backoffice-header'
import { FundRecordPanel } from './fund-record-panel'
import { DeviceManagementPanel } from './overdue-devices-panel'
import { FundVerificationPanel } from './fund-verification-panel'
import { FundInsightsPanel } from './fund-insights-panel'
import { AgentContactPanel } from './agent-contact-panel'
import { DailyRoutine } from './daily-routine'
import type { ActionHubViewProps } from './types'

export function ActionHubView({
  userName,
  userRole,
  kpis,
  motivation,
  dailyRundown,
  todayAllocations,
  yesterdayAllocCount,
  overdueDevices,
  deviceReservations,
  verificationAllocations,
  unconfirmedAllocations,
  discrepancyAllocations,
  lastGmailSync,
  processedEmails,
  gmailMatchedCount,
  allTodos,
  timeline,
  traderReportData,
}: ActionHubViewProps) {
  return (
    <div
      className="animate-fade-in space-y-4 p-4 md:p-6"
      data-testid="action-hub-view"
    >
      {/* Greeting + Generate Report */}
      <BackofficeHeader
        userName={userName}
        userRole={userRole}
        kpis={kpis}
        motivation={motivation}
        todayAllocations={todayAllocations}
        overdueDevices={overdueDevices}
        deviceReservations={deviceReservations}
        unconfirmedAllocations={unconfirmedAllocations}
        discrepancyAllocations={discrepancyAllocations}
        allTodos={allTodos}
        processedEmails={processedEmails}
        timeline={timeline}
        traderReportData={traderReportData}
      />

      {/* Row 1: Fund Allocation | Verification & Review */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        <FundRecordPanel
          allocations={todayAllocations}
          yesterdayCount={yesterdayAllocCount}
        />
        <FundVerificationPanel
          verificationAllocations={verificationAllocations}
          lastGmailSync={lastGmailSync}
        />
      </div>

      {/* Row 2: Fund Movement Insights | Device Management */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        <FundInsightsPanel
          processedEmails={processedEmails}
          gmailMatchedCount={gmailMatchedCount}
        />
        <DeviceManagementPanel
          overdueDevices={overdueDevices}
          reservations={deviceReservations}
        />
      </div>

      {/* Row 3: Daily Routine (1/3) | Agent Contact (2/3) */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1fr_2fr]">
        <DailyRoutine kpis={kpis} />
        <AgentContactPanel todos={allTodos} />
      </div>
    </div>
  )
}
