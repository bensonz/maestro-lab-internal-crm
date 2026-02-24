'use client'

import { cn } from '@/lib/utils'
import { Shield, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import type { RiskAssessment } from '@/types/backend-types'

interface RiskPanelProps {
  assessment: RiskAssessment
  onFlagsChange: (flags: Record<string, unknown>) => void
  draftSelected: boolean
  idExpiryDaysRemaining?: number | null
}

const HOUSEHOLD_LABELS: Record<string, string> = {
  supportive: 'Supportive',
  aware_neutral: 'Neutral',
  not_aware: 'Not Aware',
  not_applicable: 'N/A',
}

const FAMILY_SUPPORT_LABELS: Record<string, string> = {
  willing_to_help: 'Willing',
  available_uninvolved: 'Uninvolved',
  no: 'No',
  prefer_not_to_involve: 'Won\'t Involve',
}

const AUTONOMY_LABELS: Record<string, string> = {
  fully_independent: 'Independent',
  shared_with_spouse: 'Shared',
  dependent_on_others: 'Dependent',
}

type FlagEntry = {
  key: keyof RiskAssessment['flags']
  label: string
  weight: string
  type: 'boolean' | 'idExpiry' | 'missingId' | 'assessment'
  labels?: Record<string, string>
}

const FLAG_ENTRIES: FlagEntry[] = [
  { key: 'missingIdCount', label: 'Missing IDs', weight: '0: +10 / each: −10', type: 'missingId' },
  { key: 'idExpiryRisk', label: 'ID Expiring Soon', weight: '−10 to −20', type: 'idExpiry' },
  { key: 'paypalPreviouslyUsed', label: 'PayPal Previously Used', weight: '−10', type: 'boolean' },
  { key: 'multipleAddresses', label: 'Multiple Addresses', weight: 'info only', type: 'boolean' },
  { key: 'debankedHistory', label: 'De-banked History', weight: '−30', type: 'boolean' },
  { key: 'criminalRecord', label: 'Criminal Record', weight: '−30', type: 'boolean' },
  { key: 'householdAwareness', label: 'Household Awareness', weight: '0 to −8', type: 'assessment', labels: HOUSEHOLD_LABELS },
  { key: 'familyTechSupport', label: 'Family Support', weight: '0 to −15', type: 'assessment', labels: FAMILY_SUPPORT_LABELS },
  { key: 'financialAutonomy', label: 'Financial Autonomy', weight: '0 to −15', type: 'assessment', labels: AUTONOMY_LABELS },
]

export function RiskPanel({ assessment, draftSelected, idExpiryDaysRemaining }: RiskPanelProps) {
  const levelColors = {
    low: 'text-success bg-success/10 border-success/30',
    medium: 'text-warning bg-warning/10 border-warning/30',
    high: 'text-destructive bg-destructive/10 border-destructive/30',
  }

  const LevelIcon = {
    low: CheckCircle2,
    medium: AlertTriangle,
    high: XCircle,
  }[assessment.level]

  return (
    <div
      className="hidden w-56 min-w-56 shrink-0 flex-col border-l border-sidebar-border bg-sidebar lg:flex"
      data-testid="risk-panel"
    >
      <div className="border-b p-3">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Shield className="h-4 w-4" />
          Risk Assessment
        </div>
      </div>

      <div className="flex-1 p-3 space-y-4">
        {!draftSelected ? (
          <p className="text-xs text-muted-foreground">
            Select a draft to see risk assessment.
          </p>
        ) : (
          <>
            {/* Score badge */}
            <div
              className={cn(
                'flex items-center gap-2 rounded-md border p-3',
                levelColors[assessment.level],
              )}
              data-testid="risk-score-badge"
            >
              <LevelIcon className="h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold capitalize">
                  {assessment.level} Risk
                </p>
                <p className="text-xs">Score: {assessment.score}</p>
              </div>
            </div>

            {/* Flag checklist */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Risk Factors
              </p>

              {FLAG_ENTRIES.map((entry) => {
                const value = assessment.flags[entry.key]
                let active: boolean
                let displayLabel = entry.label

                if (entry.type === 'idExpiry') {
                  active = value === 'high' || value === 'moderate'
                  if (active && idExpiryDaysRemaining != null) {
                    displayLabel = `ID Expiring in ${idExpiryDaysRemaining}D`
                  }
                } else if (entry.type === 'missingId') {
                  const count = value as number
                  active = count > 0
                  displayLabel = count === 0 ? 'All IDs Present' : `${count} Missing ID${count > 1 ? 's' : ''}`
                } else if (entry.type === 'assessment') {
                  const strVal = value as string
                  active = !!strVal && strVal !== 'supportive' && strVal !== 'willing_to_help' && strVal !== 'fully_independent' && strVal !== 'not_applicable'
                  if (strVal && entry.labels) {
                    displayLabel = `${entry.label}: ${entry.labels[strVal] ?? strVal}`
                  }
                } else {
                  active = value === true
                }

                return (
                  <div
                    key={entry.key}
                    className="flex items-center justify-between text-xs"
                    data-testid={`risk-flag-${entry.key}`}
                  >
                    <span
                      className={cn(
                        'flex items-center gap-1',
                        entry.type === 'missingId' && !active
                          ? 'text-success'
                          : active
                            ? 'text-foreground'
                            : 'text-muted-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-1.5 w-1.5 rounded-full',
                          entry.type === 'missingId' && !active
                            ? 'bg-success'
                            : active
                              ? 'bg-destructive'
                              : 'bg-muted-foreground/30',
                        )}
                      />
                      {displayLabel}
                    </span>
                    <span className="text-muted-foreground/60">{entry.weight}</span>
                  </div>
                )
              })}
            </div>

            {/* Threshold guide */}
            <div className="rounded-md border p-2 text-[10px] text-muted-foreground space-y-0.5">
              <p className="font-medium">Thresholds</p>
              <p>0 to +10: Low (green)</p>
              <p>−1 to −29: Medium (amber)</p>
              <p>−30 or below: High (red)</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
