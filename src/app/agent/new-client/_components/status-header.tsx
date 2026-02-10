'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatusHeaderProps {
  clientName: string
  riskLevel: 'low' | 'medium' | 'high'
  onSubmit: () => void
  submitDisabled: boolean
  onSaveDraft: () => void
  isSaving: boolean
  phase: 1 | 2
  betmgmVerified: boolean
  prequalSubmitted: boolean
}

export function StatusHeader({
  clientName,
  riskLevel,
  onSubmit,
  submitDisabled,
  onSaveDraft,
  isSaving,
  phase,
  betmgmVerified,
  prequalSubmitted,
}: StatusHeaderProps) {
  const getSubmitLabel = () => {
    if (phase === 1) {
      if (prequalSubmitted && !betmgmVerified) return 'Awaiting Verification'
      return 'Submit Phase 1'
    }
    return 'Submit Application'
  }

  const isAwaitingVerification = prequalSubmitted && !betmgmVerified

  const riskColor = {
    low: 'text-success',
    medium: 'text-warning',
    high: 'text-destructive',
  }[riskLevel]

  return (
    <div className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-8 py-2.5">
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

          {clientName && (
            <span className="truncate text-sm font-medium text-foreground">
              {clientName}
            </span>
          )}

          <span className="text-xs text-muted-foreground">
            Phase {phase}
          </span>

          <span className={cn('text-xs font-medium', riskColor)}>
            {riskLevel === 'low' ? 'Low Risk' : riskLevel === 'medium' ? 'Med Risk' : 'High Risk'}
          </span>
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
            className={cn(
              'h-8 text-xs',
              isAwaitingVerification &&
                'bg-warning text-warning-foreground hover:bg-warning/90',
            )}
            onClick={onSubmit}
            disabled={submitDisabled || isAwaitingVerification}
            data-testid="submit-application-btn"
          >
            {isAwaitingVerification && (
              <Clock className="mr-1 h-3 w-3" />
            )}
            {getSubmitLabel()}
          </Button>
        </div>
      </div>
    </div>
  )
}
