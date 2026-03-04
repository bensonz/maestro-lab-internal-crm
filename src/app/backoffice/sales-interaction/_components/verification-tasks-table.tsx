'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, Phone } from 'lucide-react'
import type { VerificationTask } from '@/types/backend-types'
import { PlatformType } from '@/types'
import { cn } from '@/lib/utils'
import { DeadlineCountdown } from '@/components/deadline-countdown'

interface VerificationTasksTableProps {
  tasks: VerificationTask[]
  selectedAgentId: string | null
  /** Fixed width (px) for the client-name column — aligns with sibling ClientIntakeList */
  nameColumnWidth?: number
  onSelectClient?: (clientId: string) => void
  onAssignDevice?: (draftId: string, clientName: string, agentName: string, phone?: string | null, carrier?: string | null) => void
  onCompleteTodo?: (todoId: string, clientName: string) => void
}

export function VerificationTasksTable({
  tasks,
  selectedAgentId,
  nameColumnWidth,
  onSelectClient,
  onAssignDevice,
  onCompleteTodo,
}: VerificationTasksTableProps) {
  if (tasks.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {selectedAgentId
          ? 'No tasks for selected agent'
          : 'No verification tasks pending'}
      </p>
    )
  }

  return (
    <div
      className="grid gap-x-1.5"
      style={{
        gridTemplateColumns: `${nameColumnWidth ? `${nameColumnWidth}px` : 'auto'} 110px 1fr auto auto auto auto`,
      }}
    >
      {tasks.map((task) => (
        <div
          key={task.id}
          className="col-span-full grid grid-cols-subgrid items-center border-b border-border/20 px-5 py-2 transition-colors last:border-b-0 hover:bg-muted/30"
          data-testid={`verification-row-${task.id}`}
        >
          {/* Col 1: Client name (aligned with ClientIntakeList) */}
          {task.clientId ? (
            <button
              type="button"
              onClick={() => onSelectClient?.(task.clientId!)}
              className="truncate text-left text-sm font-medium text-foreground hover:text-primary hover:underline"
              data-testid={`client-name-${task.clientId}`}
            >
              {task.clientName}
            </button>
          ) : (
            <span className="truncate text-sm font-medium text-foreground">
              {task.clientName}
            </span>
          )}

          {/* Col 2: Agent name (aligned with ClientIntakeList — same 110px) */}
          <span className="truncate text-[11px] text-muted-foreground">
            {task.agentName}
          </span>

          {/* Col 3: Task description */}
          <span className="truncate text-xs text-muted-foreground">
            {task.task}
          </span>

          {/* Col 4: Platform badge */}
          <PlatformBadge platformType={task.platformType} label={task.platformLabel} />

          {/* Col 5: Assign Device button */}
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2.5 text-xs"
            onClick={() => onAssignDevice?.(task.draftId ?? task.id, task.clientName, task.agentName, task.assignedPhone, task.assignedCarrier)}
            data-testid={`assign-phone-${task.id}`}
          >
            <Phone className="h-3 w-3" />
            Assign Device
          </Button>

          {/* Col 6: Countdown */}
          <div className="flex items-center justify-end">
            {task.clientDeadline ? (
              <DeadlineCountdown
                deadline={task.clientDeadline}
                variant="inline"
              />
            ) : task.deadlineLabel ? (
              <span className="text-[11px] text-muted-foreground">
                {task.deadlineLabel}
              </span>
            ) : null}
          </div>

          {/* Col 7: Done button */}
          <Button
            size="sm"
            variant="outline"
            className="h-7 cursor-pointer gap-1 px-2.5 text-xs"
            onClick={() => onCompleteTodo?.(task.id, task.clientName)}
            data-testid={`done-task-${task.id}`}
          >
            <Check className="h-3 w-3" />
            Done
          </Button>
        </div>
      ))}
    </div>
  )
}

function PlatformBadge({
  platformType,
  label,
}: {
  platformType: PlatformType | null
  label?: string
}) {
  if (!platformType) {
    if (label) {
      return (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          {label}
        </Badge>
      )
    }
    return null
  }

  const config = getPlatformBadgeConfig(platformType)

  return (
    <Badge
      variant="outline"
      className={cn('shrink-0 text-[10px] font-medium', config.className)}
    >
      {config.label}
    </Badge>
  )
}

function getPlatformBadgeConfig(platformType: PlatformType): {
  label: string
  className: string
} {
  const configs: Record<PlatformType, { label: string; className: string }> = {
    [PlatformType.DRAFTKINGS]: {
      label: 'DraftKings',
      className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
    [PlatformType.FANDUEL]: {
      label: 'FanDuel',
      className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    },
    [PlatformType.BETMGM]: {
      label: 'BetMGM',
      className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    },
    [PlatformType.CAESARS]: {
      label: 'Caesars',
      className: 'bg-red-500/20 text-red-400 border-red-500/30',
    },
    [PlatformType.FANATICS]: {
      label: 'Fanatics',
      className: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    },
    [PlatformType.BALLYBET]: {
      label: 'Bally Bet',
      className: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    },
    [PlatformType.BETRIVERS]: {
      label: 'BetRivers',
      className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    },
    [PlatformType.BET365]: {
      label: 'Bet365',
      className: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
    },
    [PlatformType.BANK]: {
      label: 'Bank',
      className: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    },
    [PlatformType.PAYPAL]: {
      label: 'PayPal',
      className: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    },
    [PlatformType.EDGEBOOST]: {
      label: 'Edgeboost',
      className: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    },
  }

  return configs[platformType] || { label: platformType, className: '' }
}
