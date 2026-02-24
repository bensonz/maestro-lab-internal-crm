'use client'

import { Search, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Client } from './types'

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
                  <th className="w-[120px] px-3 py-2 text-left font-medium">Name</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Phone</th>
                  <th className="w-[140px] px-3 py-2 text-left font-medium">Co.Email</th>
                  <th className="w-[100px] px-3 py-2 text-left font-medium">Active</th>
                  <th className="w-[70px] px-3 py-2 text-right font-medium">Funds</th>
                  <th className="px-3 py-2 text-left font-medium">
                    <span className="text-success">Active</span>
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    <span className="text-warning">Limited</span>
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    <span className="text-primary">Pipeline</span>
                  </th>
                  <th className="w-[32px] px-3 py-2 text-right font-medium" />
                </tr>
              </thead>
              <tbody>
                <TooltipProvider delayDuration={200}>
                  {clients.map((client) => {
                    const activePlatforms = client.bettingPlatforms.filter(
                      (p) => p.status === 'active',
                    )
                    const limitedPlatforms = client.bettingPlatforms.filter(
                      (p) => p.status === 'limited',
                    )
                    const pipelinePlatforms = client.bettingPlatforms.filter(
                      (p) => p.status === 'pipeline',
                    )

                    return (
                      <tr
                        key={client.id}
                        className="group cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/30"
                        onClick={() => onSelectClient(client)}
                        data-testid={`client-row-${client.id}`}
                      >
                        {/* Name with HoverCard */}
                        <td className="px-3 py-2">
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
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted-foreground">
                          {client.companyPhone}
                        </td>

                        {/* Email */}
                        <td className="px-3 py-2">
                          <span className="max-w-[160px] truncate text-xs text-muted-foreground">
                            {client.companyEmail}
                          </span>
                        </td>

                        {/* Days Since Active + Paid */}
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                          {formatDaysSinceActive(client.startDate)} ${client.totalPaid.toLocaleString()}
                        </td>

                        {/* Funds */}
                        <td className="px-3 py-2 text-right font-mono text-xs font-semibold">
                          ${client.totalFunds.toLocaleString()}
                        </td>

                        {/* Active Platforms */}
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-0.5">
                            {activePlatforms.map((platform) => (
                              <Tooltip key={platform.id}>
                                <TooltipTrigger asChild>
                                  <span
                                    className="cursor-help rounded border border-success/30 bg-success/20 px-1 text-[9px] font-medium text-success"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {platform.abbr}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="space-y-1 p-2"
                                >
                                  <p className="text-xs font-semibold">
                                    {platform.name}
                                  </p>
                                  <div className="space-y-0.5 text-[10px] text-muted-foreground">
                                    <p>
                                      <span className="text-foreground">
                                        Balance:
                                      </span>{' '}
                                      ${platform.balance.toLocaleString()}
                                    </p>
                                    <p>
                                      <span className="text-foreground">
                                        Started:
                                      </span>{' '}
                                      {platform.startDate}
                                    </p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                            {activePlatforms.length === 0 && (
                              <span className="text-[9px] text-muted-foreground">
                                &mdash;
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Limited Platforms */}
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-0.5">
                            {limitedPlatforms.map((platform) => {
                              const pnl =
                                (platform.deposits || 0) -
                                (platform.withdrawals || 0)
                              return (
                                <Tooltip key={platform.id}>
                                  <TooltipTrigger asChild>
                                    <span
                                      className="cursor-help rounded border border-warning/30 bg-warning/20 px-1 text-[9px] font-medium text-warning"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {platform.abbr}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="space-y-1 p-2"
                                  >
                                    <p className="text-xs font-semibold">
                                      {platform.name}
                                    </p>
                                    <div className="space-y-0.5 text-[10px] text-muted-foreground">
                                      <p>
                                        <span className="text-foreground">
                                          Balance:
                                        </span>{' '}
                                        ${platform.balance.toLocaleString()}
                                      </p>
                                      <p>
                                        <span className="text-foreground">
                                          PnL:
                                        </span>{' '}
                                        <span
                                          className={
                                            pnl >= 0
                                              ? 'text-success'
                                              : 'text-destructive'
                                          }
                                        >
                                          {pnl >= 0 ? '+' : ''}
                                          {pnl.toLocaleString()}
                                        </span>
                                      </p>
                                      <p>
                                        <span className="text-foreground">
                                          Started:
                                        </span>{' '}
                                        {platform.startDate}
                                      </p>
                                      {platform.endDate && (
                                        <p>
                                          <span className="text-foreground">
                                            Ended:
                                          </span>{' '}
                                          {platform.endDate}
                                        </p>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              )
                            })}
                            {limitedPlatforms.length === 0 && (
                              <span className="text-[9px] text-muted-foreground">
                                &mdash;
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Pipeline Platforms */}
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-0.5">
                            {pipelinePlatforms.map((platform) => (
                              <span
                                key={platform.id}
                                className="rounded border border-primary/30 bg-primary/20 px-1 text-[9px] font-medium text-primary"
                              >
                                {platform.abbr}
                              </span>
                            ))}
                            {pipelinePlatforms.length === 0 && (
                              <span className="text-[9px] text-muted-foreground">
                                &mdash;
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-2 text-right">
                          <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
                        </td>
                      </tr>
                    )
                  })}
                </TooltipProvider>
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
