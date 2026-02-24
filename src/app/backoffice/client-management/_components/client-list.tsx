'use client'

import { Search, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import type { Client, ViewPlatformStatus } from './types'

function formatDaysSinceActive(dateStr: string): string {
  const start = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - start.getTime()
  const totalDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  const weeks = Math.floor(totalDays / 7)
  const days = totalDays % 7
  if (weeks === 0) return `${days}D`
  return `${weeks}W${days}D`
}

function formatIntakeStatus(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Pending',
    PHONE_ISSUED: 'Phone Issued',
    IN_EXECUTION: 'In Execution',
    NEEDS_MORE_INFO: 'Needs More Info',
    PENDING_EXTERNAL: 'Pending External',
    EXECUTION_DELAYED: 'Delayed',
    INACTIVE: 'Inactive',
    READY_FOR_APPROVAL: 'Ready for Approval',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    PARTNERSHIP_ENDED: 'Partnership Ended',
  }
  return map[status] || status
}

interface ClientListProps {
  clients: Client[]
  searchQuery: string
  onSearchChange: (q: string) => void
  onSelectClient: (client: Client) => void
}

export function ClientList({
  clients,
  searchQuery,
  onSearchChange,
  onSelectClient,
}: ClientListProps) {
  return (
    <div
      className="flex-1 space-y-4 overflow-auto p-6"
      data-testid="client-list-section"
    >
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients or agents..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-background/50 pl-10"
          data-testid="client-search"
        />
      </div>

      {/* Client Directory */}
      <Card className="card-terminal">
        <CardHeader className="border-b border-border px-4 py-3">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Client Registry ({clients.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <th className="w-[100px] px-2 py-2 text-left font-medium">Name</th>
                  <th className="whitespace-nowrap px-2 py-2 text-left font-medium">Phone</th>
                  <th className="w-[120px] px-2 py-2 text-left font-medium">Co.Email</th>
                  <th className="w-[80px] px-2 py-2 text-left font-medium">Active</th>
                  <th className="w-[60px] px-2 py-2 text-right font-medium">Funds</th>
                  <th className="px-2 py-2 text-left font-medium">Platforms</th>
                  <th className="px-2 py-2 text-left font-medium">Finance</th>
                  <th className="w-[24px] px-1 py-2 text-right font-medium" />
                </tr>
              </thead>
              <tbody>
                  {clients.map((client) => {
                    const statusOrder: Record<string, number> = { active: 0, pipeline: 1, limited: 2, dead: 3 }
                    const sortedSportsbooks = [...client.bettingPlatforms].sort(
                      (a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9),
                    )
                    const financeAbbrMap: Record<string, string> = { paypal: 'PP', bank: 'B', edgeboost: 'EB' }
                    const financeStatusMap: Record<string, ViewPlatformStatus> = {
                      active: 'active', permanent_limited: 'limited', rejected: 'dead', pipeline: 'pipeline',
                    }
                    const sortedFinance = client.financePlatforms
                      .map((fp) => ({
                        id: `finance-${fp.type}`,
                        name: fp.name,
                        abbr: financeAbbrMap[fp.type] || fp.type,
                        status: financeStatusMap[fp.status] || ('pipeline' as ViewPlatformStatus),
                        balance: fp.balance,
                      }))
                      .sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9))
                    return (
                      <tr
                        key={client.id}
                        className="group cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/30"
                        onClick={() => onSelectClient(client)}
                        data-testid={`client-row-${client.id}`}
                      >
                        {/* Name with HoverCard */}
                        <td className="px-2 py-2">
                          <HoverCard openDelay={200} closeDelay={100}>
                            <HoverCardTrigger asChild>
                              <span
                                className="cursor-default truncate font-medium"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {client.name}
                              </span>
                            </HoverCardTrigger>
                            <HoverCardContent
                              side="right"
                              align="start"
                              className="w-56 p-3"
                            >
                              <div className="space-y-1.5 text-xs text-muted-foreground">
                                {client.agent && (
                                  <p>
                                    <span className="font-medium text-foreground">
                                      Agent:
                                    </span>{' '}
                                    {client.agent}
                                  </p>
                                )}
                                <p>
                                  <span className="font-medium text-foreground">
                                    State:
                                  </span>{' '}
                                  {client.quickInfo.state}
                                </p>
                                <p>
                                  <span className="font-medium text-foreground">
                                    Zelle:
                                  </span>{' '}
                                  {client.quickInfo.zellePhone}
                                </p>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        </td>

                        {/* Phone */}
                        <td className="whitespace-nowrap px-2 py-2 font-mono text-xs text-muted-foreground">
                          {client.companyPhone}
                        </td>

                        {/* Email */}
                        <td className="px-2 py-2">
                          <span className="block max-w-[120px] truncate text-xs text-muted-foreground">
                            {client.companyEmail}
                          </span>
                        </td>

                        {/* Days Since Active + Paid */}
                        <td className="whitespace-nowrap px-2 py-2 font-mono text-xs text-muted-foreground">
                          {formatDaysSinceActive(client.startDate)} ${client.totalPaid.toLocaleString()}
                        </td>

                        {/* Funds */}
                        <td className="px-2 py-2 text-right font-mono text-xs font-semibold">
                          ${client.totalFunds.toLocaleString()}
                        </td>

                        {/* Sportsbook Platforms */}
                        <td className="px-2 py-2">
                          <div className="flex flex-wrap gap-0.5">
                            {sortedSportsbooks.map((platform) => {
                              const colorClass =
                                platform.status === 'active'
                                  ? 'border-success/30 bg-success/20 text-success'
                                  : platform.status === 'limited'
                                    ? 'border-warning/30 bg-warning/20 text-warning'
                                    : platform.status === 'dead'
                                      ? 'border-destructive/30 bg-destructive/20 text-destructive'
                                      : 'border-primary/30 bg-primary/20 text-primary'
                              return (
                                <HoverCard key={platform.id} openDelay={200} closeDelay={100}>
                                  <HoverCardTrigger asChild>
                                    <span
                                      className={`cursor-default rounded border px-1 text-[9px] font-medium ${colorClass}`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {platform.abbr}
                                    </span>
                                  </HoverCardTrigger>
                                  <HoverCardContent side="top" align="start" className="w-auto p-3">
                                    <div className="space-y-1.5 text-xs text-muted-foreground">
                                      <p className="font-medium text-foreground">{platform.name}</p>
                                      <p><span className="font-medium text-foreground">Balance:</span> ${platform.balance.toLocaleString()}</p>
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              )
                            })}
                            {sortedSportsbooks.length === 0 && (
                              <span className="text-[9px] text-muted-foreground">&mdash;</span>
                            )}
                          </div>
                        </td>

                        {/* Finance Platforms */}
                        <td className="px-2 py-2">
                          <div className="flex flex-wrap gap-0.5">
                            {sortedFinance.map((platform) => {
                              const isBankAlert = platform.abbr === 'B' && platform.status !== 'active'
                              const colorClass = isBankAlert
                                ? 'animate-pulse border-destructive bg-destructive/30 text-destructive'
                                : platform.status === 'active'
                                  ? 'border-success/30 bg-success/20 text-success'
                                  : platform.status === 'limited'
                                    ? 'border-warning/30 bg-warning/20 text-warning'
                                    : platform.status === 'dead'
                                      ? 'border-destructive/30 bg-destructive/20 text-destructive'
                                      : 'border-primary/30 bg-primary/20 text-primary'
                              return (
                                <HoverCard key={platform.id} openDelay={200} closeDelay={100}>
                                  <HoverCardTrigger asChild>
                                    <span
                                      className={`cursor-default rounded border px-1 text-[9px] font-medium ${colorClass}`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {platform.abbr}
                                    </span>
                                  </HoverCardTrigger>
                                  <HoverCardContent side="top" align="start" className="w-auto p-3">
                                    <div className="space-y-1.5 text-xs text-muted-foreground">
                                      <p className="font-medium text-foreground">{platform.name}</p>
                                      <p><span className="font-medium text-foreground">Balance:</span> ${platform.balance.toLocaleString()}</p>
                                      {isBankAlert && (
                                        <p className="font-medium text-destructive">Agent must contact client to activate bank</p>
                                      )}
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              )
                            })}
                            {sortedFinance.length === 0 && (
                              <span className="text-[9px] text-muted-foreground">&mdash;</span>
                            )}
                          </div>
                        </td>

                        <td className="px-1 py-2 text-right">
                          <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
          {clients.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              No clients match your search
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
