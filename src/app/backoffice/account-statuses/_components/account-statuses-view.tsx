'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Filter, Search, Settings2 } from 'lucide-react'
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
import { PLATFORM_INFO, SPORTS_PLATFORMS } from '@/lib/platforms'
import {
  getStatusOptionsForPlatform as getStatusOptionsDefault,
  findStatusOption as findStatusOptionDefault,
  getLimitedConfig as getLimitedConfigDefault,
  getActiveDetailConfig as getActiveDetailConfigDefault,
  STATUS_GROUP_LABELS,
  type StatusOption,
  type SportsbookStatusGroup,
  type LimitedConfig,
  type ActiveDetailConfig,
} from '@/lib/account-status-config'
import type { PlatformDetailConfig } from '@/lib/status-config-keys'
import { updateAccountStatus } from '@/app/actions/balance-snapshots'
import type { AccountStatusesData, AccountStatusRow, PlatformStatusEntry } from '@/types/backend-types'

// ── Finance platform column order: Bank → EB → PayPal ──
const FINANCE_ORDER = ['BANK', 'EDGEBOOST', 'PAYPAL'] as const
const ALL_COLUMN_PLATFORMS = [...FINANCE_ORDER, ...SPORTS_PLATFORMS]

// ── Helper: build display label from PlatformStatusEntry ──
function statusDisplayLabel(entry: PlatformStatusEntry | null, platform: string): string {
  if (!entry) return '—'
  const opt = findStatusOptionDefault(platform, entry.status)
  const label = opt?.label ?? entry.status
  if (entry.status === 'LIMITED') {
    if (entry.limitDetail) {
      return entry.limitDetail.toLowerCase().includes('limited') ? entry.limitDetail : `${entry.limitDetail} Limited`
    }
    if (entry.limitAmount != null) return `$${entry.limitAmount.toLocaleString()} Limited`
    return label
  }
  return label
}

// ── Helper: get styling for a status ──
function statusColors(entry: PlatformStatusEntry | null, platform: string): { bg: string; text: string } {
  if (!entry) return { bg: 'bg-muted/30', text: 'text-muted-foreground/60' }
  const opt = findStatusOptionDefault(platform, entry.status)
  if (opt) return { bg: opt.color, text: opt.textColor }
  return { bg: 'bg-muted', text: 'text-muted-foreground' }
}

// ── Helper: get fill bg class for balance tab cell ──
// Uses the status config's own `color` field so Tailwind can scan it
function statusFillColor(entry: PlatformStatusEntry | null, platform: string): string {
  if (!entry) return 'bg-muted/20'
  const opt = findStatusOptionDefault(platform, entry.status)
  if (!opt) return 'bg-muted/20'
  return opt.color // e.g. 'bg-red-500/20', 'bg-green-400/20' — already in Tailwind scan
}

