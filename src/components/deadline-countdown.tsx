import { cn } from '@/lib/utils'
import { AlertTriangle, Clock } from 'lucide-react'

interface DeadlineCountdownProps {
  deadline: Date | string | null
  className?: string
  variant?: 'badge' | 'inline' | 'card'
  isDelayed?: boolean
}

type Urgency = 'safe' | 'warning' | 'urgent' | 'critical' | 'overdue'

function getDeadlineInfo(deadline: Date | string) {
  const now = new Date()
  const deadlineDate =
    typeof deadline === 'string' ? new Date(deadline) : deadline
  const diffMs = deadlineDate.getTime() - now.getTime()
  const isOverdue = diffMs < 0

  const absDiffMs = Math.abs(diffMs)
  const totalHours = Math.floor(absDiffMs / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  const minutes = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60))

  let label: string
  if (days > 0) {
    label = `${days}d ${hours}h`
  } else if (hours > 0) {
    label = `${hours}h ${minutes}m`
  } else {
    label = `${minutes}m`
  }

  let urgency: Urgency
  if (isOverdue) {
    urgency = 'overdue'
    label = `Overdue by ${label}`
  } else if (totalHours < 6) {
    urgency = 'critical'
    label = `${label} left`
  } else if (totalHours < 24) {
    urgency = 'urgent'
    label = `${label} left`
  } else if (days < 2) {
    urgency = 'warning'
    label = `${label} left`
  } else {
    urgency = 'safe'
    label = `${label} left`
  }

  return { label, urgency, deadlineDate }
}

const URGENCY_STYLES: Record<Urgency, string> = {
  safe: 'bg-chart-4/20 text-chart-4 border-chart-4/30',
  warning: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  urgent:
    'bg-destructive/20 text-destructive border-destructive/30 animate-pulse',
  critical:
    'bg-destructive/20 text-destructive border-destructive/30 animate-[pulse_0.75s_ease-in-out_infinite]',
  overdue: 'bg-destructive/20 text-destructive border-destructive/30',
}

export function DeadlineCountdown({
  deadline,
  className,
  variant = 'badge',
  isDelayed,
}: DeadlineCountdownProps) {
  if (!deadline) return null

  const info = getDeadlineInfo(deadline)
  const label = isDelayed && info.urgency === 'overdue' ? 'Delayed' : info.label
  const { urgency, deadlineDate } = info
  const Icon = urgency === 'overdue' ? AlertTriangle : Clock

  if (variant === 'inline') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-xs',
          URGENCY_STYLES[urgency]
            .replace(/bg-\S+/g, '')
            .replace(/border-\S+/g, '')
            .trim(),
          className,
        )}
      >
        <Icon className="h-3 w-3" />
        {label}
      </span>
    )
  }

  if (variant === 'card') {
    const formattedDate = deadlineDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium',
            URGENCY_STYLES[urgency],
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        <span className="text-xs text-muted-foreground">
          Due: {formattedDate}
        </span>
      </div>
    )
  }

  // Default: badge variant
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium',
        URGENCY_STYLES[urgency],
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}
