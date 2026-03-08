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
    <div className="card-terminal space-y-4 p-4" data-testid="fund-war-room">
      {/* Platform Cards — no header, full width */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {data.platforms.map((p) => (
          <PlatformCard
            key={p.platform}
            platform={p.platform}
            name={p.platformName}
            balance={p.totalBalance}
            target={p.target}
            accounts={p.accountCount}
            belowMin={p.accountsBelowMin.length}
            burnRate={p.burnRate}
          />
        ))}
      </div>

      {/* Row 2: Bank $250 Alert + EdgeBoost Onboarding */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <BankOvernightAlert alerts={data.bankAlerts} />
        <EdgeBoostTracker progress={data.edgeBoostProgress} />
      </div>

      {/* Row 3: Insights — collapsible, collapsed by default */}
      {data.insights.length > 0 && (
        <InsightsSection
          insights={data.insights}
          open={insightsOpen}
          onToggle={() => setInsightsOpen(!insightsOpen)}
        />
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
  belowMin,
  burnRate,
}: {
  platform: string
  name: string
  balance: number
  target: number
  accounts: number
  belowMin: number
  burnRate: number | null
}) {
  const faviconUrl = getFaviconUrl(platform)

  return (
    <div
      className="flex flex-col rounded-md border border-border bg-card p-3.5"
      title={name}
      data-testid={`platform-card-${platform}`}
    >
      {/* Logo + Name + Accounts */}
      <div className="mb-2 flex items-center gap-2">
        {faviconUrl && (
          <img
            src={faviconUrl}
            alt={name}
            width={20}
            height={20}
            className="rounded-sm"
          />
        )}
        <span className="text-xs font-semibold text-foreground">{name}</span>
      </div>

      {/* Balance: "5,050 of 100,000" — target in smaller font */}
      <div className="mb-2">
        <span className="font-mono text-lg font-bold text-foreground">
          {balance.toLocaleString()}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {' '}of{' '}
          <span className="text-[9px]">{target.toLocaleString()}</span>
        </span>
      </div>

      {/* Accounts */}
      <div className="mb-1 text-[10px] text-muted-foreground">
        {accounts} accts
      </div>

      {/* Below min: "x/total accts <$5K" — red text only, no bg */}
      {belowMin > 0 ? (
        <div className="mb-1 text-[10px]">
          <span className="font-medium text-destructive">
            {belowMin}/{accounts} accts &lt;$5K
          </span>
        </div>
      ) : accounts > 0 ? (
        <div className="mb-1 text-[10px] text-muted-foreground/50">
          all accts &gt;$5K
        </div>
      ) : null}

      {/* Burn rate */}
      <div className="mt-auto text-[10px] text-muted-foreground">
        {burnRate !== null && burnRate > 0 ? (
          <span>~${burnRate.toLocaleString()}/wk out</span>
        ) : (
          <span className="text-muted-foreground/50">no withdrawals</span>
        )}
      </div>
    </div>
  )
}

// ── Bank Overnight Alert ────────────────────────────────────────────

function BankOvernightAlert({ alerts }: { alerts: CockpitFundWarRoom['bankAlerts'] }) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <DollarSign className="h-3.5 w-3.5" />
          <span className="font-medium">Bank $250 Overnight</span>
          <span className="ml-auto text-success">All clear</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-destructive">
        Bank $250 Overnight — {alerts.length} violation{alerts.length !== 1 ? 's' : ''}
      </div>
      <div className="space-y-1">
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
    <div className="rounded-md border border-border bg-card p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-foreground">
        EdgeBoost Onboarding
        <span className="ml-auto text-muted-foreground">
          {complete.length}/{progress.length} complete
        </span>
      </div>

      {incomplete.length === 0 ? (
        <p className="text-xs text-success">All clients completed 4x deposits</p>
      ) : (
        <div className="space-y-1.5">
          {incomplete.slice(0, 5).map((p) => (
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
          {incomplete.length > 5 && (
            <p className="text-[10px] text-muted-foreground">
              +{incomplete.length - 5} more
            </p>
          )}
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
    <div className="rounded-md border border-border bg-card">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        data-testid="insights-toggle"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        Insights ({insights.length})
      </button>
      {open && (
        <div className="space-y-1 border-t border-border px-3 py-2">
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
