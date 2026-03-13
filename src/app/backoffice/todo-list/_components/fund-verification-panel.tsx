'use client'

import { useState } from 'react'
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  Star,
  Mail,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ClearingDetailDialog } from './clearing-detail-dialog'
import type { FundAllocationEntry, FundClearingUrgency } from './types'

interface FundVerificationPanelProps {
  verificationAllocations: FundAllocationEntry[]
  lastGmailSync: Date | null
}

const URGENCY_STYLES: Record<FundClearingUrgency, { bg: string; text: string; icon: typeof AlertTriangle }> = {
  arrived: { bg: 'bg-success/5', text: 'text-success', icon: Star },
  'expected-soon': { bg: 'bg-warning/5', text: 'text-warning', icon: Clock },
  'in-transit': { bg: '', text: 'text-muted-foreground', icon: ArrowRight },
  stuck: { bg: 'bg-destructive/5', text: 'text-destructive', icon: AlertTriangle },
  discrepancy: { bg: 'bg-destructive/5', text: 'text-destructive', icon: AlertTriangle },
}

export function FundVerificationPanel({
  verificationAllocations,
  lastGmailSync,
}: FundVerificationPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const gmailStatus = getGmailSyncStatus(lastGmailSync)
  const needActionCount = verificationAllocations.filter(
    (a) => a.urgency !== 'arrived',
  ).length

  return (
    <>
      <button
        id="fund-verification"
        onClick={() => setDialogOpen(true)}
        className="card-terminal flex min-h-[320px] flex-col p-0 text-left transition-colors hover:border-primary/30"
        data-testid="fund-verification-panel"
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-3">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Clearing Status
          </h3>
          {needActionCount > 0 && (
            <span className="rounded bg-warning/20 px-2 py-0.5 font-mono text-xs font-semibold text-warning">
              {needActionCount}
            </span>
          )}
          <div className="ml-auto">
            <GmailSyncDot status={gmailStatus} lastSync={lastGmailSync} />
          </div>
        </div>

        {/* Content — scrollable list */}
        <div className="flex-1 overflow-y-auto">
          {verificationAllocations.length === 0 ? (
            <div className="flex h-full items-center justify-center px-5 py-8">
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-6 w-6 text-success/60" />
                <p className="mt-2 text-sm text-muted-foreground">All cleared</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {verificationAllocations.map((alloc) => (
                <ClearingRow key={alloc.id} alloc={alloc} />
              ))}
            </div>
          )}
        </div>
      </button>

      <ClearingDetailDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        allocations={verificationAllocations}
      />
    </>
  )
}

function ClearingRow({ alloc }: { alloc: FundAllocationEntry }) {
  const style = URGENCY_STYLES[alloc.urgency]
  const UrgencyIcon = style.icon
  const destination = alloc.destinationPlatform ?? 'Bank'
  const sourceLabel = alloc.clientName ? `${alloc.clientName}'s ` : ''
  const destLabel = alloc.destinationClientName ? `${alloc.destinationClientName}'s ` : ''

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-5 py-2.5',
        style.bg,
      )}
      data-testid={`clearing-row-${alloc.id}`}
    >
      {/* Source Client's Platform → Dest Client's Platform */}
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {sourceLabel}{alloc.platform} <span className="text-muted-foreground">→</span> {destLabel}{destination}
      </span>

      {/* Amount */}
      <span className="shrink-0 font-mono text-sm font-semibold text-foreground">
        ${alloc.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </span>

      {/* Time label */}
      <span className={cn('shrink-0 text-xs font-medium', style.text)}>
        {alloc.timeLabel}
      </span>

      {/* Urgency indicator */}
      {alloc.urgency === 'arrived' ? (
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-success">
          <Star className="h-3 w-3 fill-success" />
        </span>
      ) : (
        <UrgencyIcon className={cn('h-3.5 w-3.5 shrink-0', style.text)} />
      )}
    </div>
  )
}

// ── Gmail Sync Dot ─────────────────────────────────────

type SyncStatus = 'fresh' | 'stale' | 'offline' | 'none'

function getGmailSyncStatus(lastSync: Date | null): SyncStatus {
  if (!lastSync) return 'none'
  const minutesAgo = (Date.now() - new Date(lastSync).getTime()) / (1000 * 60)
  if (minutesAgo <= 10) return 'fresh'
  if (minutesAgo <= 60) return 'stale'
  return 'offline'
}

function GmailSyncDot({
  status,
  lastSync,
}: {
  status: SyncStatus
  lastSync: Date | null
}) {
  if (status === 'none') return null

  const config = {
    fresh: { dot: 'bg-success' },
    stale: { dot: 'bg-warning' },
    offline: { dot: 'bg-destructive' },
  }[status]

  const timeAgo = lastSync
    ? formatDistanceToNow(new Date(lastSync), { addSuffix: true })
    : ''

  return (
    <div
      className="flex items-center gap-1.5"
      title={`Gmail synced ${timeAgo}`}
      data-testid="gmail-sync-badge"
    >
      <div className={cn('h-2 w-2 rounded-full', config.dot)} />
      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
  )
}
