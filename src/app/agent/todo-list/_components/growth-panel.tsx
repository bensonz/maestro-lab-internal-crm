'use client'

import { useState } from 'react'
import {
  UserPlus,
  DollarSign,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Recycle,
  ChevronDown,
  ChevronRight,
  Wallet,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { GrowthClient } from './types'

// Earning Row

function EarningRow({
  label,
  amount,
  icon: Icon,
  color,
}: {
  label: string
  amount: number
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <div className="flex items-center gap-1.5">
        <Icon className={cn('h-3 w-3', color)} />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <span className={cn('font-mono text-[11px] font-medium', color)}>
        {amount >= 0 ? `$${amount}` : `-$${Math.abs(amount)}`}
      </span>
    </div>
  )
}

// Client Card

function ClientCard({ client }: { client: GrowthClient }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="overflow-hidden rounded-md border border-border/30 bg-muted/10">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/20"
        data-testid={`growth-client-${client.id}`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {client.name}
            </span>
            <Badge
              variant="outline"
              className={cn(
                'h-4 px-1.5 text-[9px]',
                client.stage === 'in_progress'
                  ? 'border-primary/40 text-primary'
                  : client.stage === 'phone_issued'
                    ? 'border-warning/40 text-warning'
                    : 'border-border text-muted-foreground',
              )}
            >
              {client.stageLabel}
            </Badge>
          </div>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {client.pendingTasks} tasks &middot; Day {client.daysInPipeline}
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <div className="text-right">
            <p className="font-mono text-sm font-bold text-success">
              ${client.finalTake}
            </p>
            <p className="text-[9px] text-muted-foreground">your take</p>
          </div>
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-border/20 px-3 pb-3">
          <div className="mt-2 space-y-0.5 rounded-md bg-card/60 p-2.5">
            <p className="mb-1.5 text-[9px] font-medium uppercase tracking-widest text-muted-foreground">
              Earnings Breakdown
            </p>
            <EarningRow
              label="Direct Bonus"
              amount={client.directEarning}
              icon={DollarSign}
              color="text-success"
            />
            <EarningRow
              label="Star Pool (self)"
              amount={client.starEarning}
              icon={Star}
              color="text-warning"
            />
            <EarningRow
              label="Downline Bonus"
              amount={client.downlineEarning}
              icon={ArrowDownRight}
              color="text-primary"
            />
            <EarningRow
              label="Upstream Share"
              amount={-client.upstreamShare}
              icon={ArrowUpRight}
              color="text-destructive/70"
            />
            {client.recycledAmount > 0 && (
              <EarningRow
                label="Recycled"
                amount={client.recycledAmount}
                icon={Recycle}
                color="text-muted-foreground"
              />
            )}
            <div className="mt-1.5 flex items-center justify-between border-t border-border/30 pt-1.5">
              <div className="flex items-center gap-1.5">
                <Wallet className="h-3 w-3 text-success" />
                <span className="text-[10px] font-semibold text-foreground">
                  Your Final Take
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-success">
                ${client.finalTake}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Growth Panel

interface GrowthPanelProps {
  clients: GrowthClient[]
}

export function GrowthPanel({ clients }: GrowthPanelProps) {
  const totalPool = clients.reduce((s, c) => s + c.poolPerLead, 0)
  const totalTake = clients.reduce((s, c) => s + c.finalTake, 0)

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-lg border border-primary/15 bg-card"
      data-testid="growth-panel"
    >
      {/* Header */}
      <div className="border-b border-border/40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Growth Track
              </h3>
              <p className="text-[10px] text-muted-foreground">
                New Client Conversion
              </p>
            </div>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {clients.length} lead{clients.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Summary */}
        <div className="mt-2.5 flex items-center gap-3 rounded-md border border-success/15 bg-success/5 px-3 py-1.5">
          <DollarSign className="h-3.5 w-3.5 flex-shrink-0 text-success" />
          <span className="font-mono text-[11px] text-muted-foreground">
            Pool:{' '}
            <span className="font-medium text-foreground">${totalPool}</span>
            <span className="mx-1.5 text-muted-foreground/30">&middot;</span>
            Your take:{' '}
            <span className="font-semibold text-success">${totalTake}</span>
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {clients.length > 0 ? (
          clients.map((c) => <ClientCard key={c.id} client={c} />)
        ) : (
          <div className="py-8 text-center">
            <UserPlus className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No active leads</p>
          </div>
        )}
      </div>
    </div>
  )
}
