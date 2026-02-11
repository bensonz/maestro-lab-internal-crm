'use client'

import { useTransition } from 'react'
import {
  ChevronDown,
  Building,
  Eye,
  DollarSign,
  List,
  Printer,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Collapsible,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { updatePlatformStatus } from '@/app/actions/backoffice'
import { EditableField } from './editable-field'
import type {
  Client,
  BettingPlatform,
  ViewPlatformStatus,
  FinancePlatformStatus,
} from './types'

// ============================================================================
// Helpers
// ============================================================================

function getPlatformStatusColor(
  status: ViewPlatformStatus | FinancePlatformStatus,
): string {
  switch (status) {
    case 'active':
      return 'bg-success/20 text-success'
    case 'limited':
      return 'bg-warning/20 text-warning'
    case 'pipeline':
      return 'bg-primary/20 text-primary'
    case 'dead':
    case 'permanent_limited':
    case 'rejected':
      return 'bg-destructive/20 text-destructive'
  }
}

function getBettingPlatformStatusColor(status: ViewPlatformStatus): string {
  switch (status) {
    case 'active':
      return 'bg-success/20 text-success border-success/40'
    case 'limited':
      return 'bg-warning/20 text-warning border-warning/40'
    case 'pipeline':
      return 'bg-primary/20 text-primary border-primary/40'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

function sortPlatformsByStatus(platforms: BettingPlatform[]): BettingPlatform[] {
  const statusOrder: Record<ViewPlatformStatus, number> = {
    active: 0,
    pipeline: 1,
    limited: 2,
    dead: 3,
  }
  return [...platforms].sort(
    (a, b) => statusOrder[a.status] - statusOrder[b.status],
  )
}

function calculateBettingPnL(client: Client): number {
  return client.bettingPlatforms.reduce(
    (sum, p) => sum + (p.deposits || 0) - (p.withdrawals || 0),
    0,
  )
}

function calculateTotalFunds(client: Client): number {
  const financeFunds = client.financePlatforms.reduce(
    (sum, p) => sum + p.balance,
    0,
  )
  const bettingFunds = client.bettingPlatforms.reduce(
    (sum, p) => sum + p.balance,
    0,
  )
  return financeFunds + bettingFunds
}

// ============================================================================
// Component
// ============================================================================

interface PlatformSectionProps {
  client: Client
  selectedPlatform: string | null
  onSelectPlatform: (name: string) => void
  expandedPlatforms: string[]
  onTogglePlatformExpanded: (name: string) => void
  onViewCredentialsScreenshots: () => void
  onViewAllTransactions: () => void
  onViewDocument: (url: string, type: string) => void
  onFieldEdit?: (fieldKey: string, oldValue: string, newValue: string) => void
}

// Map platform display name to DB PlatformType enum
const PLATFORM_NAME_TO_TYPE: Record<string, string> = {
  PayPal: 'PAYPAL',
  Bank: 'BANK',
  Edgeboost: 'EDGEBOOST',
  DraftKings: 'DRAFTKINGS',
  FanDuel: 'FANDUEL',
  BetMGM: 'BETMGM',
  Caesars: 'CAESARS',
  Fanatics: 'FANATICS',
  BallyBet: 'BALLYBET',
  BetRivers: 'BETRIVERS',
  Bet365: 'BET365',
}

export function PlatformSection({
  client,
  selectedPlatform,
  onSelectPlatform,
  expandedPlatforms,
  onTogglePlatformExpanded,
  onViewCredentialsScreenshots,
  onViewAllTransactions,
  onViewDocument,
  onFieldEdit,
}: PlatformSectionProps) {
  const [isPending, startTransition] = useTransition()
  const totalPnL = calculateBettingPnL(client)
  const totalFunds = calculateTotalFunds(client)

  function handleStatusChange(platformName: string, newStatus: string) {
    const platformType = PLATFORM_NAME_TO_TYPE[platformName]
    if (!platformType) return
    startTransition(async () => {
      const result = await updatePlatformStatus(client.id, platformType, newStatus)
      if (result.success) {
        toast.success(`${platformName} status updated`)
      } else {
        toast.error(result.error || 'Failed to update status')
      }
    })
  }

  // Platform-specific P&L
  const platformMetrics = selectedPlatform
    ? (() => {
        const fin = client.financePlatforms.find(
          (p) => p.name === selectedPlatform,
        )
        if (fin) return { pnl: 0, total: fin.balance }
        const bet = client.bettingPlatforms.find(
          (p) => p.name === selectedPlatform,
        )
        if (bet)
          return {
            pnl: (bet.deposits || 0) - (bet.withdrawals || 0),
            total: bet.balance,
          }
        return { pnl: 0, total: 0 }
      })()
    : null

  return (
    <div
      className="grid grid-cols-1 gap-4 lg:grid-cols-6"
      data-testid="platform-section"
    >
      {/* Left: All Platforms */}
      <div className="lg:col-span-2">
        <Card className="card-terminal flex h-full flex-col">
          <CardHeader className="px-3 pb-2 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CardTitle className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <Building className="h-3.5 w-3.5" />
                  All Platforms
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-5 gap-0.5 px-1.5 text-[10px]"
                  onClick={onViewCredentialsScreenshots}
                  data-testid="view-credentials-screenshots"
                >
                  <Eye className="h-3 w-3" />
                  View
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">P&L:</span>
                  <span
                    className={cn(
                      'ml-0.5 font-mono font-semibold',
                      totalPnL >= 0 ? 'text-success' : 'text-destructive',
                    )}
                  >
                    {totalPnL >= 0 ? '+' : ''}
                    {totalPnL.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <span className="ml-0.5 font-mono font-semibold">
                    ${totalFunds.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 p-0">
            <ScrollArea className="h-[400px] [&>div]:scrollbar-hide">
              <div className="divide-y divide-border">
                {/* Finance Platforms */}
                {client.financePlatforms.map((platform) => (
                  <Collapsible
                    key={platform.name}
                    open={expandedPlatforms.includes(platform.name)}
                    onOpenChange={() =>
                      onTogglePlatformExpanded(platform.name)
                    }
                  >
                    <div
                      className="flex w-full cursor-pointer items-center justify-between p-2.5 text-left transition-colors hover:bg-muted/30"
                      role="button"
                      tabIndex={0}
                      onClick={() => onTogglePlatformExpanded(platform.name)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onTogglePlatformExpanded(platform.name)
                        }
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <ChevronDown
                          className={cn(
                            'h-3.5 w-3.5 text-muted-foreground transition-transform',
                            expandedPlatforms.includes(platform.name) &&
                              'rotate-180',
                          )}
                        />
                        <span className="text-sm font-medium">
                          {platform.name}
                        </span>
                        {platform.type === 'bank' && platform.bankType && (
                          <Badge
                            variant="outline"
                            className="h-4 px-1 text-[9px]"
                          >
                            {platform.bankType}
                          </Badge>
                        )}
                        {platform.type === 'paypal' && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'h-4 px-1 text-[9px]',
                              platform.isUsed
                                ? 'border-warning/30 text-warning'
                                : 'border-success/30 text-success',
                            )}
                          >
                            {platform.isUsed ? 'Used' : 'New'}
                          </Badge>
                        )}
                        {/* Status controls */}
                        <div
                          className="ml-auto flex items-center"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          {platform.type === 'paypal' && (
                            <Select
                              value={platform.status}
                              onValueChange={(v) => handleStatusChange(platform.name, v)}
                              disabled={isPending}
                            >
                              <SelectTrigger
                                className={cn(
                                  'h-5 w-[90px] rounded-full border px-2 text-[10px] font-medium',
                                  getPlatformStatusColor(platform.status),
                                )}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pipeline">Pipeline</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="permanent_limited">
                                  Perm. Limited
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {platform.type === 'edgeboost' && (
                            <Select
                              value={platform.status}
                              onValueChange={(v) => handleStatusChange(platform.name, v)}
                              disabled={isPending}
                            >
                              <SelectTrigger
                                className={cn(
                                  'h-5 w-[90px] rounded-full border px-2 text-[10px] font-medium',
                                  getPlatformStatusColor(platform.status),
                                )}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pipeline">Pipeline</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="rejected">
                                  Rejected
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {platform.type === 'bank' && (
                            <Select
                              value={platform.status}
                              onValueChange={(v) => handleStatusChange(platform.name, v)}
                              disabled={isPending}
                            >
                              <SelectTrigger
                                className={cn(
                                  'h-5 w-[90px] rounded-full border px-2 text-[10px] font-medium',
                                  getPlatformStatusColor(platform.status),
                                )}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pipeline">Pipeline</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="rejected">
                                  Rejected
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-sm">
                        ${platform.balance.toLocaleString()}
                      </span>
                    </div>
                    <CollapsibleContent className="border-t border-border bg-muted/20">
                      <div className="space-y-1.5 p-2.5 text-sm">
                        {platform.credentials && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                Login
                              </span>
                              <EditableField
                                value={platform.credentials.username || ''}
                                fieldKey={`${platform.name}.username`}
                                mono
                                onSave={onFieldEdit}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                Password
                              </span>
                              <EditableField
                                value={platform.credentials.password || ''}
                                fieldKey={`${platform.name}.password`}
                                mono
                                onSave={onFieldEdit}
                              />
                            </div>
                            {platform.type === 'bank' &&
                              platform.credentials.pin && (
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">
                                    PIN
                                  </span>
                                  <EditableField
                                    value={platform.credentials.pin}
                                    fieldKey={`${platform.name}.pin`}
                                    mono
                                    onSave={onFieldEdit}
                                  />
                                </div>
                              )}
                          </>
                        )}
                        {/* Bank routing/account */}
                        {platform.type === 'bank' && platform.bankInfo && (
                          <div className="mt-1.5 space-y-1.5 border-t border-border pt-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                Routing #
                              </span>
                              <EditableField
                                value={platform.bankInfo.routingNumber || ''}
                                fieldKey={`${platform.name}.routingNumber`}
                                mono
                                onSave={onFieldEdit}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                Account #
                              </span>
                              <EditableField
                                value={platform.bankInfo.accountNumber || ''}
                                fieldKey={`${platform.name}.accountNumber`}
                                mono
                                onSave={onFieldEdit}
                              />
                            </div>
                          </div>
                        )}
                        {/* Debit card */}
                        {(platform.type === 'bank' ||
                          platform.type === 'edgeboost') &&
                          platform.debitCard && (
                            <div className="mt-1.5 space-y-1.5 border-t border-border pt-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  Card
                                </span>
                                <EditableField
                                  value={platform.debitCard.cardNumber}
                                  fieldKey={`${platform.name}.cardNumber`}
                                  mono
                                  onSave={onFieldEdit}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  CVV
                                </span>
                                <EditableField
                                  value={platform.debitCard.cvv}
                                  fieldKey={`${platform.name}.cvv`}
                                  mono
                                  onSave={onFieldEdit}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  Exp
                                </span>
                                <EditableField
                                  value={platform.debitCard.expiration}
                                  fieldKey={`${platform.name}.expiration`}
                                  mono
                                  onSave={onFieldEdit}
                                />
                              </div>
                            </div>
                          )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}

                {/* Separator */}
                <div className="px-3 py-2">
                  <Separator className="bg-border" />
                  <p className="mt-1 text-center text-[10px] text-muted-foreground">
                    Sportsbook Platforms
                  </p>
                </div>

                {/* Betting Platforms */}
                {sortPlatformsByStatus(client.bettingPlatforms).map(
                  (platform) => {
                    const pnl =
                      (platform.deposits || 0) - (platform.withdrawals || 0)
                    return (
                      <Collapsible
                        key={platform.id}
                        open={expandedPlatforms.includes(platform.name)}
                        onOpenChange={() =>
                          onTogglePlatformExpanded(platform.name)
                        }
                      >
                        <div
                          className="flex w-full cursor-pointer items-center justify-between p-2.5 text-left transition-colors hover:bg-muted/30"
                          role="button"
                          tabIndex={0}
                          onClick={() => onTogglePlatformExpanded(platform.name)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              onTogglePlatformExpanded(platform.name)
                            }
                          }}
                        >
                          <div className="flex flex-1 items-center gap-1.5">
                            <ChevronDown
                              className={cn(
                                'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
                                expandedPlatforms.includes(platform.name) &&
                                  'rotate-180',
                              )}
                            />
                            <span className="text-sm font-medium">
                              {platform.name}
                            </span>
                            <div
                              className="ml-auto flex items-center"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              <Select
                                value={platform.status}
                                onValueChange={(v) => handleStatusChange(platform.name, v)}
                                disabled={isPending}
                              >
                                <SelectTrigger
                                  className={cn(
                                    'h-5 w-[72px] rounded-full border px-2 text-[10px] font-medium',
                                    getBettingPlatformStatusColor(
                                      platform.status,
                                    ),
                                  )}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">
                                    Active
                                  </SelectItem>
                                  <SelectItem value="pipeline">
                                    Pipeline
                                  </SelectItem>
                                  <SelectItem value="limited">
                                    Limited
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <span className="ml-2 font-mono text-sm">
                            ${platform.balance.toLocaleString()}
                          </span>
                        </div>
                        <CollapsibleContent className="border-t border-border bg-muted/20">
                          <div className="space-y-1.5 p-2.5 text-sm">
                            {platform.credentials ? (
                              <>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">
                                    Login
                                  </span>
                                  <EditableField
                                    value={
                                      platform.credentials.username || ''
                                    }
                                    fieldKey={`${platform.name}.username`}
                                    mono
                                    onSave={onFieldEdit}
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">
                                    Password
                                  </span>
                                  <EditableField
                                    value={
                                      platform.credentials.password || ''
                                    }
                                    fieldKey={`${platform.name}.password`}
                                    mono
                                    onSave={onFieldEdit}
                                  />
                                </div>
                              </>
                            ) : (
                              <p className="text-[11px] text-muted-foreground">
                                No credentials set
                              </p>
                            )}
                            {platform.startDate && (
                              <div className="flex items-center justify-between border-t border-border pt-1">
                                <span className="text-muted-foreground">
                                  Started
                                </span>
                                <span className="font-mono">
                                  {platform.startDate}
                                </span>
                              </div>
                            )}
                            {platform.endDate && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  Ended
                                </span>
                                <span className="font-mono">
                                  {platform.endDate}
                                </span>
                              </div>
                            )}
                            {platform.deposits !== undefined && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  P&L
                                </span>
                                <span
                                  className={cn(
                                    'font-mono',
                                    pnl >= 0
                                      ? 'text-success'
                                      : 'text-destructive',
                                  )}
                                >
                                  {pnl >= 0 ? '+' : ''}
                                  {pnl.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )
                  },
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Right: Transaction Panel */}
      <div className="lg:col-span-4">
        <Card className="card-terminal flex h-full flex-col">
          <CardHeader className="px-4 pb-2 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <DollarSign className="h-3.5 w-3.5" />
                  {selectedPlatform
                    ? `${selectedPlatform} Transactions`
                    : 'Select a Platform'}
                </CardTitle>
                {/* Quick Platform Icons */}
                <div className="ml-2 flex items-center gap-1">
                  {/* Finance platforms */}
                  <div className="flex items-center gap-0.5">
                    <TooltipProvider delayDuration={100}>
                      {client.financePlatforms.map((platform) => {
                        const abbr =
                          platform.type === 'paypal'
                            ? 'PP'
                            : platform.type === 'bank'
                              ? 'B'
                              : 'EB'
                        return (
                          <Tooltip key={platform.name}>
                            <TooltipTrigger asChild>
                              <button
                                className={cn(
                                  'flex h-5 w-6 items-center justify-center rounded border text-[9px] font-semibold transition-colors',
                                  selectedPlatform === platform.name
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted',
                                )}
                                onClick={() =>
                                  onSelectPlatform(platform.name)
                                }
                              >
                                {abbr}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              className="text-xs"
                            >
                              {platform.name}
                            </TooltipContent>
                          </Tooltip>
                        )
                      })}
                    </TooltipProvider>
                  </div>
                  <div className="mx-1 h-4 w-px bg-border" />
                  {/* Betting platforms */}
                  <div className="flex items-center gap-0.5">
                    <TooltipProvider delayDuration={100}>
                      {sortPlatformsByStatus(client.bettingPlatforms).map(
                        (platform) => {
                          const statusColor =
                            platform.status === 'active'
                              ? 'bg-success/20 text-success border-success/40'
                              : platform.status === 'pipeline'
                                ? 'bg-primary/20 text-primary border-primary/40'
                                : 'bg-warning/20 text-warning border-warning/40'
                          return (
                            <Tooltip key={platform.id}>
                              <TooltipTrigger asChild>
                                <button
                                  className={cn(
                                    'flex h-5 w-6 items-center justify-center rounded border text-[8px] font-semibold transition-colors',
                                    selectedPlatform === platform.name
                                      ? 'border-primary bg-primary text-primary-foreground'
                                      : statusColor + ' hover:opacity-80',
                                  )}
                                  onClick={() =>
                                    onSelectPlatform(platform.name)
                                  }
                                >
                                  {platform.abbr}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="bottom"
                                className="text-xs"
                              >
                                {platform.name}
                              </TooltipContent>
                            </Tooltip>
                          )
                        },
                      )}
                    </TooltipProvider>
                  </div>
                </div>
              </div>
              {/* Platform metrics */}
              {selectedPlatform && platformMetrics && (
                <div className="flex items-center gap-3 text-sm">
                  {platformMetrics.pnl !== 0 && (
                    <div>
                      <span className="text-muted-foreground">P&L:</span>
                      <span
                        className={cn(
                          'ml-1 font-mono font-semibold',
                          platformMetrics.pnl >= 0
                            ? 'text-success'
                            : 'text-destructive',
                        )}
                      >
                        {platformMetrics.pnl >= 0 ? '+' : ''}
                        {platformMetrics.pnl.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Total:</span>
                    <span className="ml-1 font-mono font-semibold">
                      ${platformMetrics.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {/* Action buttons */}
            <div className="mt-2 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-6 gap-1 text-[10px]"
                onClick={onViewAllTransactions}
                data-testid="view-all-transactions"
              >
                <List className="h-3 w-3" />
                View All Transactions
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 gap-1 text-[10px]"
                onClick={() => window.print()}
                data-testid="print-transactions"
              >
                <Printer className="h-3 w-3" />
                Print
              </Button>
            </div>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 p-0">
            <ScrollArea className="h-[380px]">
              <div className="p-3">
                {selectedPlatform ? (
                  <div className="space-y-2">
                    {client.transactions
                      .filter((t) => t.platform === selectedPlatform)
                      .map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between rounded bg-muted/20 p-3 text-sm"
                        >
                          <div>
                            <p className="font-medium capitalize">{tx.type}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {tx.date}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                'font-mono font-semibold',
                                tx.type === 'deposit'
                                  ? 'text-success'
                                  : 'text-destructive',
                              )}
                            >
                              {tx.type === 'deposit' ? '+' : '-'}$
                              {tx.amount.toLocaleString()}
                            </span>
                            {tx.documentUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px]"
                                onClick={() =>
                                  onViewDocument(
                                    tx.documentUrl!,
                                    tx.documentType || 'Document',
                                  )
                                }
                              >
                                <Eye className="mr-1 h-3 w-3" />
                                View
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    {client.transactions.filter(
                      (t) => t.platform === selectedPlatform,
                    ).length === 0 && (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        No transactions for {selectedPlatform}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-[300px] flex-col items-center justify-center text-muted-foreground">
                    <DollarSign className="mb-3 h-10 w-10 opacity-30" />
                    <p className="text-sm">
                      Select a platform from the left to view transactions
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
