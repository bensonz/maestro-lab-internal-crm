'use client'

import { Search, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Client } from './types'

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
          placeholder="Search clients..."
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
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-left font-medium">Phone</th>
                  <th className="px-3 py-2 text-left font-medium">Email</th>
                  <th className="px-3 py-2 text-left font-medium">Start</th>
                  <th className="px-3 py-2 text-right font-medium">Funds</th>
                  <th className="px-3 py-2 text-left font-medium">
                    <span className="text-success">Active</span>
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    <span className="text-warning">Limited</span>
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    <span className="text-primary">Pipeline</span>
                  </th>
                  <th className="px-3 py-2 text-right font-medium" />
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
                        {/* Name with quick-info tooltip */}
                        <td className="px-3 py-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help truncate font-medium">
                                {client.name}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="space-y-1.5 p-3"
                            >
                              <p className="text-sm font-semibold">
                                {client.name}
                              </p>
                              <div className="space-y-1 text-xs text-muted-foreground">
                                <p>
                                  <span className="font-medium text-foreground">
                                    Status:
                                  </span>{' '}
                                  <span className={cn(
                                    client.status === 'active' && 'text-success',
                                    client.status === 'ended' && 'text-destructive',
                                    client.status === 'verification_needed' && 'text-warning',
                                  )}>
                                    {client.intakeStatus ? formatIntakeStatus(client.intakeStatus) : client.status}
                                  </span>
                                </p>
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
                                    Platforms:
                                  </span>{' '}
                                  {client.bettingPlatforms.length > 0
                                    ? client.bettingPlatforms.map(p => p.abbr).join(', ')
                                    : '—'}
                                </p>
                                {client.quickInfo.zellePhone !== '—' && (
                                  <p>
                                    <span className="font-medium text-foreground">
                                      Zelle:
                                    </span>{' '}
                                    {client.quickInfo.zellePhone}
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </td>

                        {/* Phone */}
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                          {client.companyPhone}
                        </td>

                        {/* Email */}
                        <td className="px-3 py-2">
                          <span className="max-w-[160px] truncate text-xs text-muted-foreground">
                            {client.companyEmail}
                          </span>
                        </td>

                        {/* Start */}
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {client.startDate}
                        </td>

                        {/* Funds */}
                        <td className="px-3 py-2 text-right font-mono text-xs font-semibold">
                          ${client.totalFunds.toLocaleString()}
                        </td>

                        {/* Active Platforms */}
                        <td className="px-3 py-2">
                          <div className="flex gap-0.5">
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
                          <div className="flex gap-0.5">
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
                          <div className="flex gap-0.5">
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
