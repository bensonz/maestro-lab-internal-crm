'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ALL_PLATFORMS, PLATFORM_INFO, SPORTS_PLATFORMS, FINANCIAL_PLATFORMS } from '@/lib/platforms'
import {
  getStatusOptionsForPlatform,
  findStatusOption,
  getLimitedConfig,
  getActiveDetailConfig,
  SPORTSBOOK_STATUSES,
  STATUS_GROUP_LABELS,
  type StatusOption,
  type SportsbookStatusGroup,
} from '@/lib/account-status-config'
import { updateAccountStatus } from '@/app/actions/balance-snapshots'
import type { AccountStatusesData, AccountStatusRow, PlatformStatusEntry } from '@/types/backend-types'

// ── Finance platform column order: Bank → EB → PayPal ──
const FINANCE_ORDER = ['BANK', 'EDGEBOOST', 'PAYPAL'] as const

// ── Status filter options ──
const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'VIP', label: 'VIP' },
  { value: 'LIMITED', label: 'Limited' },
  { value: 'PIPELINE', label: 'Pipeline' },
  { value: 'SIGN_UP', label: 'Sign Up!' },
  { value: 'WITHDREW', label: 'WD' },
  { value: 'WITHDRAWING', label: 'WITHDRAWING' },
  { value: 'needs-attention', label: 'Needs Attention' },
  { value: 'closed', label: 'Closed' },
  { value: 'unset', label: 'Unset' },
]

const AMOUNT_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'with', label: 'With Amount' },
  { value: 'without', label: 'W/O Amount' },
]

// ── Helper: build display label from PlatformStatusEntry ──
function statusDisplayLabel(entry: PlatformStatusEntry | null, platform: string): string {
  if (!entry) return '\u2014'
  const opt = findStatusOption(platform, entry.status)
  const label = opt?.label ?? entry.status
  if (entry.status === 'LIMITED') {
    if (entry.limitDetail) {
      // MGM tiers already contain "Limited" (e.g. "$3K Limited") — don't duplicate
      return entry.limitDetail.toLowerCase().includes('limited') ? entry.limitDetail : `${entry.limitDetail} Limited`
    }
    if (entry.limitAmount != null) return `$${entry.limitAmount.toLocaleString()} Limited`
    return label
  }
  return label
}

// ── Helper: build display for active detail ──
function activeDetailLabel(entry: PlatformStatusEntry | null): string {
  return entry?.limitDetail ?? ''
}

// ── Helper: get styling for a status ──
function statusColors(entry: PlatformStatusEntry | null, platform: string): { bg: string; text: string } {
  if (!entry) return { bg: 'bg-muted/30', text: 'text-muted-foreground/60' }
  const opt = findStatusOption(platform, entry.status)
  if (opt) return { bg: opt.color, text: opt.textColor }
  return { bg: 'bg-muted', text: 'text-muted-foreground' }
}

// ── Filter logic ──
function matchesStatusFilter(row: AccountStatusRow, filter: string): boolean {
  if (filter === 'all') return true
  if (filter === 'needs-attention') {
    return row.registeredPlatforms.some((p) => {
      const s = row.platformStatuses[p]?.status
      return s === 'LIMITED' || s === 'WITHDREW' || s === 'WITHDRAWING' || s === 'CLOSED_BAL'
    })
  }
  if (filter === 'closed') {
    return row.registeredPlatforms.some((p) => {
      const s = row.platformStatuses[p]?.status
      return s === 'CLOSED_BAL' || s === 'CLOSED_REFUNDED' || s === 'CLOSED_2ND'
    })
  }
  if (filter === 'unset') {
    return row.registeredPlatforms.some((p) => !row.platformStatuses[p])
  }
  return row.registeredPlatforms.some((p) => row.platformStatuses[p]?.status === filter)
}

function matchesAmountFilter(row: AccountStatusRow, filter: string): boolean {
  if (filter === 'all') return true
  const hasAny = Object.values(row.platformBalances).some((b) => b != null && b > 0)
  return filter === 'with' ? hasAny : !hasAny
}

// ── Aggregate balance helper ──
function aggregateBalance(row: AccountStatusRow, platforms: readonly string[]): number {
  let total = 0
  for (const p of platforms) {
    const b = row.platformBalances[p]
    if (b != null) total += b
  }
  return total
}

