'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

type StepStatus = 'complete' | 'pending' | 'blocked' | 'not-started'

const statusConfig: Record<StepStatus, { label: string; className: string }> = {
  complete: {
    label: 'Complete',
    className: 'bg-success/15 text-success border-success/30',
  },
  pending: {
    label: 'Pending',
    className: 'bg-warning/15 text-warning border-warning/30',
  },
  blocked: {
    label: 'Blocked',
    className: 'bg-destructive/15 text-destructive border-destructive/30',
  },
  'not-started': {
    label: 'Not Started',
    className: 'bg-muted text-muted-foreground border-border',
  },
}

interface StepCardProps {
  stepNumber: number
  title: string
  status: StepStatus
  missingItems?: string[]
  actionLabel?: string
  onAction?: () => void
  children: React.ReactNode
  defaultOpen?: boolean
  onReview?: () => void
  locked?: boolean
}

export function StepCard({
  stepNumber,
  title,
  status,
  missingItems = [],
  actionLabel,
  onAction,
  children,
  defaultOpen = false,
  onReview,
  locked = false,
}: StepCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const config = statusConfig[status]

  if (locked) {
    return (
      <div
        className="rounded-lg border border-border bg-card opacity-50 pointer-events-none"
        data-testid={`step-card-${stepNumber}`}
      >
        <div className="flex w-full items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="w-5 text-xs font-mono text-muted-foreground">
              {stepNumber}
            </span>
            <span className="text-sm font-medium text-foreground">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Complete Phase 1 to unlock
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card transition-all',
        status === 'complete' && 'opacity-75',
      )}
      data-testid={`step-card-${stepNumber}`}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="w-5 text-xs font-mono text-muted-foreground">
              {stepNumber}
            </span>
            <span className="text-sm font-medium text-foreground">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn('text-[10px] h-5 shrink-0', config.className)}
            >
              {config.label}
            </Badge>
            {status !== 'complete' && onReview && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  onReview()
                }}
                data-testid={`step-${stepNumber}-review-btn`}
              >
                Review
              </Button>
            )}
            {status !== 'complete' && actionLabel && onAction && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  onAction()
                }}
              >
                {actionLabel}
              </Button>
            )}
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                isOpen && 'rotate-180',
              )}
            />
          </div>
        </CollapsibleTrigger>

        {/* Collapsed missing items */}
        {!isOpen && missingItems.length > 0 && (
          <div className="px-5 pb-3 -mt-1">
            <p className="text-xs text-destructive">
              {missingItems.join(' · ')}
            </p>
          </div>
        )}

        <CollapsibleContent forceMount className="data-[state=closed]:hidden">
          <div className="border-t border-border/50 px-5 pb-5">
            <div className="pt-4">{children}</div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
