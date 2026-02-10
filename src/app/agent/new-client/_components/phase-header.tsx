'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface PhaseHeaderProps {
  phase: 1 | 2
  title: string
  active: boolean
}

export function PhaseHeader({ phase, title, active }: PhaseHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 py-3',
        !active && 'opacity-50',
      )}
      data-testid={`phase-header-${phase}`}
    >
      <Badge
        variant="outline"
        className={cn(
          'text-[10px] h-5 font-mono shrink-0',
          active
            ? 'bg-primary/10 text-primary border-primary/30'
            : 'bg-muted text-muted-foreground border-border',
        )}
      >
        Phase {phase}
      </Badge>
      <span
        className={cn(
          'text-sm font-medium',
          active ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {title}
      </span>
      <div className="flex-1 border-t border-border/50" />
    </div>
  )
}
