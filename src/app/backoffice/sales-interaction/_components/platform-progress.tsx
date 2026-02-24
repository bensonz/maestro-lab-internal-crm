'use client'

import { cn } from '@/lib/utils'

interface PlatformProgressBarProps {
  verified: number
  total: number
  className?: string
}

export function PlatformProgressBar({
  verified,
  total,
  className,
}: PlatformProgressBarProps) {
  if (total === 0) return null

  const pct = Math.round((verified / total) * 100)

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      data-testid="platform-progress"
    >
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground/40 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[10px] text-muted-foreground">
        {verified}/{total}
      </span>
    </div>
  )
}
