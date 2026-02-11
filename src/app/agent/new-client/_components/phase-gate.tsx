'use client'

import { Lock, Unlock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PhaseGateProps {
  unlocked: boolean
  lockedMessage?: string
}

export function PhaseGate({ unlocked, lockedMessage }: PhaseGateProps) {
  return (
    <div
      className={cn(
        'relative flex items-center gap-3 py-4',
      )}
      data-testid="phase-gate"
    >
      <div className="flex-1 border-t border-dashed border-border" />
      <div
        className={cn(
          'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium',
          unlocked
            ? 'border-success/30 bg-success/10 text-success'
            : 'border-border bg-muted text-muted-foreground',
        )}
      >
        {unlocked ? (
          <>
            <Unlock className="h-3.5 w-3.5" />
            Full Application Unlocked
          </>
        ) : (
          <>
            <Lock className="h-3.5 w-3.5" />
            {lockedMessage || 'Complete pre-qualification to unlock'}
          </>
        )}
      </div>
      <div className="flex-1 border-t border-dashed border-border" />
    </div>
  )
}
