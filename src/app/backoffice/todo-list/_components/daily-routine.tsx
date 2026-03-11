'use client'

import { useState } from 'react'
import {
  CheckCircle2,
  Circle,
  ListChecks,
  DollarSign,
  Smartphone,
  TrendingUp,
  UserCheck,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ActionHubKPIs } from './types'

interface DailyRoutineProps {
  kpis: ActionHubKPIs
}

const ROUTINE_ITEMS = [
  { key: 'pnl', label: 'Review P&L & balances', icon: TrendingUp, link: '/backoffice/daily-balances' },
  { key: 'devices', label: 'Device management', icon: Smartphone, kpiKey: 'overdueDevices' as const },
  { key: 'funds', label: 'Record fund allocations', icon: DollarSign, kpiKey: 'todayAllocations' as const },
  { key: 'approvals', label: 'Approve pending clients', icon: UserCheck, kpiKey: 'readyToApprove' as const },
  { key: 'todos', label: 'Work through todos', icon: ClipboardList, kpiKey: 'pendingTodos' as const },
]

export function DailyRoutine({ kpis }: DailyRoutineProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const toggle = (key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const doneCount = Object.values(checked).filter(Boolean).length

  return (
    <div className="card-terminal flex min-h-[280px] flex-col p-0" data-testid="daily-routine">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <ListChecks className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Daily Routine
        </h3>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {doneCount}/{ROUTINE_ITEMS.length}
        </span>
      </div>

      {/* Checklist */}
      <div className="flex-1 divide-y divide-border/20 overflow-y-auto">
        {ROUTINE_ITEMS.map((item) => {
          const isDone = checked[item.key] ?? false
          const count = item.kpiKey ? kpis[item.kpiKey] : undefined
          const Icon = item.icon

          return (
            <button
              key={item.key}
              onClick={() => toggle(item.key)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/20"
              data-testid={`routine-item-${item.key}`}
            >
              {isDone ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
              )}
              <Icon className={cn('h-3.5 w-3.5 shrink-0', isDone ? 'text-muted-foreground/30' : 'text-muted-foreground')} />
              <span
                className={cn(
                  'min-w-0 flex-1 text-sm',
                  isDone ? 'text-muted-foreground/50 line-through' : 'text-foreground',
                )}
              >
                {item.label}
              </span>
              {count !== undefined && count > 0 && (
                <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
