'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Layers,
  Smartphone,
} from 'lucide-react'
import type { CockpitOnboardingBottleneck } from '@/types/backend-types'
import { InsightsSection } from './fund-war-room'

const AMAZON_PHONE_URL = 'https://www.amazon.com/s?k=prepaid+phones'

interface OnboardingBottleneckProps {
  data: CockpitOnboardingBottleneck
}

export function OnboardingBottleneck({ data }: OnboardingBottleneckProps) {
  const [insightsOpen, setInsightsOpen] = useState(false)
  const { stepPipeline, devices, unusedAccounts } = data
  const totalDrafts = stepPipeline.reduce((s, p) => s + p.totalInStep, 0)

  return (
    <div className="card-terminal space-y-3 p-4" data-testid="onboarding-bottleneck">
      {/* Header — no count */}
      <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
        Onboarding Bottleneck
      </h2>

      {/* Top card: Pipeline summary + Bottleneck (aligns with Agent Ranking) */}
      <div className="rounded-md border border-border bg-card p-3">
        <h3 className="mb-2 flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 font-medium text-foreground">
            <Layers className="h-3.5 w-3.5" />
            Pipeline
          </span>
          <span className="font-mono text-muted-foreground">
            avg {data.pipelineAvgDays > 0 ? `${data.pipelineAvgDays}d` : '—'}
          </span>
        </h3>

        {totalDrafts === 0 ? (
          <p className="text-xs text-muted-foreground">Pipeline clear — no active drafts</p>
        ) : (
          <>
            {/* 4 step avg boxes */}
            <div className="mb-2 grid grid-cols-4 gap-2">
              {stepPipeline.map((s) => {
                const isBottleneck = data.bottleneckStep === s.step
                return (
                  <StatBox
                    key={s.step}
                    label={s.label}
                    value={s.avgDays > 0 ? `${s.avgDays}d` : '—'}
                    highlight={isBottleneck ? 'warning' : undefined}
                  />
                )
              })}
            </div>
          </>
        )}

        {/* Bottleneck line — below border divider */}
        <div className="border-t border-border/50 pt-2 text-xs">
          {data.bottleneckStep !== null && data.pipelineAvgDays > 0 ? (
            <span className="font-mono text-muted-foreground">
              Bottleneck: Step {data.bottleneckStep} ({data.bottleneckPct}%)
              <span className="ml-1 text-warning">←</span>
            </span>
          ) : (
            <span className="text-muted-foreground">No bottleneck detected</span>
          )}
        </div>
      </div>

      {/* Second card: Devices (aligns with Team Metrics) */}
      <div className="rounded-md border border-border bg-card p-3">
        <h3 className="mb-2 flex items-center gap-2 text-xs font-medium text-foreground">
          <Smartphone className="h-3.5 w-3.5" />
          Devices
          <span className="ml-auto font-mono text-muted-foreground">
            {devices.devicesOut} out · {devices.totalDevices} total
          </span>
        </h3>
        <div className="space-y-1.5 text-xs">
          {devices.needThisWeek > 0 ? (
            <div className="flex items-center justify-between">
              <span className="font-medium text-warning">
                Low Inventory — Need {devices.needThisWeek} phone{devices.needThisWeek !== 1 ? 's' : ''} this week
              </span>
              <a
                href={AMAZON_PHONE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-muted-foreground underline hover:text-foreground"
              >
                Order →
              </a>
            </div>
          ) : (
            <div className="text-muted-foreground">
              Inventory OK — no phones needed this week
            </div>
          )}
          {devices.waitingForDevice > 0 && (
            <div className="text-muted-foreground">
              {devices.waitingForDevice} client{devices.waitingForDevice !== 1 ? 's' : ''} waiting for device
            </div>
          )}
          {devices.overdue > 0 && (
            <div className="font-medium text-destructive">
              {devices.overdue} device{devices.overdue !== 1 ? 's' : ''} overdue
            </div>
          )}
        </div>
      </div>

      {/* Unused Accounts */}
      {unusedAccounts.length > 0 && (
        <div className="rounded-md border border-border bg-card p-3">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-medium text-foreground">
            Unused Accounts
            <span className="ml-auto text-muted-foreground">
              {unusedAccounts.length} account{unusedAccounts.length !== 1 ? 's' : ''} with $0
            </span>
          </h3>
          <div className="space-y-1">
            {unusedAccounts.slice(0, 8).map((a, i) => (
              <div
                key={`${a.clientId}-${a.platform}-${i}`}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-foreground">{a.clientName}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span>{a.platformName}</span>
                  <span className="text-[10px]">{a.daysSinceApproval}d ago</span>
                </span>
              </div>
            ))}
            {unusedAccounts.length > 8 && (
              <p className="text-[10px] text-muted-foreground">
                +{unusedAccounts.length - 8} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Insights */}
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

// ── Stat Box ────────────────────────────────────────────────────────

function StatBox({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: 'warning' | 'destructive'
}) {
  return (
    <div
      className={cn(
        'rounded border border-border/50 bg-background p-1.5 text-center',
        highlight === 'warning' && 'border-warning/30 bg-warning/5',
        highlight === 'destructive' && 'border-destructive/30 bg-destructive/5',
      )}
    >
      <div
        className={cn(
          'font-mono text-sm font-bold',
          highlight === 'warning'
            ? 'text-warning'
            : highlight === 'destructive'
              ? 'text-destructive'
              : 'text-foreground',
        )}
      >
        {value}
      </div>
      <div className="truncate text-[10px] text-muted-foreground">{label}</div>
    </div>
  )
}
