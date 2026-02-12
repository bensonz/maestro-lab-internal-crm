'use client'

import {
  Star,
  Users,
  AlertTriangle,
  CheckCircle2,
  Flame,
  DollarSign,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentProfile, DailyGoalData } from './types'

interface AgentHeaderProps {
  agent: AgentProfile
  data: DailyGoalData
}

export function AgentHeader({ agent, data }: AgentHeaderProps) {
  const taskPercent =
    data.totalTasks > 0
      ? Math.round((data.completedTasks / data.totalTasks) * 100)
      : 0

  return (
    <div
      className="rounded-lg border border-border bg-card p-5"
      data-testid="agent-header"
    >
      {/* Top row: identity + streak */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
            <span className="font-mono text-sm font-bold text-primary">
              {agent.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {agent.name}
              </span>
              <div className="flex gap-0.5">
                {Array.from({ length: agent.starLevel }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-3 w-3 fill-warning text-warning"
                  />
                ))}
              </div>
            </div>
            <div className="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <Users className="h-3 w-3" />
              {agent.activeClients} active &middot; {agent.totalClients} total
            </div>
          </div>
        </div>

        {data.currentStreak > 0 && (
          <div className="flex items-center gap-1.5 rounded-full border border-warning/20 bg-warning/10 px-3 py-1">
            <Flame className="h-3.5 w-3.5 text-warning" />
            <span className="font-mono text-[11px] font-semibold text-warning">
              {data.currentStreak}d streak
            </span>
          </div>
        )}
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Potential earnings from new clients */}
        <div className="rounded-md border border-success/15 bg-success/5 px-3 py-2.5">
          <p className="mb-1 text-[9px] uppercase tracking-widest text-muted-foreground">
            Potential Earnings
          </p>
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-success" />
            <p className="font-mono text-base font-semibold text-success">
              ${data.potentialNew}
            </p>
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            from active leads
          </p>
        </div>

        {/* Overdue % and bonus impact */}
        <div
          className={cn(
            'rounded-md border px-3 py-2.5',
            data.overduePercent > 0
              ? 'border-destructive/20 bg-destructive/5'
              : 'border-border/40 bg-muted/15',
          )}
        >
          <p className="mb-1 text-[9px] uppercase tracking-widest text-muted-foreground">
            Overdue Impact
          </p>
          <div className="flex items-center gap-1.5">
            {data.overduePercent > 0 ? (
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
            )}
            <p
              className={cn(
                'font-mono text-base font-semibold',
                data.overduePercent > 0
                  ? 'text-destructive'
                  : 'text-success',
              )}
            >
              {data.overduePercent}%
            </p>
          </div>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            Bonus: ${data.effectiveBonus.toLocaleString()} / $
            {data.bonusAmount.toLocaleString()}
          </p>
        </div>

        {/* Tasks */}
        <div className="rounded-md border border-border/40 bg-muted/15 px-3 py-2.5">
          <p className="mb-1 text-[9px] uppercase tracking-widest text-muted-foreground">
            Tasks
          </p>
          <div className="flex items-center gap-1.5">
            <CheckCircle2
              className={cn(
                'h-3.5 w-3.5',
                taskPercent >= 50 ? 'text-success' : 'text-muted-foreground',
              )}
            />
            <p className="font-mono text-base font-semibold text-foreground">
              {data.completedTasks}
              <span className="text-muted-foreground">
                /{data.totalTasks}
              </span>
            </p>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted/40">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                taskPercent >= 50 ? 'bg-success' : 'bg-primary/60',
              )}
              style={{ width: `${taskPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
