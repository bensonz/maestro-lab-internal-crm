import { cn } from '@/lib/utils'
import type { CockpitSignalData } from '@/types/backend-types'

const STATUS_CONFIG = {
  normal: {
    bg: 'bg-success/10',
    border: 'border-success/30',
    dot: 'bg-success',
    text: 'text-success',
  },
  attention: {
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    dot: 'bg-warning',
    text: 'text-warning',
  },
  critical: {
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
    dot: 'bg-destructive',
    text: 'text-destructive',
  },
} as const

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

interface CockpitSignalProps {
  signal: CockpitSignalData
  today: string
  userName: string
}

export function CockpitSignal({ signal, today, userName }: CockpitSignalProps) {
  const cfg = STATUS_CONFIG[signal.statusLevel]
  const firstName = userName.split(' ')[0] || userName
  const greeting = getGreeting()

  const statusMessage =
    signal.statusLevel === 'normal'
      ? 'All systems running smoothly.'
      : signal.statusLevel === 'attention'
        ? `${signal.attentionCount} item${signal.attentionCount !== 1 ? 's' : ''} need attention.`
        : `${signal.attentionCount} issue${signal.attentionCount !== 1 ? 's' : ''} require review.`

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border px-4 py-3',
        cfg.bg,
        cfg.border,
      )}
      data-testid="cockpit-signal"
    >
      <div className="flex items-center gap-3">
        <span
          className={cn('h-2.5 w-2.5 rounded-full', cfg.dot)}
          data-testid="signal-dot"
        />
        <div>
          <p className="text-sm font-medium text-foreground">
            {greeting}, {firstName}.
          </p>
          <p className={cn('text-xs', cfg.text)}>
            {statusMessage}
          </p>
        </div>
      </div>
      <span className="font-mono text-xs text-muted-foreground">
        {today}
      </span>
    </div>
  )
}
