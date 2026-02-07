'use client'

import { useEffect, useState } from 'react'
import { DollarSign, Flame, TrendingUp, PartyPopper } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FeedbackToastProps {
  lastEarning: number
  totalEarnedToday: number
  currentStreak: number
  completedToday: number
  show: boolean
  onDismiss: () => void
}

export function FeedbackToast({
  lastEarning,
  totalEarnedToday,
  currentStreak,
  completedToday,
  show,
  onDismiss,
}: FeedbackToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
        setTimeout(onDismiss, 300)
      }, 3500)
      return () => clearTimeout(timer)
    }
  }, [show, onDismiss])

  if (!show && !visible) return null

  const msg =
    lastEarning > 0
      ? {
          text: `+$${lastEarning} closer to your goal!`,
          icon: DollarSign,
          accent: 'text-success' as const,
        }
      : currentStreak >= 3
        ? {
            text: `${currentStreak}-day streak maintained`,
            icon: Flame,
            accent: 'text-warning' as const,
          }
        : completedToday >= 3
          ? {
              text: `${completedToday} tasks done today — keep going!`,
              icon: PartyPopper,
              accent: 'text-primary' as const,
            }
          : {
              text: 'Task completed — momentum building!',
              icon: TrendingUp,
              accent: 'text-primary' as const,
            }

  const MsgIcon = msg.icon

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-300',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
      )}
      data-testid="feedback-toast"
    >
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-5 py-3 shadow-lg">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            msg.accent === 'text-success'
              ? 'bg-success/15'
              : msg.accent === 'text-warning'
                ? 'bg-warning/15'
                : 'bg-primary/15',
          )}
        >
          <MsgIcon className={cn('h-4 w-4', msg.accent)} />
        </div>
        <span className={cn('text-sm font-medium', msg.accent)}>
          {msg.text}
        </span>
        {totalEarnedToday > 0 && lastEarning > 0 && (
          <span className="ml-2 font-mono text-[10px] text-muted-foreground">
            Today: ${totalEarnedToday}
          </span>
        )}
      </div>
    </div>
  )
}
