'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  ChevronRight,
  DollarSign,
} from 'lucide-react'
import type { CockpitFundWarRoom, CockpitSmartInsight } from '@/types/backend-types'

// Platform favicon domains for Google Favicon API
const PLATFORM_FAVICON: Record<string, string> = {
  DRAFTKINGS: 'draftkings.com',
  FANDUEL: 'fanduel.com',
  BETMGM: 'betmgm.com',
  CAESARS: 'caesars.com',
  FANATICS: 'sportsbook.fanatics.com',
  BALLYBET: 'ballybet.com',
  BETRIVERS: 'betrivers.com',
  BET365: 'bet365.com',
}

function getFaviconUrl(platform: string): string {
  const domain = PLATFORM_FAVICON[platform]
  if (!domain) return ''
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
}

interface FundWarRoomProps {
  data: CockpitFundWarRoom
}

export function FundWarRoom({ data }: FundWarRoomProps) {
  const [insightsOpen, setInsightsOpen] = useState(false)

  return (
    <div className="card-terminal p-0" data-testid="fund-war-room">
      {/* Platform Cards */}
      <div className="grid grid-cols-2 gap-px sm:grid-cols-4 lg:grid-cols-8">
        {data.platforms.map((p) => (
          <PlatformCard
            key={p.platform}
            platform={p.platform}
            name={p.platformName}
            balance={p.totalBalance}
            target={p.target}
            accounts={p.accountCount}
            accountTarget={p.accountTarget}
            totalSlots={p.totalSlots}
            vipCount={p.vipCount}
            limitedCount={p.limitedCount}
            belowMin={p.accountsBelowMin.length}
            minAccountTarget={p.minAccountTarget}
            bankrollReady={p.bankrollReady}
            avgDays={p.avgDaysPerClient}
            pipelineCount={p.pipelineCount}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Row 2: Bank $250 Alert + EdgeBoost Onboarding */}
      <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-border">
        <BankOvernightAlert alerts={data.bankAlerts} />
        <EdgeBoostTracker progress={data.edgeBoostProgress} />
      </div>

      {/* Row 3: Insights — collapsible, collapsed by default */}
      {data.insights.length > 0 && (
        <>
          <div className="border-t border-border" />
          <InsightsSection
            insights={data.insights}
            open={insightsOpen}
            onToggle={() => setInsightsOpen(!insightsOpen)}
          />
        </>
      )}
    </div>
  )
}

// ── Platform Card ───────────────────────────────────────────────────

function PlatformCard({
  platform,
  name,
  balance,
  target,
  accounts,
  accountTarget,
  totalSlots,
  vipCount,
  limitedCount,
  belowMin,
  minAccountTarget,
  bankrollReady,
  avgDays,
  pipelineCount,
}: {
  platform: string
  name: string
  balance: number
  target: number
  accounts: number
  accountTarget: number
  totalSlots: number
  vipCount: number
  limitedCount: number
  belowMin: number
  minAccountTarget: number
  bankrollReady: number
  avgDays: number | null
  pipelineCount: number
}) {
  const faviconUrl = getFaviconUrl(platform)
  const accountsShort = accounts < accountTarget

  // Format min account target for display
  const minLabel = minAccountTarget >= 1000
    ? `$${(minAccountTarget / 1000).toFixed(minAccountTarget % 1000 === 0 ? 0 : 1)}k`
    : `$${minAccountTarget}`

  // Build status tags
  const tags: { label: string; color: string }[] = []
  if (vipCount > 0) tags.push({ label: `${vipCount} vip`, color: 'text-success' })
  if (limitedCount > 0) tags.push({ label: `${limitedCount} limits`, color: 'text-warning' })
  if (belowMin > 0) tags.push({ label: `${belowMin}<${minLabel}`, color: 'text-destructive' })

  return (
    <div
      className="flex flex-col px-5 py-5"
      title={name}
      data-testid={`platform-card-${platform}`}
    >
      {/* Logo + Name */}
      <div className="mb-4 flex items-center gap-2.5">
        {faviconUrl && (
          <img
            src={faviconUrl}
            alt={name}
            width={24}
            height={24}
            className="rounded-sm"
          />
        )}
        <span className="text-sm font-semibold text-foreground">{name}</span>
      </div>

      {/* Balance / Target */}
      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-2xl font-bold text-foreground">
            ${balance.toLocaleString()}
          </span>
          <span className="font-mono text-sm text-muted-foreground">/</span>
        </div>
        <div className="font-mono text-sm text-muted-foreground">
          ${target.toLocaleString()}
        </div>
      </div>

      {/* 4-line meta */}
      <div className="mt-auto flex flex-col gap-1 font-mono text-xs text-muted-foreground">
        <span className={cn(accountsShort && 'text-destructive font-semibold')}>
          {accounts}/{accountTarget} accounts
        </span>
        {tags.length > 0 ? (
          <span className="flex flex-wrap gap-x-1.5">
            {tags.map((t) => (
              <span key={t.label} className={t.color}>{t.label}</span>
            ))}
          </span>
        ) : (
          <span className="text-muted-foreground/40">all healthy</span>
        )}
        <span>${bankrollReady.toLocaleString()} bankroll</span>
        <span>
          {avgDays !== null ? `${avgDays} d/avg` : '—'}
          {' · '}
          <span className={cn(pipelineCount > 0 ? 'text-foreground' : 'text-muted-foreground/40')}>
            {pipelineCount} pipeline
          </span>
        </span>
      </div>
    </div>
  )
}

// ── Bank Overnight Alert ────────────────────────────────────────────

function BankOvernightAlert({ alerts }: { alerts: CockpitFundWarRoom['bankAlerts'] }) {
  if (alerts.length === 0) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <DollarSign className="h-3.5 w-3.5" />
          <span className="font-medium">Bank $250 Overnight</span>
          <span className="ml-auto text-success">All clear</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-destructive/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-destructive">
        Bank $250 Overnight — {alerts.length} violation{alerts.length !== 1 ? 's' : ''}
      </div>
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {alerts.map((a) => (
          <div
            key={a.clientId}
            className="flex items-center justify-between text-xs"
          >
            <span className="text-foreground">{a.clientName}</span>
            <span className="flex items-center gap-2">
              <span className="font-mono font-semibold text-destructive">
                ${a.bankBalance.toLocaleString()}
              </span>
              <span className="text-muted-foreground">
                {a.oldestDepositHoursAgo}h ago
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── EdgeBoost Tracker ───────────────────────────────────────────────

function EdgeBoostTracker({
  progress,
}: {
  progress: CockpitFundWarRoom['edgeBoostProgress']
}) {
  const incomplete = progress.filter((p) => !p.isComplete)
  const complete = progress.filter((p) => p.isComplete)

  return (
    <div className="p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-foreground">
        EdgeBoost Onboarding
        <span className="ml-auto text-muted-foreground">
          {complete.length}/{progress.length} complete
        </span>
      </div>

      {incomplete.length === 0 ? (
        <p className="text-xs text-success">All clients completed 4x deposits</p>
      ) : (
        <div className="max-h-40 space-y-1.5 overflow-y-auto">
          {incomplete.map((p) => (
            <div key={p.clientId} className="flex items-center gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate text-foreground">{p.clientName}</span>
              {/* 4 dots */}
              <div className="flex gap-0.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-2 w-2 rounded-full',
                      i < p.depositsCompleted ? 'bg-success' : 'bg-muted',
                    )}
                  />
                ))}
              </div>
              <span className="font-mono text-muted-foreground">
                ${p.remaining.toLocaleString()} left
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Insights Section (shared) ───────────────────────────────────────

export function InsightsSection({
  insights,
  open,
  onToggle,
}: {
  insights: CockpitSmartInsight[]
  open: boolean
  onToggle: () => void
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground"
        data-testid="insights-toggle"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        Insights ({insights.length})
      </button>
      {open && (
        <div className="space-y-1 border-t border-border px-4 py-3">
          {insights.map((i) => (
            <div
              key={i.id}
              className={cn(
                'flex items-start gap-2 text-xs',
                i.severity === 'critical'
                  ? 'text-destructive'
                  : i.severity === 'warning'
                    ? 'text-warning'
                    : 'text-muted-foreground',
              )}
            >
              <span className="mt-0.5">
                {i.severity === 'critical' ? '!!' : i.severity === 'warning' ? '!' : '-'}
              </span>
              <span>{i.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
