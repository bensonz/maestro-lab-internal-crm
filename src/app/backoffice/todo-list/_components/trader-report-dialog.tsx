'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type {
  ActionHubKPIs,
  FundAllocationEntry,
  ActionHubTodo,
  ProcessedEmailEntry,
  TodoTimelineEntry,
  DiscrepancyEntry,
  TraderReportData,
} from './types'

export interface TraderReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userName: string
  todayAllocations: FundAllocationEntry[]
  discrepancyAllocations: DiscrepancyEntry[]
  allTodos: ActionHubTodo[]
  processedEmails: ProcessedEmailEntry[]
  timeline: TodoTimelineEntry[]
  kpis: ActionHubKPIs
  traderReportData: TraderReportData | null
}

export function TraderReportDialog({
  open,
  onOpenChange,
  userName,
  todayAllocations,
  discrepancyAllocations,
  allTodos,
  processedEmails,
  timeline,
  kpis,
  traderReportData,
}: TraderReportDialogProps) {
  const today = format(new Date(), 'EEEE, MMMM d, yyyy')
  const timeNow = format(new Date(), 'h:mm a')

  // ── Fund Movement data ──
  const deposits = todayAllocations.filter((a) => a.direction === 'DEPOSIT')
  const withdrawals = todayAllocations.filter((a) => a.direction === 'WITHDRAWAL')
  const totalIn = deposits.reduce((s, a) => s + a.amount, 0)
  const totalOut = withdrawals.reduce((s, a) => s + a.amount, 0)

  // Group allocations by platform
  const allocByPlatform: Record<string, FundAllocationEntry[]> = {}
  for (const a of todayAllocations) {
    if (!allocByPlatform[a.platform]) allocByPlatform[a.platform] = []
    allocByPlatform[a.platform].push(a)
  }

  // ── VIP & Deposit Match data ──
  const vipEmails = processedEmails.filter((e) => e.detectionType === 'VIP')
  const depositMatchEmails = processedEmails.filter((e) =>
    ['FUND_DEPOSIT', 'PAYPAL'].includes(e.detectionType),
  )
  const withdrawalEmails = processedEmails.filter((e) => e.detectionType === 'FUND_WITHDRAWAL')
  const verificationEmails = processedEmails.filter((e) => e.detectionType === 'VERIFICATION')

  // Map VIP emails to trader-facing status
  const vipItems = vipEmails.map((email) => {
    const linkedTodo = email.todoId
      ? allTodos.find((t) => t.id === email.todoId)
      : null
    const completedInTimeline = timeline.some(
      (e) => e.type === 'success' && e.event.includes('VIP'),
    )
    const status = completedInTimeline || (linkedTodo === undefined && email.todoId)
      ? 'Replied'
      : linkedTodo
        ? 'Pending Reply'
        : 'Detected'

    return {
      ...email,
      platform: extractPlatform(email.from, email.subject),
      clientEmail: extractRecipient(email.subject, email.snippet),
      traderStatus: status,
    }
  })

  // Map deposit match emails to trader-facing status
  const depositMatchItems = depositMatchEmails.map((email) => {
    const hasAllocation = email.fundAllocationId !== null
    const matchedAlloc = hasAllocation
      ? todayAllocations.find((a) => a.id === email.fundAllocationId)
      : null

    let traderStatus: string
    if (matchedAlloc && matchedAlloc.confirmationStatus === 'CONFIRMED') {
      traderStatus = 'Deposited'
    } else if (hasAllocation) {
      traderStatus = 'Back Office Deposited'
    } else {
      traderStatus = 'Has Fund to Deposit'
    }

    return {
      ...email,
      platform: extractPlatform(email.from, email.subject),
      clientEmail: extractRecipient(email.subject, email.snippet),
      traderStatus,
    }
  })

  // Discrepancy items for trader attention
  const discrepancyItems = discrepancyAllocations.map((d) => ({
    platform: d.platform,
    amount: d.amount,
    direction: d.direction,
  }))

  // ── Page 2: P&L + Accounts data ──
  const pnl = traderReportData?.pnl
  const platformAccounts = traderReportData?.platformAccounts ?? []
  const sportsPlatforms = platformAccounts.filter((p) => p.category === 'sports')
  const financialPlatforms = platformAccounts.filter((p) => p.category === 'financial')
  const totalSportsBalance = sportsPlatforms.reduce((s, p) => s + p.totalBalance, 0)
  const totalFinancialBalance = financialPlatforms.reduce((s, p) => s + p.totalBalance, 0)
  const totalT1 = pnl?.byPlatform.reduce((s, p) => s + p.t1Balance, 0) ?? 0
  const totalT2 = pnl?.byPlatform.reduce((s, p) => s + p.t2Balance, 0) ?? 0

  // Yesterday's date for display
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const t1DateStr = format(yesterday, 'MMM d, yyyy')

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] w-full max-w-none flex-col gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-[210mm]"
      >
        {/* Print button (outside paper) */}
        <div className="mb-2 flex justify-end print:hidden">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2 text-xs"
            onClick={handlePrint}
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
        </div>

        {/* A4 Paper */}
        <div
          className="a4-report mx-auto w-[210mm] overflow-y-auto bg-white text-black print:overflow-visible print:shadow-none"
          style={{ maxHeight: 'calc(90vh - 60px)' }}
        >
          {/* ═══════════════════════════════════════════════ */}
          {/*  PAGE 1: Fund Movements & Platform Activity    */}
          {/* ═══════════════════════════════════════════════ */}
          <div className="p-[20mm] print:p-[15mm]">

            {/* ── Report Header ── */}
            <div className="mb-6 border-b-2 border-black pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-black">
                    Pre-Trading Daily Brief
                  </h1>
                  <p className="mt-1 text-sm text-neutral-600">
                    {today}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Maestro L.A.B
                  </p>
                  <p className="text-xs text-neutral-500">
                    Generated {timeNow} by {userName}
                  </p>
                </div>
              </div>

              {/* Quick stats */}
              <div className="mt-4 flex gap-6">
                <QuickStat label="Deposits" value={`$${totalIn.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} positive />
                <QuickStat label="Withdrawals" value={`$${totalOut.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                <QuickStat label="VIP Invites" value={String(vipItems.length)} />
                <QuickStat label="Deposit Matches" value={String(depositMatchItems.length)} />
                <QuickStat label="Unconfirmed" value={String(kpis.unconfirmedAllocations)} alert={kpis.unconfirmedAllocations > 0} />
                {discrepancyItems.length > 0 && (
                  <QuickStat label="Discrepancies" value={String(discrepancyItems.length)} alert />
                )}
              </div>
            </div>

            {/* ── Two Main Squares ── */}
            <div className="grid grid-cols-2 gap-5">

              {/* ═══ LEFT: Fund Movements ═══ */}
              <div className="rounded-lg border-2 border-neutral-300 p-4">
                <h2 className="mb-3 border-b border-neutral-200 pb-2 text-base font-bold uppercase tracking-wider text-black">
                  Fund Movements
                </h2>

                {todayAllocations.length === 0 ? (
                  <p className="py-4 text-center text-sm text-neutral-400">
                    No fund movements recorded today
                  </p>
                ) : (
                  <>
                    {/* Platform-by-platform breakdown */}
                    {Object.entries(allocByPlatform).map(([platform, allocs]) => {
                      const platDeposits = allocs.filter((a) => a.direction === 'DEPOSIT')
                      const platWithdrawals = allocs.filter((a) => a.direction === 'WITHDRAWAL')
                      const platIn = platDeposits.reduce((s, a) => s + a.amount, 0)
                      const platOut = platWithdrawals.reduce((s, a) => s + a.amount, 0)

                      return (
                        <div key={platform} className="mb-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-black">{platform}</h3>
                            <div className="flex gap-3 font-mono text-xs">
                              {platIn > 0 && <span className="text-green-700">+${platIn.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>}
                              {platOut > 0 && <span className="text-red-700">-${platOut.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>}
                            </div>
                          </div>
                          <div className="mt-1 space-y-0.5">
                            {allocs.map((a) => (
                              <div key={a.id} className="flex items-center gap-2 text-xs">
                                <span className={a.direction === 'DEPOSIT' ? 'text-green-700' : 'text-red-700'}>
                                  {a.direction === 'DEPOSIT' ? 'IN' : 'OUT'}
                                </span>
                                <span className="flex-1 text-neutral-600">
                                  ${a.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  {a.notes && ` — ${a.notes}`}
                                </span>
                                <StatusBadge
                                  status={
                                    a.confirmationStatus === 'CONFIRMED'
                                      ? a.gmailMatched ? 'Auto-Confirmed' : 'Confirmed'
                                      : a.confirmationStatus === 'DISCREPANCY' ? 'Discrepancy'
                                        : 'Unconfirmed'
                                  }
                                  color={
                                    a.confirmationStatus === 'CONFIRMED' ? 'green'
                                      : a.confirmationStatus === 'DISCREPANCY' ? 'red'
                                        : 'amber'
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}

                    {/* Totals */}
                    <div className="mt-3 border-t-2 border-neutral-300 pt-2">
                      <div className="flex items-center justify-between font-mono text-sm font-bold">
                        <span className="text-black">TOTAL</span>
                        <div className="flex gap-4">
                          <span className="text-green-700">+${totalIn.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          <span className="text-red-700">-${totalOut.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center justify-between font-mono text-xs text-neutral-500">
                        <span>Net</span>
                        <span className={totalIn - totalOut >= 0 ? 'text-green-700' : 'text-red-700'}>
                          {totalIn - totalOut >= 0 ? '+' : ''}${(totalIn - totalOut).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Discrepancies alert */}
                {discrepancyItems.length > 0 && (
                  <div className="mt-3 rounded border border-red-300 bg-red-50 p-2">
                    <p className="text-xs font-bold text-red-700">
                      {discrepancyItems.length} DISCREPANC{discrepancyItems.length === 1 ? 'Y' : 'IES'}
                    </p>
                    {discrepancyItems.map((d, i) => (
                      <p key={i} className="mt-0.5 text-xs text-red-600">
                        {d.platform} — ${d.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({d.direction})
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* ═══ RIGHT: VIP & Deposit Match ═══ */}
              <div className="rounded-lg border-2 border-neutral-300 p-4">
                <h2 className="mb-3 border-b border-neutral-200 pb-2 text-base font-bold uppercase tracking-wider text-black">
                  Platform Activity
                </h2>

                {/* VIP Invitations */}
                <div className="mb-4">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-black">
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                    VIP Invitations
                    {vipItems.length > 0 && (
                      <span className="font-mono text-xs font-normal text-neutral-500">({vipItems.length})</span>
                    )}
                  </h3>
                  {vipItems.length === 0 ? (
                    <p className="text-xs text-neutral-400">No VIP invitations detected</p>
                  ) : (
                    <div className="space-y-1">
                      {vipItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 text-xs">
                          <span className="min-w-[70px] font-semibold text-black">{item.platform}</span>
                          <span className="flex-1 truncate text-neutral-600">
                            {item.subject.length > 40 ? item.subject.slice(0, 40) + '...' : item.subject}
                          </span>
                          <StatusBadge
                            status={item.traderStatus}
                            color={item.traderStatus === 'Replied' ? 'green' : item.traderStatus === 'Pending Reply' ? 'amber' : 'gray'}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Deposit Match */}
                <div className="mb-4">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-black">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                    Deposit Match
                    {depositMatchItems.length > 0 && (
                      <span className="font-mono text-xs font-normal text-neutral-500">({depositMatchItems.length})</span>
                    )}
                  </h3>
                  {depositMatchItems.length === 0 ? (
                    <p className="text-xs text-neutral-400">No deposit matches detected</p>
                  ) : (
                    <div className="space-y-1">
                      {depositMatchItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 text-xs">
                          <span className="min-w-[70px] font-semibold text-black">{item.platform}</span>
                          <span className="flex-1 truncate text-neutral-600">
                            {item.subject.length > 40 ? item.subject.slice(0, 40) + '...' : item.subject}
                          </span>
                          <StatusBadge
                            status={item.traderStatus}
                            color={
                              item.traderStatus === 'Deposited' ? 'green'
                                : item.traderStatus === 'Back Office Deposited' ? 'blue'
                                  : 'amber'
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Withdrawal Notifications */}
                {withdrawalEmails.length > 0 && (
                  <div className="mb-4">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-black">
                      <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                      Withdrawals
                      <span className="font-mono text-xs font-normal text-neutral-500">({withdrawalEmails.length})</span>
                    </h3>
                    <div className="space-y-1">
                      {withdrawalEmails.map((email) => (
                        <div key={email.id} className="flex items-center gap-2 text-xs">
                          <span className="min-w-[70px] font-semibold text-black">
                            {extractPlatform(email.from, email.subject)}
                          </span>
                          <span className="flex-1 truncate text-neutral-600">
                            {email.subject.length > 40 ? email.subject.slice(0, 40) + '...' : email.subject}
                          </span>
                          <StatusBadge
                            status={email.fundAllocationId ? 'Recorded' : 'Pending'}
                            color={email.fundAllocationId ? 'green' : 'amber'}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Account Verifications */}
                {verificationEmails.length > 0 && (
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-black">
                      <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                      Account Verifications
                      <span className="font-mono text-xs font-normal text-neutral-500">({verificationEmails.length})</span>
                    </h3>
                    <div className="space-y-1">
                      {verificationEmails.map((email) => (
                        <div key={email.id} className="flex items-center gap-2 text-xs">
                          <span className="min-w-[70px] font-semibold text-black">
                            {extractPlatform(email.from, email.subject)}
                          </span>
                          <span className="flex-1 truncate text-neutral-600">
                            {email.subject.length > 40 ? email.subject.slice(0, 40) + '...' : email.subject}
                          </span>
                          <StatusBadge
                            status={email.todoId ? 'Sent to Client' : 'Pending'}
                            color={email.todoId ? 'green' : 'amber'}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state when nothing detected */}
                {vipItems.length === 0 && depositMatchItems.length === 0 && withdrawalEmails.length === 0 && verificationEmails.length === 0 && (
                  <div className="flex h-32 items-center justify-center">
                    <p className="text-sm text-neutral-400">No platform activity detected this week</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Pending Actions (below the 2 squares) ── */}
            {(kpis.unconfirmedAllocations > 0 || allTodos.length > 0) && (
              <div className="mt-5 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-black">
                  Pending Actions for Trader
                </h2>
                <div className="space-y-1">
                  {kpis.unconfirmedAllocations > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      <span className="text-neutral-700">
                        {kpis.unconfirmedAllocations} fund allocation{kpis.unconfirmedAllocations !== 1 ? 's' : ''} awaiting confirmation
                      </span>
                    </div>
                  )}
                  {allTodos.filter((t) => t.issueCategory.includes('Fund')).map((t) => (
                    <div key={t.id} className="flex items-center gap-2 text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      <span className="text-neutral-700">
                        {t.issueCategory}: {t.clientName}
                      </span>
                      <StatusBadge
                        status={t.overdue ? 'Overdue' : format(new Date(t.dueDate), 'MMM d')}
                        color={t.overdue ? 'red' : 'gray'}
                      />
                    </div>
                  ))}
                  {depositMatchItems.filter((d) => d.traderStatus === 'Has Fund to Deposit').map((d) => (
                    <div key={d.id} className="flex items-center gap-2 text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <span className="text-neutral-700">
                        {d.platform}: Client has funds available — needs trader deposit
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Page 1 Footer ── */}
            <div className="mt-6 border-t border-neutral-300 pt-3 text-center">
              <p className="text-[10px] text-neutral-400">
                Maestro L.A.B — Pre-Trading Daily Brief — Page 1 — {today} — {timeNow}
              </p>
              <p className="text-[9px] text-neutral-300">
                CONFIDENTIAL — For internal trading operations only
              </p>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════ */}
          {/*  PAGE 2: Portfolio & Account Status             */}
          {/* ═══════════════════════════════════════════════ */}
          {traderReportData && (
            <div className="border-t-2 border-dashed border-neutral-300 p-[20mm] print:break-before-page print:border-0 print:p-[15mm]">

              {/* ── Page 2 Header ── */}
              <div className="mb-5 border-b-2 border-black pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-black">
                      Portfolio & Account Status
                    </h1>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      Page 2 — {today}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Maestro L.A.B
                    </p>
                  </div>
                </div>
              </div>

              {/* ── P&L SUMMARY ── */}
              <div className="mb-5 rounded-lg border-2 border-neutral-300 p-4">
                <div className="mb-3 flex items-center justify-between border-b border-neutral-200 pb-2">
                  <h2 className="text-base font-bold uppercase tracking-wider text-black">
                    P&L Summary
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-500">T-1: {t1DateStr}</span>
                    <span className={cn(
                      'rounded border px-2 py-0.5 font-mono text-sm font-bold',
                      (pnl?.dailyTotal ?? 0) >= 0
                        ? 'border-green-300 bg-green-50 text-green-800'
                        : 'border-red-300 bg-red-50 text-red-800',
                    )}>
                      {(pnl?.dailyTotal ?? 0) >= 0 ? '+' : ''}${(pnl?.dailyTotal ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* P&L Table */}
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="py-1.5 text-left font-semibold text-neutral-600">Platform</th>
                      <th className="py-1.5 text-right font-semibold text-neutral-600">Accounts</th>
                      <th className="py-1.5 text-right font-semibold text-neutral-600">Close (T-1)</th>
                      <th className="py-1.5 text-right font-semibold text-neutral-600">Close (T-2)</th>
                      <th className="py-1.5 text-right font-semibold text-neutral-600">Daily P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pnl?.byPlatform.map((p) => (
                      <tr key={p.platform} className="border-b border-neutral-100">
                        <td className="py-1.5 font-medium text-black">
                          {p.name}
                          <span className="ml-1.5 text-neutral-400">({p.abbrev})</span>
                        </td>
                        <td className="py-1.5 text-right font-mono text-neutral-600">{p.accountCount}</td>
                        <td className="py-1.5 text-right font-mono text-neutral-700">${p.t1Balance.toLocaleString()}</td>
                        <td className="py-1.5 text-right font-mono text-neutral-500">${p.t2Balance.toLocaleString()}</td>
                        <td className={cn(
                          'py-1.5 text-right font-mono font-semibold',
                          p.dailyPnL >= 0 ? 'text-green-700' : 'text-red-700',
                        )}>
                          {p.dailyPnL >= 0 ? '+' : ''}${p.dailyPnL.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-neutral-300">
                      <td className="py-2 font-bold text-black">TOTAL</td>
                      <td className="py-2 text-right font-mono font-bold text-black">
                        {pnl?.byPlatform.reduce((s, p) => s + p.accountCount, 0) ?? 0}
                      </td>
                      <td className="py-2 text-right font-mono font-bold text-black">${totalT1.toLocaleString()}</td>
                      <td className="py-2 text-right font-mono text-neutral-500">${totalT2.toLocaleString()}</td>
                      <td className={cn(
                        'py-2 text-right font-mono font-bold',
                        (pnl?.dailyTotal ?? 0) >= 0 ? 'text-green-700' : 'text-red-700',
                      )}>
                        {(pnl?.dailyTotal ?? 0) >= 0 ? '+' : ''}${(pnl?.dailyTotal ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* ── ACTIVE ACCOUNTS ── */}
              <div className="rounded-lg border-2 border-neutral-300 p-4">
                <h2 className="mb-3 border-b border-neutral-200 pb-2 text-base font-bold uppercase tracking-wider text-black">
                  Active Accounts
                </h2>

                {/* Sportsbooks */}
                {sportsPlatforms.length > 0 && (
                  <div className="mb-4">
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Sportsbooks
                    </h3>
                    {sportsPlatforms.map((pg) => (
                      <PlatformAccountTable key={pg.platform} group={pg} />
                    ))}
                  </div>
                )}

                {/* Financial (Bankroll) */}
                {financialPlatforms.length > 0 && (
                  <div className="mb-3">
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Financial (Bankroll)
                    </h3>
                    {financialPlatforms.map((pg) => (
                      <PlatformAccountTable key={pg.platform} group={pg} />
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {platformAccounts.length === 0 && (
                  <div className="flex h-24 items-center justify-center">
                    <p className="text-sm text-neutral-400">No balance snapshots recorded — upload daily screenshots to populate</p>
                  </div>
                )}

                {/* Totals Bar */}
                {platformAccounts.length > 0 && (
                  <div className="mt-3 border-t-2 border-neutral-300 pt-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-4 text-xs">
                          <span className="font-semibold text-black">TOTAL SPORTSBOOK BALANCE:</span>
                          <span className="font-mono font-bold text-black">${totalSportsBalance.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="font-semibold text-neutral-600">TOTAL BANKROLL (Financial):</span>
                          <span className="font-mono font-bold text-neutral-600">${totalFinancialBalance.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-neutral-400">Grand Total</p>
                        <p className="font-mono text-lg font-bold text-black">
                          ${(totalSportsBalance + totalFinancialBalance).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Page 2 Footer ── */}
              <div className="mt-6 border-t border-neutral-300 pt-3 text-center">
                <p className="text-[10px] text-neutral-400">
                  Maestro L.A.B — Pre-Trading Daily Brief — Page 2 — {today} — {timeNow}
                </p>
                <p className="text-[9px] text-neutral-300">
                  CONFIDENTIAL — For internal trading operations only
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Platform Account Table (per-platform group) ──────────

function PlatformAccountTable({ group }: { group: import('@/types/backend-types').TraderPlatformGroup }) {
  const statusCounts = [
    group.vipCount > 0 && `${group.vipCount} VIP`,
    group.semiLimitedCount > 0 && `${group.semiLimitedCount} Semi-Ltd`,
    group.activeCount > 0 && `${group.activeCount} Active`,
  ].filter(Boolean).join(', ')

  return (
    <div className="mb-3" data-testid={`platform-accounts-${group.platform}`}>
      <div className="mb-1 flex items-center justify-between">
        <h4 className="text-xs font-bold text-black">
          {group.name}
          <span className="ml-1 text-neutral-400">({group.abbrev})</span>
          <span className="ml-2 font-mono text-[10px] font-normal text-neutral-500">
            — {group.accounts.length} account{group.accounts.length !== 1 ? 's' : ''}
            {statusCounts && ` (${statusCounts})`}
          </span>
        </h4>
        <span className="font-mono text-xs font-bold text-black">
          ${group.totalBalance.toLocaleString()}
        </span>
      </div>

      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b border-neutral-200">
            <th className="py-1 text-left font-semibold text-neutral-500">Client</th>
            <th className="py-1 text-left font-semibold text-neutral-500">Agent</th>
            <th className="py-1 text-right font-semibold text-neutral-500">Balance</th>
            <th className="py-1 text-right font-semibold text-neutral-500">Daily</th>
            <th className="py-1 text-right font-semibold text-neutral-500">Lifetime</th>
            <th className="py-1 text-right font-semibold text-neutral-500">Status</th>
          </tr>
        </thead>
        <tbody>
          {group.accounts.map((acc) => (
            <tr key={acc.clientId} className="border-b border-neutral-50">
              <td className="py-1 font-medium text-black">{acc.clientName}</td>
              <td className="py-1 text-neutral-600">{acc.agentName}</td>
              <td className="py-1 text-right font-mono text-neutral-700">${acc.balance.toLocaleString()}</td>
              <td className={cn(
                'py-1 text-right font-mono font-semibold',
                acc.dailyPnL >= 0 ? 'text-green-700' : 'text-red-700',
              )}>
                {acc.dailyPnL >= 0 ? '+' : ''}${acc.dailyPnL.toLocaleString()}
              </td>
              <td className={cn(
                'py-1 text-right font-mono',
                acc.lifetimePnL >= 0 ? 'text-green-600' : 'text-red-600',
              )}>
                {acc.lifetimePnL >= 0 ? '+' : ''}${acc.lifetimePnL.toLocaleString()}
              </td>
              <td className="py-1 text-right">
                <AccountStatusBadge status={acc.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Account Status Badge ──────────────────────────────────

function AccountStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'VIP': 'bg-amber-100 text-amber-800 border-amber-300',
    'Semi-Limited': 'bg-orange-100 text-orange-800 border-orange-300',
    'Active': 'bg-green-100 text-green-800 border-green-200',
    'Limited': 'bg-red-100 text-red-700 border-red-200',
    'Dead': 'bg-neutral-200 text-neutral-500 border-neutral-300',
  }

  return (
    <span className={cn(
      'inline-block whitespace-nowrap rounded border px-1 py-px text-[9px] font-semibold',
      styles[status] ?? styles['Active'],
    )}>
      {status}
    </span>
  )
}

// ── Helpers ─────────────────────────────────────────────

function extractPlatform(from: string, subject: string): string {
  const text = (from + ' ' + subject).toLowerCase()
  if (text.includes('draftkings') || text.includes('dk')) return 'DraftKings'
  if (text.includes('fanduel') || text.includes('fd')) return 'FanDuel'
  if (text.includes('betmgm') || text.includes('mgm')) return 'BetMGM'
  if (text.includes('caesars') || text.includes('czr')) return 'Caesars'
  if (text.includes('fanatics')) return 'Fanatics'
  if (text.includes('ballybet') || text.includes('bally')) return 'Bally Bet'
  if (text.includes('betrivers')) return 'BetRivers'
  if (text.includes('bet365') || text.includes('365')) return 'Bet365'
  if (text.includes('paypal')) return 'PayPal'
  if (text.includes('edgeboost')) return 'EdgeBoost'
  return 'Unknown'
}

function extractRecipient(subject: string, snippet: string | null): string {
  return snippet ? snippet.slice(0, 30) : subject.slice(0, 30)
}

function StatusBadge({ status, color }: { status: string; color: 'green' | 'red' | 'amber' | 'blue' | 'gray' }) {
  const colors = {
    green: 'bg-green-100 text-green-800 border-green-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    amber: 'bg-amber-100 text-amber-800 border-amber-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    gray: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  }

  return (
    <span className={cn(
      'shrink-0 whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-semibold',
      colors[color],
    )}>
      {status}
    </span>
  )
}

function QuickStat({ label, value, positive, alert }: { label: string; value: string; positive?: boolean; alert?: boolean }) {
  return (
    <div>
      <p className={cn(
        'font-mono text-base font-bold',
        alert ? 'text-red-700' : positive ? 'text-green-700' : 'text-black',
      )}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</p>
    </div>
  )
}
