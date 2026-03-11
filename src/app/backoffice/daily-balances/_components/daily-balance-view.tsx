'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Camera,
  DollarSign,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { recordBalanceSnapshot } from '@/app/actions/balance-snapshots'
import type {
  DailyBalancesData,
  DailyBalancesPlatformGroup,
  DailyBalancesAccount,
} from '@/types/backend-types'

interface DailyBalanceViewProps {
  data: DailyBalancesData
}

export function DailyBalanceView({ data }: DailyBalanceViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const progressPct = data.totalAccounts === 0
    ? 100
    : Math.round((data.totalRecorded / data.totalAccounts) * 100)

  // Local state for balances being edited (keyed by clientRecordId:platform)
  const [editedBalances, setEditedBalances] = useState<Record<string, string>>({})
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set())

  // Format the display date
  const displayDate = new Date(data.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  function navigateDate(offset: number) {
    const current = new Date(data.date + 'T12:00:00')
    current.setDate(current.getDate() + offset)
    const newDate = current.toISOString().slice(0, 10)
    router.push(`/backoffice/daily-balances?date=${newDate}`)
  }

  function handleBalanceChange(key: string, value: string) {
    setEditedBalances((prev) => ({ ...prev, [key]: value }))
  }

  function handleSaveBalance(account: DailyBalancesAccount) {
    const key = `${account.clientRecordId}:${account.platform}`
    const rawValue = editedBalances[key]
    if (rawValue === undefined || rawValue === '') {
      toast.error('Please enter a balance')
      return
    }

    const balance = parseFloat(rawValue.replace(/[,$]/g, ''))
    if (isNaN(balance)) {
      toast.error('Invalid balance amount')
      return
    }

    startTransition(async () => {
      const result = await recordBalanceSnapshot({
        clientRecordId: account.clientRecordId,
        platform: account.platform,
        date: data.date,
        balance,
      })
      if (result.success) {
        toast.success(`${account.clientName} - ${account.platform} saved`)
        setSavedKeys((prev) => new Set(prev).add(key))
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to save')
      }
    })
  }

  return (
    <div className="animate-fade-in space-y-4 p-4 md:p-6" data-testid="daily-balance-view">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <TrendingUp className="h-5 w-5 text-primary" />
            Daily Balance Recording
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Record daily platform balances from screenshots
          </p>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigateDate(-1)}
            data-testid="prev-date"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1.5 rounded-md border px-3 py-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{displayDate}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigateDate(1)}
            data-testid="next-date"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <Card className="card-terminal">
        <CardContent className="py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              Progress: {data.totalRecorded}/{data.totalAccounts} accounts recorded
            </span>
            <span className={cn(
              'font-semibold',
              progressPct === 100 ? 'text-success' : progressPct > 50 ? 'text-primary' : 'text-warning',
            )}>
              {progressPct}%
            </span>
          </div>
          <Progress value={progressPct} className="mt-2 h-2" />
        </CardContent>
      </Card>

      {/* Platform Groups */}
      {data.platformGroups.length === 0 ? (
        <Card className="card-terminal">
          <CardContent className="flex h-[200px] items-center justify-center text-muted-foreground">
            No approved clients with platform registrations found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Sportsbooks */}
          {data.platformGroups.some((g) => g.category === 'sports') && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Sportsbook Platforms
              </h2>
              {data.platformGroups
                .filter((g) => g.category === 'sports')
                .map((group) => (
                  <PlatformGroupCard
                    key={group.platform}
                    group={group}
                    date={data.date}
                    editedBalances={editedBalances}
                    savedKeys={savedKeys}
                    isPending={isPending}
                    onBalanceChange={handleBalanceChange}
                    onSave={handleSaveBalance}
                  />
                ))}
            </div>
          )}

          {/* Financial */}
          {data.platformGroups.some((g) => g.category === 'financial') && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Financial Platforms
              </h2>
              {data.platformGroups
                .filter((g) => g.category === 'financial')
                .map((group) => (
                  <PlatformGroupCard
                    key={group.platform}
                    group={group}
                    date={data.date}
                    editedBalances={editedBalances}
                    savedKeys={savedKeys}
                    isPending={isPending}
                    onBalanceChange={handleBalanceChange}
                    onSave={handleSaveBalance}
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Platform Group Card ──────────────────────────────

interface PlatformGroupCardProps {
  group: DailyBalancesPlatformGroup
  date: string
  editedBalances: Record<string, string>
  savedKeys: Set<string>
  isPending: boolean
  onBalanceChange: (key: string, value: string) => void
  onSave: (account: DailyBalancesAccount) => void
}

function PlatformGroupCard({
  group,
  date,
  editedBalances,
  savedKeys,
  isPending,
  onBalanceChange,
  onSave,
}: PlatformGroupCardProps) {
  return (
    <Card className="card-terminal" data-testid={`platform-group-${group.platform}`}>
      <CardHeader className="px-4 py-2.5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            {group.name}
            <Badge variant="outline" className="text-[10px]">
              {group.abbrev}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-xs font-medium',
              group.recordedCount === group.totalCount ? 'text-success' : 'text-muted-foreground',
            )}>
              {group.recordedCount}/{group.totalCount} done
            </span>
            {group.recordedCount === group.totalCount && (
              <Check className="h-4 w-4 text-success" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_120px_100px_100px_60px] gap-2 border-b border-t bg-muted/30 px-4 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span>Client / Agent</span>
          <span className="text-right">Yesterday</span>
          <span className="text-right">Today&apos;s Balance</span>
          <span className="text-center">Screenshot</span>
          <span className="text-center">Save</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {group.accounts.map((account) => {
            const key = `${account.clientRecordId}:${account.platform}`
            const isRecorded = account.recorded || savedKeys.has(key)
            const editedValue = editedBalances[key]

            return (
              <div
                key={key}
                className={cn(
                  'grid grid-cols-[1fr_120px_100px_100px_60px] items-center gap-2 px-4 py-2 transition-colors',
                  isRecorded ? 'bg-success/5' : 'hover:bg-muted/20',
                )}
                data-testid={`balance-row-${key}`}
              >
                {/* Client/Agent */}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{account.clientName}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{account.agentName}</p>
                </div>

                {/* Yesterday's balance */}
                <div className="text-right">
                  {account.yesterdayBalance !== null ? (
                    <span className="font-mono text-xs text-muted-foreground">
                      ${account.yesterdayBalance.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/50">--</span>
                  )}
                </div>

                {/* Today's balance input */}
                <div className="text-right">
                  {isRecorded && editedValue === undefined ? (
                    <span className="font-mono text-xs font-medium text-success">
                      ${(account.todayBalance ?? 0).toLocaleString()}
                    </span>
                  ) : (
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      className="h-7 w-full text-right font-mono text-xs"
                      value={editedValue ?? (account.todayBalance !== null ? String(account.todayBalance) : '')}
                      onChange={(e) => onBalanceChange(key, e.target.value)}
                      disabled={isPending}
                      data-testid={`balance-input-${key}`}
                    />
                  )}
                </div>

                {/* Screenshot indicator */}
                <div className="flex justify-center">
                  {account.screenshotPath ? (
                    <Badge variant="outline" className="gap-1 text-[9px] text-success">
                      <Camera className="h-3 w-3" />
                      Uploaded
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/50">--</span>
                  )}
                </div>

                {/* Save button */}
                <div className="flex justify-center">
                  {isRecorded && editedValue === undefined ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onSave(account)}
                      disabled={isPending}
                      data-testid={`save-balance-${key}`}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
