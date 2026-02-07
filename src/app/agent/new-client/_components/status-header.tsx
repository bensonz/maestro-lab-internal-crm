'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

type StepStatus = 'complete' | 'pending' | 'blocked' | 'not-started'

const riskConfig = {
  low: {
    label: 'Low Risk',
    className: 'bg-success/15 text-success border-success/30',
  },
  medium: {
    label: 'Medium Risk',
    className: 'bg-warning/15 text-warning border-warning/30',
  },
  high: {
    label: 'High Risk',
    className: 'bg-destructive/15 text-destructive border-destructive/30',
  },
}

function getStatusColor(status: string): string {
  if (status.includes('Approved') || status.includes('Complete')) {
    return 'bg-success/15 text-success border-success/30'
  }
  if (status.includes('Blocked') || status.includes('Missing')) {
    return 'bg-destructive/15 text-destructive border-destructive/30'
  }
  if (status.includes('Review') || status.includes('Ready')) {
    return 'bg-warning/15 text-warning border-warning/30'
  }
  return 'bg-muted text-muted-foreground border-border'
}

function getStepDotClass(status: StepStatus): string {
  switch (status) {
    case 'complete':
      return 'bg-success border-success'
    case 'pending':
      return 'border-2 border-primary bg-transparent'
    case 'blocked':
      return 'bg-destructive border-destructive'
    default:
      return 'bg-muted border-border'
  }
}

interface StatusHeaderProps {
  clientName: string
  overallStatus: string
  riskLevel: 'low' | 'medium' | 'high'
  lastAction: string
  steps: { status: StepStatus }[]
  onSubmit: () => void
  submitDisabled: boolean
  onSaveDraft: () => void
  isSaving: boolean
}

export function StatusHeader({
  clientName,
  overallStatus,
  riskLevel,
  lastAction,
  steps,
  onSubmit,
  submitDisabled,
  onSaveDraft,
  isSaving,
}: StatusHeaderProps) {
  const risk = riskConfig[riskLevel]
  const completedSteps = steps.filter((s) => s.status === 'complete').length

  return (
    <div className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
        {/* Left side */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/agent/clients">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              data-testid="new-client-back-btn"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div className="min-w-0 flex items-center gap-2">
            {clientName && (
              <span className="truncate text-sm font-semibold">
                {clientName}
              </span>
            )}
            <Badge
              variant="outline"
              className={cn('text-[10px] h-5 shrink-0', getStatusColor(overallStatus))}
            >
              {overallStatus}
            </Badge>
            <Badge
              variant="outline"
              className={cn('text-[10px] h-5 shrink-0', risk.className)}
            >
              {risk.label}
            </Badge>
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-1.5 ml-2">
            {steps.map((step, i) => (
              <div
                key={i}
                className={cn('h-2.5 w-2.5 rounded-full', getStepDotClass(step.status))}
              />
            ))}
            <span className="ml-1 text-[11px] font-mono text-muted-foreground">
              {completedSteps}/{steps.length}
            </span>
          </div>

          {lastAction && (
            <span className="hidden lg:inline text-[11px] text-muted-foreground ml-2 truncate">
              {lastAction}
            </span>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={onSaveDraft}
            disabled={isSaving}
            data-testid="save-draft-btn"
          >
            <Save className="mr-1 h-3 w-3" />
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={onSubmit}
            disabled={submitDisabled}
            data-testid="submit-application-btn"
          >
            Submit Application
          </Button>
        </div>
      </div>
    </div>
  )
}