function formatBalance(amount: number | null): string {
  if (amount == null) return '\u2014'
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`
  return `$${amount.toLocaleString()}`
}

// ── Summary badge component ──
function SummaryBadge({ label, count, bg, text }: { label: string; count: number; bg: string; text: string }) {
  if (count === 0) return null
  return (
    <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium', bg, text)}>
      {label}: {count}
    </span>
  )
}

// ══════════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════════

interface Props {
  data: AccountStatusesData
}

export function AccountStatusesView({ data }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [amountFilter, setAmountFilter] = useState('all')

  // Optimistic local overrides: "clientId:platform" → PlatformStatusEntry
  const [overrides, setOverrides] = useState<Record<string, PlatformStatusEntry>>({})

  // Filtered rows
  const filteredRows = useMemo(() => {
    const term = search.toLowerCase()
    return data.rows.filter((row) => {
      if (term && !row.clientName.toLowerCase().includes(term)) return false
      if (!matchesStatusFilter(row, statusFilter)) return false
      if (!matchesAmountFilter(row, amountFilter)) return false
      return true
    })
  }, [data.rows, search, statusFilter, amountFilter])

  // Get effective status for a cell (with overrides)
  function getEffectiveStatus(row: AccountStatusRow, platform: string): PlatformStatusEntry | null {
    const key = `${row.clientRecordId}:${platform}`
    if (overrides[key]) return overrides[key]
    return row.platformStatuses[platform]
  }

  // Handle status change
  function handleStatusChange(row: AccountStatusRow, platform: string, newStatus: string) {
    const key = `${row.clientRecordId}:${platform}`
    const entry: PlatformStatusEntry = { status: newStatus }

    // Optimistic update
    setOverrides((prev) => ({ ...prev, [key]: entry }))

    startTransition(async () => {
      const result = await updateAccountStatus({
        clientRecordId: row.clientRecordId,
        platform,
        status: newStatus,
      })
      if (result.success) {
        toast.success(`${row.clientName} \u2014 ${PLATFORM_INFO[platform as keyof typeof PLATFORM_INFO]?.name ?? platform} updated`)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update')
        // Revert override
        setOverrides((prev) => {
          const copy = { ...prev }
          delete copy[key]
          return copy
        })
      }
    })
  }

  // Handle limited detail update (second step after selecting LIMITED)
  function handleLimitedDetail(
    row: AccountStatusRow,
    platform: string,
    detail: { limitDetail?: string; limitAmount?: number; limitSports?: string[] },
  ) {
    const key = `${row.clientRecordId}:${platform}`
    const entry: PlatformStatusEntry = { status: 'LIMITED', ...detail }
    setOverrides((prev) => ({ ...prev, [key]: entry }))

    startTransition(async () => {
      const result = await updateAccountStatus({
        clientRecordId: row.clientRecordId,
        platform,
        status: 'LIMITED',
        ...detail,
      })
      if (result.success) {
        toast.success(`${row.clientName} \u2014 ${PLATFORM_INFO[platform as keyof typeof PLATFORM_INFO]?.name ?? platform} limited detail updated`)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update')
        setOverrides((prev) => {
          const copy = { ...prev }
          delete copy[key]
          return copy
        })
      }
    })
  }

  const { summary } = data
  const sc = summary.statusCounts

  return (
    <div className="space-y-3 p-4" data-testid="account-statuses-view">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Account Status</h1>
        <div className="flex flex-wrap gap-1">
          <SummaryBadge label="VIP" count={sc.VIP ?? 0} bg="bg-emerald-600/25" text="text-emerald-400" />
          <SummaryBadge label="Active" count={sc.ACTIVE ?? 0} bg="bg-green-400/20" text="text-green-400" />
          <SummaryBadge label="Limited" count={sc.LIMITED ?? 0} bg="bg-yellow-400/20" text="text-yellow-400" />
          <SummaryBadge label="Pipeline" count={sc.PIPELINE ?? 0} bg="bg-blue-400/20" text="text-blue-400" />
          <SummaryBadge label="WD" count={(sc.WITHDREW ?? 0) + (sc.WITHDRAWING ?? 0) + (sc.WD_TESTING ?? 0) + (sc.WD_OPEN_BET ?? 0) + (sc.WD_NO_LIMIT ?? 0)} bg="bg-red-300/15" text="text-red-300" />
          <span className="text-[10px] text-muted-foreground/60">
            {summary.totalClients} clients · {summary.totalAccounts} accounts
          </span>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-2">
        <div className="relative w-48">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 pl-7 text-xs"
            data-testid="account-statuses-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-7 w-36 text-xs" data-testid="account-statuses-filter">
            <span>{STATUS_FILTERS.find((f) => f.value === statusFilter)?.label ?? 'All'}</span>
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value} className="text-xs">
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={amountFilter} onValueChange={setAmountFilter}>
          <SelectTrigger className="h-7 w-32 text-xs">
            <span>{AMOUNT_FILTERS.find((f) => f.value === amountFilter)?.label ?? 'All'}</span>
          </SelectTrigger>
          <SelectContent>
            {AMOUNT_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value} className="text-xs">
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-[10px] text-muted-foreground">
          {filteredRows.length} / {data.rows.length}
        </span>
      </div>

      {/* ── Matrix Table ── */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-max min-w-full border-collapse text-xs">
          <thead>
            <tr className="border-b bg-muted/40">
              {/* Finance columns */}
              {FINANCE_ORDER.map((pt) => (
                <th key={pt} className="whitespace-nowrap px-2 py-1.5 text-center font-medium text-muted-foreground" style={{ minWidth: 80 }}>
                  {PLATFORM_INFO[pt].abbrev}
                </th>
              ))}
              {/* Finance aggregate */}
              <th className="whitespace-nowrap border-r px-2 py-1.5 text-center font-medium text-muted-foreground" style={{ minWidth: 56 }}>
                $Fin
              </th>
              {/* Client name (sticky center) */}
              <th
                className="sticky left-0 z-10 whitespace-nowrap border-r bg-muted/40 px-3 py-1.5 text-left font-medium"
                style={{ minWidth: 130 }}
              >
                Client
              </th>
              {/* Sports aggregate */}
              <th className="whitespace-nowrap border-r px-2 py-1.5 text-center font-medium text-muted-foreground" style={{ minWidth: 56 }}>
                $Sport
              </th>
              {/* Sports columns */}
              {SPORTS_PLATFORMS.map((pt) => (
                <th key={pt} className="whitespace-nowrap px-2 py-1.5 text-center font-medium text-muted-foreground" style={{ minWidth: 80 }}>
                  {PLATFORM_INFO[pt].abbrev}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={ALL_PLATFORMS.length + 4} className="py-8 text-center text-muted-foreground">
                  No clients match the current filters.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const finTotal = aggregateBalance(row, FINANCE_ORDER)
                const sportTotal = aggregateBalance(row, SPORTS_PLATFORMS)

                return (
                  <tr key={row.clientRecordId} className="border-b border-border/50 hover:bg-muted/20">
                    {/* Finance cells */}
                    {FINANCE_ORDER.map((pt) => (
                      <StatusCell
                        key={pt}
                        row={row}
                        platform={pt}
                        effectiveStatus={getEffectiveStatus(row, pt)}
                        isPending={isPending}
                        onStatusChange={handleStatusChange}
                        onLimitedDetail={handleLimitedDetail}
                      />
                    ))}
                    {/* Finance aggregate */}
                    <td className="border-r px-2 py-1 text-center align-top font-mono text-[10px] text-muted-foreground">
                      <div className="flex h-[34px] items-center justify-center">
                        {finTotal > 0 ? formatBalance(finTotal) : '\u2014'}
                      </div>
                    </td>
                    {/* Client name (sticky) */}
                    <td className="sticky left-0 z-10 border-r bg-background px-3 py-1 align-top font-medium">
                      <div className="flex h-[34px] items-center">
                        <span className="truncate">{row.clientName}</span>
                      </div>
                    </td>
                    {/* Sports aggregate */}
                    <td className="border-r px-2 py-1 text-center align-top font-mono text-[10px] text-muted-foreground">
                      <div className="flex h-[34px] items-center justify-center">
                        {sportTotal > 0 ? formatBalance(sportTotal) : '\u2014'}
                      </div>
                    </td>
                    {/* Sports cells */}
                    {SPORTS_PLATFORMS.map((pt) => (
                      <StatusCell
                        key={pt}
                        row={row}
                        platform={pt}
                        effectiveStatus={getEffectiveStatus(row, pt)}
                        isPending={isPending}
                        onStatusChange={handleStatusChange}
                        onLimitedDetail={handleLimitedDetail}
                      />
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// StatusCell — individual platform cell with dropdown
// ══════════════════════════════════════════════════════════

interface StatusCellProps {
  row: AccountStatusRow
  platform: string
  effectiveStatus: PlatformStatusEntry | null
  isPending: boolean
  onStatusChange: (row: AccountStatusRow, platform: string, status: string) => void
  onLimitedDetail: (
    row: AccountStatusRow,
    platform: string,
    detail: { limitDetail?: string; limitAmount?: number; limitSports?: string[] },
  ) => void
}

function StatusCell({ row, platform, effectiveStatus, isPending, onStatusChange, onLimitedDetail }: StatusCellProps) {
  const isRegistered = row.registeredPlatforms.includes(platform)
  const balance = row.platformBalances[platform]
  const colors = statusColors(effectiveStatus, platform)
  const displayLabel = statusDisplayLabel(effectiveStatus, platform)
  const options = getStatusOptionsForPlatform(platform)

  // Group sportsbook options by group for section headers
  const isSportsbook = !['BANK', 'EDGEBOOST', 'PAYPAL'].includes(platform)

  // Not registered → dim dash, no interaction — fixed height to stay aligned
  if (!isRegistered) {
    return (
      <td className="px-1 py-1 text-center align-top">
        <div className="flex h-[34px] items-center justify-center">
          <span className="text-[10px] text-muted-foreground/30">—</span>
        </div>
      </td>
    )
  }

  // Limited detail sub-selector
  const showLimitedDetail = effectiveStatus?.status === 'LIMITED' && isSportsbook
  const limitedConfig = getLimitedConfig(platform)

  // Active detail for financial platforms (Bank → Chase/Citi/BofA, EB → Tier 1-4)
  const activeDetailConfig = getActiveDetailConfig(platform)
  const showActiveDetail = effectiveStatus?.status === 'ACTIVE' && activeDetailConfig != null

  return (
    <td className="px-1 py-1 text-center align-top" data-testid={`status-cell-${row.clientRecordId}-${platform}`}>
      <div className="flex min-h-[34px] flex-col items-center gap-0.5">
        {/* Status dropdown */}
        <Select
          value={effectiveStatus?.status ?? ''}
          onValueChange={(v) => onStatusChange(row, platform, v)}
          disabled={isPending}
        >
          <SelectTrigger
            className={cn(
              'h-5 min-w-[70px] max-w-[130px] border-0 px-1.5 text-[10px] font-medium shadow-none',
              colors.bg,
              colors.text,
            )}
          >
            <span className="truncate">{displayLabel}</span>
          </SelectTrigger>
          <SelectContent className="max-h-64" position="popper" sideOffset={4}>
            {isSportsbook ? (
              // Grouped sportsbook options
              groupByCategory(SPORTSBOOK_STATUSES).map(([group, items]) => (
                <SelectGroup key={group}>
                  <SelectLabel className="text-[10px] text-muted-foreground">
                    {STATUS_GROUP_LABELS[group as SportsbookStatusGroup]}
                  </SelectLabel>
                  {items.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      <span className={cn('inline-block w-2 h-2 rounded-full mr-1.5', opt.color)} />
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))
            ) : (
              // Financial platform options (flat list)
              options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        {/* Active detail for financial platforms (Bank type, EB tier) */}
        {showActiveDetail && (
          <ActiveDetailInput
            config={activeDetailConfig}
            entry={effectiveStatus}
            isPending={isPending}
            onChange={(detail) => onLimitedDetail(row, platform, { limitDetail: detail })}
          />
        )}

        {/* Limited detail (inline sub-selector) */}
        {showLimitedDetail && limitedConfig.type !== 'none' && (
          <LimitedDetailInput
            platform={platform}
            config={limitedConfig}
            entry={effectiveStatus}
            isPending={isPending}
            onChange={(detail) => onLimitedDetail(row, platform, detail)}
          />
        )}

        {/* Balance */}
        <span className="font-mono text-[9px] text-muted-foreground/60">
          {balance != null ? `$${balance.toLocaleString()}` : '\u00A0'}
        </span>
      </div>
    </td>
  )
}

// ── Limited detail input (percentage dropdown, amount input, etc.) ──

interface LimitedDetailInputProps {
  platform: string
  config: { type: string; options?: string[]; sports?: string[] }
  entry: PlatformStatusEntry | null
  isPending: boolean
  onChange: (detail: { limitDetail?: string; limitAmount?: number; limitSports?: string[] }) => void
}

function LimitedDetailInput({ platform, config, entry, isPending, onChange }: LimitedDetailInputProps) {
  if (config.type === 'percentage' || config.type === 'mgm-tier') {
    return (
      <Select
        value={entry?.limitDetail ?? ''}
        onValueChange={(v) => onChange({ limitDetail: v })}
        disabled={isPending}
      >
        <SelectTrigger className="h-4 min-w-[60px] max-w-[80px] border-0 bg-yellow-400/10 px-1 text-[9px] text-yellow-400 shadow-none">
          <span className="truncate">{entry?.limitDetail || 'Select...'}</span>
        </SelectTrigger>
        <SelectContent position="popper" sideOffset={4}>
          {config.options?.map((opt) => (
            <SelectItem key={opt} value={opt} className="text-xs">
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (config.type === 'amount') {
    return (
      <Input
        type="number"
        placeholder="$amt"
        className="h-4 w-16 border-0 bg-yellow-400/10 px-1 text-center text-[9px] text-yellow-400 shadow-none"
        defaultValue={entry?.limitAmount ?? ''}
        disabled={isPending}
        onBlur={(e) => {
          const v = parseFloat(e.target.value)
          if (!isNaN(v)) onChange({ limitAmount: v })
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const v = parseFloat((e.target as HTMLInputElement).value)
            if (!isNaN(v)) onChange({ limitAmount: v })
          }
        }}
      />
    )
  }

  if (config.type === 'caesars-sports') {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <Select
          value={entry?.limitDetail ?? ''}
          onValueChange={(v) => onChange({ limitDetail: v, limitSports: entry?.limitSports })}
          disabled={isPending}
        >
          <SelectTrigger className="h-4 min-w-[50px] max-w-[60px] border-0 bg-yellow-400/10 px-1 text-[9px] text-yellow-400 shadow-none">
            <span>{entry?.limitDetail || 'X/4'}</span>
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            {config.options?.map((opt) => (
              <SelectItem key={opt} value={opt} className="text-xs">
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Sport checkboxes */}
        <div className="flex gap-0.5">
          {config.sports?.map((sport) => {
            const active = entry?.limitSports?.includes(sport) ?? false
            return (
              <button
                key={sport}
                type="button"
                disabled={isPending}
                className={cn(
                  'rounded px-0.5 text-[8px] font-medium transition-colors',
                  active ? 'bg-yellow-400/30 text-yellow-300' : 'bg-muted/30 text-muted-foreground/40',
                )}
                onClick={() => {
                  const current = entry?.limitSports ?? []
                  const next = active ? current.filter((s) => s !== sport) : [...current, sport]
                  onChange({ limitDetail: entry?.limitDetail, limitSports: next })
                }}
              >
                {sport}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return null
}

// ── Active detail input (Bank type, EdgeBoost tier) ──

interface ActiveDetailInputProps {
  config: { options: string[]; label: string }
  entry: PlatformStatusEntry | null
  isPending: boolean
  onChange: (detail: string) => void
}

function ActiveDetailInput({ config, entry, isPending, onChange }: ActiveDetailInputProps) {
  return (
    <Select
      value={entry?.limitDetail ?? ''}
      onValueChange={onChange}
      disabled={isPending}
    >
      <SelectTrigger className="h-4 min-w-[60px] max-w-[80px] border-0 bg-green-400/10 px-1 text-[9px] text-green-400 shadow-none">
        <span className="truncate">{entry?.limitDetail || config.label}</span>
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4}>
        {config.options.map((opt) => (
          <SelectItem key={opt} value={opt} className="text-xs">
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ── Group sportsbook statuses by category ──
function groupByCategory(statuses: StatusOption[]): [string, StatusOption[]][] {
  const groups = new Map<string, StatusOption[]>()
  for (const s of statuses) {
    if (!groups.has(s.group)) groups.set(s.group, [])
    groups.get(s.group)!.push(s)
  }
  return Array.from(groups.entries())
}
