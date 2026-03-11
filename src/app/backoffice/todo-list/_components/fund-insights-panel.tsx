'use client'

import {
  TrendingUp,
  Mail,
  Star,
  ShieldAlert,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Inbox,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import type { ProcessedEmailEntry } from './types'

interface FundInsightsPanelProps {
  processedEmails: ProcessedEmailEntry[]
  gmailMatchedCount: number
}

// Detection type display config
const DETECTION_CONFIG: Record<string, {
  label: string
  icon: typeof Mail
  color: string
  bgColor: string
}> = {
  VIP: { label: 'VIP', icon: Star, color: 'text-yellow-400', bgColor: 'bg-yellow-400/10' },
  VERIFICATION: { label: 'Verify', icon: ShieldAlert, color: 'text-primary', bgColor: 'bg-primary/10' },
  FUND_DEPOSIT: { label: 'Deposit', icon: ArrowDownRight, color: 'text-success', bgColor: 'bg-success/10' },
  FUND_WITHDRAWAL: { label: 'Withdrawal', icon: ArrowUpRight, color: 'text-destructive', bgColor: 'bg-destructive/10' },
  PAYPAL: { label: 'PayPal', icon: Mail, color: 'text-primary', bgColor: 'bg-primary/10' },
}

export function FundInsightsPanel({
  processedEmails,
  gmailMatchedCount,
}: FundInsightsPanelProps) {
  // Group by detection type
  const vipEmails = processedEmails.filter((e) => e.detectionType === 'VIP')
  const fundEmails = processedEmails.filter((e) =>
    ['FUND_DEPOSIT', 'FUND_WITHDRAWAL', 'PAYPAL'].includes(e.detectionType),
  )
  const verificationEmails = processedEmails.filter((e) => e.detectionType === 'VERIFICATION')

  return (
    <div id="fund-insights" className="card-terminal flex min-h-[256px] flex-col p-0" data-testid="fund-insights-panel">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-3">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Fund Movement Insights
        </h3>
        {vipEmails.length > 0 && (
          <span className="rounded bg-yellow-400/20 px-2 py-0.5 font-mono text-xs font-semibold text-yellow-400">
            {vipEmails.length} VIP
          </span>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 border-b border-border/50 px-5 py-2">
        <StatChip
          icon={CheckCircle2}
          label="Auto-matched"
          value={gmailMatchedCount}
          color="text-success"
        />
        <StatChip
          icon={Inbox}
          label="Emails (7d)"
          value={processedEmails.length}
          color="text-primary"
        />
        <StatChip
          icon={Star}
          label="VIP alerts"
          value={vipEmails.length}
          color="text-yellow-400"
        />
      </div>

      {/* Content */}
      <div className="flex-1">
        {processedEmails.length === 0 ? (
          <div className="flex h-full items-center justify-center px-5 py-8">
            <div className="text-center">
              <Inbox className="mx-auto h-6 w-6 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">No Gmail detections this week</p>
              <p className="text-xs text-muted-foreground/60">Connect Gmail to auto-detect fund movements</p>
            </div>
          </div>
        ) : (
          <div className="max-h-[224px] divide-y divide-border/30 overflow-y-auto">
            {/* VIP emails first */}
            {vipEmails.map((email) => (
              <EmailRow key={email.id} email={email} />
            ))}
            {/* Fund-related emails */}
            {fundEmails.map((email) => (
              <EmailRow key={email.id} email={email} />
            ))}
            {/* Verification emails */}
            {verificationEmails.map((email) => (
              <EmailRow key={email.id} email={email} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmailRow({ email }: { email: ProcessedEmailEntry }) {
  const config = DETECTION_CONFIG[email.detectionType] ?? {
    label: email.detectionType,
    icon: Mail,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  }
  const Icon = config.icon
  const timeAgo = formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })

  return (
    <div
      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/20"
      data-testid={`insight-email-${email.id}`}
    >
      <div className={cn('flex h-7 w-7 items-center justify-center rounded', config.bgColor)}>
        <Icon className={cn('h-3.5 w-3.5', config.color)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {email.subject.length > 50 ? email.subject.slice(0, 50) + '...' : email.subject}
          </span>
          {email.fundAllocationId && (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {email.from.split('<')[0].trim()} — {timeAgo}
        </p>
      </div>
      <span className={cn('shrink-0 rounded px-2 py-0.5 text-[11px] font-medium', config.bgColor, config.color)}>
        {config.label}
      </span>
    </div>
  )
}

function StatChip({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Mail
  label: string
  value: number
  color: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={cn('h-3.5 w-3.5', color)} />
      <span className="font-mono text-xs font-semibold text-foreground">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  )
}