// ── Filter logic ──
function matchesColumnFilters(
  row: AccountStatusRow,
  columnFilters: Record<string, string>,
  getEffective: (row: AccountStatusRow, platform: string) => PlatformStatusEntry | null,
): boolean {
  for (const [platform, filterValue] of Object.entries(columnFilters)) {
    if (filterValue === 'all') continue
    const entry = getEffective(row, platform)
    if (entry?.status !== filterValue) return false
  }
  return true
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
  if (amount == null) return '—'
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`
  return `$${amount.toLocaleString()}`
}

function formatCellBalance(amount: number | null): string {
  if (amount == null || amount === 0) return '—'
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
  const [activeTab, setActiveTab] = useState<'status' | 'balances'>('status')

  // DB-aware status lookups — per-platform configs from DB
  const sc = data.statusConfigs
  const getStatusOptions = useMemo(() => {
    if (!sc) return getStatusOptionsDefault
    return (platform: string): StatusOption[] => {
      // Each platform has its own dictionary entry
      return sc[platform] ?? getStatusOptionsDefault(platform)
    }
  }, [sc])

  const findStatus = useMemo(() => {
    return (platform: string, value: string): StatusOption | undefined => {
      const options = getStatusOptions(platform)
      return options.find((s) => s.value === value)
    }
  }, [getStatusOptions])

  // DB-aware detail config lookups — converts PlatformDetailConfig → LimitedConfig / ActiveDetailConfig
  const dc = data.detailConfigs
  const getDetailLimited = useMemo(() => {
    if (!dc) return getLimitedConfigDefault
    return (platform: string): LimitedConfig => {
      const d = dc[platform]
      if (!d || d.limitedType === 'none') return getLimitedConfigDefault(platform)
      return {
        type: d.limitedType,
        options: d.limitedOptions,
        sports: d.limitedSports,
      }
    }
  }, [dc])

  const getDetailActive = useMemo(() => {
    if (!dc) return getActiveDetailConfigDefault
    return (platform: string): ActiveDetailConfig | null => {
      const d = dc[platform]
      if (!d?.activeDetailOptions?.length) return getActiveDetailConfigDefault(platform)
      return {
        options: d.activeDetailOptions,
        label: d.activeDetailLabel ?? '',
      }
    }
  }, [dc])

  // Per-column filters: platform → status value
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})

  // Optimistic local overrides: "clientId:platform" → PlatformStatusEntry
  const [overrides, setOverrides] = useState<Record<string, PlatformStatusEntry>>({})

  // Get effective status for a cell (with overrides)
  function getEffectiveStatus(row: AccountStatusRow, platform: string): PlatformStatusEntry | null {
    const key = `${row.clientRecordId}:${platform}`
    if (overrides[key]) return overrides[key]
    return row.platformStatuses[platform]
  }

  // Filtered rows
  const filteredRows = useMemo(() => {
    const term = search.toLowerCase()
    return data.rows.filter((row) => {
      if (term && !row.clientName.toLowerCase().includes(term)) return false
      if (!matchesColumnFilters(row, columnFilters, getEffectiveStatus)) return false
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.rows, search, columnFilters, overrides])

  // Handle status change
  function handleStatusChange(row: AccountStatusRow, platform: string, newStatus: string) {
    const key = `${row.clientRecordId}:${platform}`
    const entry: PlatformStatusEntry = { status: newStatus }

    setOverrides((prev) => ({ ...prev, [key]: entry }))

    startTransition(async () => {
      const result = await updateAccountStatus({
        clientRecordId: row.clientRecordId,
        platform,
        status: newStatus,
      })
      if (result.success) {
        toast.success(`${row.clientName} — ${PLATFORM_INFO[platform as keyof typeof PLATFORM_INFO]?.name ?? platform} updated`)
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

  // Handle limited detail update
  function handleLimitedDetail(
    row: AccountStatusRow,
    platform: string,
    detail: { limitDetail?: string; limitAmount?: number; limitSports?: string[] },
  ) {
    const key = `${row.clientRecordId}:${platform}`
    const currentStatus = getEffectiveStatus(row, platform)?.status ?? 'LIMITED'
    const entry: PlatformStatusEntry = { status: currentStatus, ...detail }
    setOverrides((prev) => ({ ...prev, [key]: entry }))

    startTransition(async () => {
      const result = await updateAccountStatus({
        clientRecordId: row.clientRecordId,
        platform,
        status: currentStatus,
        ...detail,
      })
      if (result.success) {
        toast.success(`${row.clientName} — ${PLATFORM_INFO[platform as keyof typeof PLATFORM_INFO]?.name ?? platform} detail updated`)
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

  function setColumnFilter(platform: string, value: string) {
    setColumnFilters((prev) => {
      if (value === 'all') {
        const copy = { ...prev }
        delete copy[platform]
        return copy
      }
      return { ...prev, [platform]: value }
    })
  }

  const { summary } = data
  const counts = summary.statusCounts
  const activeColumnFilterCount = Object.values(columnFilters).filter((v) => v !== 'all').length

  return (
    <div className="space-y-3 p-4" data-testid="account-statuses-view">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Account Status</h1>
        <div className="flex flex-wrap gap-1">
          <SummaryBadge label="VIP" count={counts.VIP ?? 0} bg="bg-emerald-600/25" text="text-emerald-400" />
          <SummaryBadge label="Active" count={counts.ACTIVE ?? 0} bg="bg-green-400/20" text="text-green-400" />
          <SummaryBadge label="Limited" count={counts.LIMITED ?? 0} bg="bg-yellow-400/20" text="text-yellow-400" />
          <SummaryBadge label="Pipeline" count={counts.PIPELINE ?? 0} bg="bg-blue-400/20" text="text-blue-400" />
          <SummaryBadge label="WD" count={(counts.WITHDREW ?? 0) + (counts.WITHDRAWING ?? 0) + (counts.WD_TESTING ?? 0) + (counts.WD_OPEN_BET ?? 0) + (counts.WD_NO_LIMIT ?? 0)} bg="bg-red-300/15" text="text-red-300" />
          <span className="text-[10px] text-muted-foreground/60">
            {summary.totalClients} clients · {summary.totalAccounts} accounts
          </span>
        </div>
      </div>

      {/* ── Tabs + Filters ── */}
      <div className="flex items-center gap-3">
        {/* Tab buttons */}
        <div className="flex rounded-md border border-border">
          <button
            type="button"
            className={cn(
              'px-3 py-1 text-xs font-medium transition-colors',
              activeTab === 'status'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/60',
              'rounded-l-md',
            )}
            onClick={() => setActiveTab('status')}
          >
            Status
          </button>
          <button
            type="button"
            className={cn(
              'px-3 py-1 text-xs font-medium transition-colors',
              activeTab === 'balances'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/60',
              'rounded-r-md border-l border-border',
            )}
            onClick={() => setActiveTab('balances')}
          >
            Balances
          </button>
        </div>

        {/* Search */}
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

        {/* Column filter count indicator */}
        {activeColumnFilterCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded bg-blue-400/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
            <Filter className="h-2.5 w-2.5" />
            {activeColumnFilterCount} column filter{activeColumnFilterCount > 1 ? 's' : ''}
          </span>
        )}

        {/* Sum boxes — always visible */}
        {(() => {
          const sumFin = filteredRows.reduce((sum, row) => sum + aggregateBalance(row, FINANCE_ORDER), 0)
          const sumSport = filteredRows.reduce((sum, row) => sum + aggregateBalance(row, SPORTS_PLATFORMS), 0)
          const totalAssets = sumFin + sumSport
          return (
            <>
              <div className="flex items-center gap-1 rounded border border-border bg-muted/30 px-2 py-0.5">
                <span className="text-[10px] text-muted-foreground">Sum $Fin</span>
                <span className="font-mono text-[11px] font-semibold text-foreground">{formatBalance(sumFin)}</span>
              </div>
              <div className="flex items-center gap-1 rounded border border-border bg-muted/30 px-2 py-0.5">
                <span className="text-[10px] text-muted-foreground">Sum $Sport</span>
                <span className="font-mono text-[11px] font-semibold text-foreground">{formatBalance(sumSport)}</span>
              </div>
              <div className="flex items-center gap-1 rounded border border-border bg-primary/10 px-2 py-0.5">
                <span className="text-[10px] text-muted-foreground">Total Assets</span>
                <span className="font-mono text-[11px] font-semibold text-foreground">{formatBalance(totalAssets)}</span>
              </div>
            </>
          )
        })()}
      </div>

      {/* ── Matrix Table ── */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-max min-w-full border-collapse text-xs">
          <thead>
            {/* Column sums row — only on Balances tab */}
            {activeTab === 'balances' && (
              <tr className="bg-muted/20">
                {FINANCE_ORDER.map((pt) => {
                  const colSum = filteredRows.reduce((s, r) => s + (r.platformBalances[pt] ?? 0), 0)
                  return (
                    <th key={pt} className="px-1 py-0.5 text-center font-mono text-[10px] font-normal text-muted-foreground">
                      {colSum > 0 ? formatBalance(colSum) : ''}
                    </th>
                  )
                })}
                <th className="border-r px-2 py-0.5 text-center font-mono text-[10px] font-normal text-muted-foreground" />
                <th className="sticky left-0 z-10 border-r bg-muted/20 px-3 py-0.5 text-left text-[10px] font-normal text-muted-foreground">
                  Column Totals
                </th>
                <th className="border-r px-2 py-0.5 text-center font-mono text-[10px] font-normal text-muted-foreground" />
                {SPORTS_PLATFORMS.map((pt) => {
                  const colSum = filteredRows.reduce((s, r) => s + (r.platformBalances[pt] ?? 0), 0)
                  return (
                    <th key={pt} className="px-1 py-0.5 text-center font-mono text-[10px] font-normal text-muted-foreground">
                      {colSum > 0 ? formatBalance(colSum) : ''}
                    </th>
                  )
                })}
              </tr>
            )}
            <tr className="border-b bg-muted/40">
              {/* Finance column headers with filters */}
              {FINANCE_ORDER.map((pt) => (
                <ColumnHeader
                  key={pt}
                  platform={pt}
                  filterValue={columnFilters[pt] ?? 'all'}
                  onFilterChange={(v) => setColumnFilter(pt, v)}
                  getOptions={getStatusOptions}
                                  />
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
              {/* Sports column headers with filters */}
              {SPORTS_PLATFORMS.map((pt) => (
                <ColumnHeader
                  key={pt}
                  platform={pt}
                  filterValue={columnFilters[pt] ?? 'all'}
                  onFilterChange={(v) => setColumnFilter(pt, v)}
                  getOptions={getStatusOptions}
                                  />
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={ALL_COLUMN_PLATFORMS.length + 3} className="py-8 text-center text-muted-foreground">
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
                    {FINANCE_ORDER.map((pt) =>
                      activeTab === 'status' ? (
                        <StatusCell
                          key={pt}
                          row={row}
                          platform={pt}
                          effectiveStatus={getEffectiveStatus(row, pt)}
                          isPending={isPending}
                          onStatusChange={handleStatusChange}
                          onLimitedDetail={handleLimitedDetail}
                          getOptions={getStatusOptions}
                          getLimited={getDetailLimited}
                          getActive={getDetailActive}
                                                  />
                      ) : (
                        <BalanceCell
                          key={pt}
                          row={row}
                          platform={pt}
                          effectiveStatus={getEffectiveStatus(row, pt)}
                        />
                      ),
                    )}
                    {/* Finance aggregate */}
                    <td className="border-r px-2 py-1 text-center align-middle font-mono text-[10px] text-muted-foreground">
                      {finTotal > 0 ? formatBalance(finTotal) : '—'}
                    </td>
                    {/* Client name (sticky) */}
                    <td className="sticky left-0 z-10 border-r bg-background px-3 py-1 align-middle font-medium">
                      <span className="truncate">{row.clientName}</span>
                    </td>
                    {/* Sports aggregate */}
                    <td className="border-r px-2 py-1 text-center align-middle font-mono text-[10px] text-muted-foreground">
                      {sportTotal > 0 ? formatBalance(sportTotal) : '—'}
                    </td>
                    {/* Sports cells */}
                    {SPORTS_PLATFORMS.map((pt) =>
                      activeTab === 'status' ? (
                        <StatusCell
                          key={pt}
                          row={row}
                          platform={pt}
                          effectiveStatus={getEffectiveStatus(row, pt)}
                          isPending={isPending}
                          onStatusChange={handleStatusChange}
                          onLimitedDetail={handleLimitedDetail}
                          getOptions={getStatusOptions}
                          getLimited={getDetailLimited}
                          getActive={getDetailActive}
                                                  />
                      ) : (
                        <BalanceCell
                          key={pt}
                          row={row}
                          platform={pt}
                          effectiveStatus={getEffectiveStatus(row, pt)}
                        />
                      ),
                    )}
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
// ColumnHeader — platform header with inline filter dropdown
// ══════════════════════════════════════════════════════════

interface ColumnHeaderProps {
  platform: string
  filterValue: string
  onFilterChange: (value: string) => void
  getOptions?: (platform: string) => StatusOption[]
}

function ColumnHeader({ platform, filterValue, onFilterChange, getOptions }: ColumnHeaderProps) {
  const options = getOptions ? getOptions(platform) : getStatusOptionsDefault(platform)
  const isFiltered = filterValue !== 'all'
  const isSportsbook = !['BANK', 'EDGEBOOST', 'PAYPAL'].includes(platform)
  const grouped = isSportsbook ? groupByCategory(options) : null

  return (
    <th className="whitespace-nowrap px-1 py-1 text-center font-medium text-muted-foreground" style={{ minWidth: 80 }}>
      <Select value={filterValue} onValueChange={onFilterChange}>
        <SelectTrigger
          className={cn(
            'mx-auto h-5 w-fit gap-1 border-0 px-1.5 text-[10px] font-medium shadow-none',
            isFiltered ? 'bg-blue-400/20 text-blue-400' : 'bg-transparent text-muted-foreground',
          )}
        >
          <span className="flex items-center gap-1">
            {isFiltered && <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400" />}
            {PLATFORM_INFO[platform as keyof typeof PLATFORM_INFO]?.abbrev ?? platform}
          </span>
        </SelectTrigger>
        <SelectContent className="max-h-64" position="popper" sideOffset={4}>
          <SelectItem value="all" className="text-xs">
            All
          </SelectItem>
          {grouped ? (
            grouped.map(([group, items]) => (
              <SelectGroup key={group}>
                <SelectLabel className="text-[10px] text-muted-foreground">
                  {STATUS_GROUP_LABELS[group as SportsbookStatusGroup]}
                </SelectLabel>
                {items.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    <span className={cn('inline-block h-2 w-2 rounded-full mr-1.5', opt.color)} />
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))
          ) : (
            options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </th>
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
  getOptions?: (platform: string) => StatusOption[]
  getLimited?: (platform: string) => LimitedConfig
  getActive?: (platform: string) => ActiveDetailConfig | null
}

function StatusCell({ row, platform, effectiveStatus, isPending, onStatusChange, onLimitedDetail, getOptions, getLimited, getActive }: StatusCellProps) {
  const colors = statusColors(effectiveStatus, platform)
  const displayLabel = statusDisplayLabel(effectiveStatus, platform)
  const options = getOptions ? getOptions(platform) : getStatusOptionsDefault(platform)

  const isSportsbook = !['BANK', 'EDGEBOOST', 'PAYPAL'].includes(platform)

  // Limited detail: show tool icon inline when status = LIMITED (sportsbook only)
  const isLimited = effectiveStatus?.status === 'LIMITED' && isSportsbook
  const limitedConfig = getLimited ? getLimited(platform) : getLimitedConfigDefault(platform)
  const hasLimitedConfig = isLimited && limitedConfig.type !== 'none'

  // Active detail for financial platforms (Bank → Chase/Citi/BofA, EB → Tier 1-4)
  const activeDetailConfig = getActive ? getActive(platform) : getActiveDetailConfigDefault(platform)
  const showActiveDetail = effectiveStatus?.status === 'ACTIVE' && activeDetailConfig != null

  return (
    <td className="px-1 py-1 text-center align-middle" data-testid={`status-cell-${row.clientRecordId}-${platform}`}>
      <div className="flex items-center justify-center gap-0.5">
        {/* Active detail INLINE LEFT (Bank name / EB tier) */}
        {showActiveDetail && (
          <ActiveDetailInput
            config={activeDetailConfig}
            entry={effectiveStatus}
            isPending={isPending}
            onChange={(detail) => onLimitedDetail(row, platform, { limitDetail: detail })}
          />
        )}

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
              groupByCategory(options).map(([group, items]) => (
                <SelectGroup key={group}>
                  <SelectLabel className="text-[10px] text-muted-foreground">
                    {STATUS_GROUP_LABELS[group as SportsbookStatusGroup]}
                  </SelectLabel>
                  {items.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      <span className={cn('inline-block h-2 w-2 rounded-full mr-1.5', opt.color)} />
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))
            ) : (
              options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        {/* Limited detail: inline tool icon that opens popover */}
        {hasLimitedConfig && (
          <LimitedDetailPopover
            platform={platform}
            config={limitedConfig}
            entry={effectiveStatus}
            isPending={isPending}
            onChange={(detail) => onLimitedDetail(row, platform, detail)}
          />
        )}
      </div>
    </td>
  )
}

// ══════════════════════════════════════════════════════════
// BalanceCell — read-only balance with color fill
// ══════════════════════════════════════════════════════════

interface BalanceCellProps {
  row: AccountStatusRow
  platform: string
  effectiveStatus: PlatformStatusEntry | null
}

function BalanceCell({ row, platform, effectiveStatus }: BalanceCellProps) {
  const balance = row.platformBalances[platform]
  const fillBg = statusFillColor(effectiveStatus, platform)
  const colors = statusColors(effectiveStatus, platform)

  return (
    <td className="px-1 py-1 text-center align-middle">
      <div
        className={cn(
          'mx-auto inline-flex items-center justify-center rounded px-2 py-0.5 font-mono text-[10px] font-medium',
          fillBg,
          colors.text,
        )}
      >
        {formatCellBalance(balance)}
      </div>
    </td>
  )
}

// ══════════════════════════════════════════════════════════
// LimitedDetailPopover — icon button that opens inline limited detail editor
// ══════════════════════════════════════════════════════════

interface LimitedDetailPopoverProps {
  platform: string
  config: { type: string; options?: string[]; sports?: string[] }
  entry: PlatformStatusEntry | null
  isPending: boolean
  onChange: (detail: { limitDetail?: string; limitAmount?: number; limitSports?: string[] }) => void
}

function LimitedDetailPopover({ platform, config, entry, isPending, onChange }: LimitedDetailPopoverProps) {
  const [open, setOpen] = useState(false)
  const popRef = useRef<HTMLDivElement>(null)

  // Click-outside handler for manual popovers
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // For percentage / mgm-tier: button toggles a floating option list
  if (config.type === 'percentage' || config.type === 'mgm-tier') {
    return (
      <div className="relative" ref={popRef}>
        <button
          type="button"
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded bg-yellow-400/10 transition-colors hover:bg-yellow-400/20',
            open && 'bg-yellow-400/20',
          )}
          onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
          title="Set limited detail"
          disabled={isPending}
        >
          <Settings2 className="h-3.5 w-3.5 text-yellow-400" />
        </button>
        {open && (
          <div className="absolute left-0 top-7 z-50 min-w-[80px] rounded border border-border bg-popover py-1 shadow-md">
            {config.options?.map((opt) => (
              <button
                key={opt}
                type="button"
                className={cn(
                  'block w-full px-2 py-1 text-left text-xs hover:bg-accent',
                  entry?.limitDetail === opt && 'bg-accent font-medium text-yellow-400',
                )}
                onClick={() => { onChange({ limitDetail: opt }); setOpen(false) }}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // For amount: icon toggles a small inline amount input
  if (config.type === 'amount') {
    return (
      <div className="relative" ref={popRef}>
        <button
          type="button"
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded bg-yellow-400/10 transition-colors hover:bg-yellow-400/20',
            open && 'bg-yellow-400/20',
          )}
          onClick={() => setOpen(!open)}
          title="Set limited amount"
          disabled={isPending}
        >
          <Settings2 className="h-3.5 w-3.5 text-yellow-400" />
        </button>
        {open && (
          <div className="absolute left-0 top-6 z-50 rounded border border-border bg-popover p-1 shadow-md">
            <Input
              type="number"
              placeholder="$amt"
              className="h-5 w-20 border-0 bg-yellow-400/10 px-1 text-center text-[10px] text-yellow-400 shadow-none"
              defaultValue={entry?.limitAmount ?? ''}
              autoFocus
              disabled={isPending}
              onBlur={(e) => {
                const v = parseFloat(e.target.value)
                if (!isNaN(v)) onChange({ limitAmount: v })
                setOpen(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = parseFloat((e.target as HTMLInputElement).value)
                  if (!isNaN(v)) onChange({ limitAmount: v })
                  setOpen(false)
                }
                if (e.key === 'Escape') setOpen(false)
              }}
            />
          </div>
        )}
      </div>
    )
  }

  // For caesars-sports: icon toggles a small inline panel
  if (config.type === 'caesars-sports') {
    return (
      <div className="relative" ref={popRef}>
        <button
          type="button"
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded bg-yellow-400/10 transition-colors hover:bg-yellow-400/20',
            open && 'bg-yellow-400/20',
          )}
          onClick={() => setOpen(!open)}
          title="Set limited sports"
          disabled={isPending}
        >
          <Settings2 className="h-3.5 w-3.5 text-yellow-400" />
        </button>
        {open && (
          <div className="absolute left-0 top-6 z-50 flex flex-col gap-1 rounded border border-border bg-popover p-1.5 shadow-md">
            <Select
              value={entry?.limitDetail ?? ''}
              onValueChange={(v) => onChange({ limitDetail: v, limitSports: entry?.limitSports })}
              disabled={isPending}
            >
              <SelectTrigger className="h-5 min-w-[50px] border-0 bg-yellow-400/10 px-1 text-[9px] text-yellow-400 shadow-none">
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
        )}
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
      <SelectTrigger className="h-5 min-w-[50px] max-w-[70px] border-0 bg-green-400/10 px-1 text-[9px] text-green-400 shadow-none">
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

// ── Tailwind safelist for dynamic balance fill colors ──
// These bg classes are dynamically generated from textColor values in account-status-config.ts.
// Listing them here ensures Tailwind includes them in the bundle:
// bg-sky-300/15 bg-blue-400/15 bg-muted-foreground/15 bg-green-400/15 bg-emerald-400/15
// bg-yellow-400/15 bg-purple-400/15 bg-red-300/15 bg-orange-400/15 bg-red-400/15
// bg-amber-500/15
