'use client'

import { cn } from '@/lib/utils'
import { Shield, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import type { RiskAssessment } from '@/types/backend-types'

interface RiskPanelProps {
  assessment: RiskAssessment
  onFlagsChange: (flags: Record<string, boolean>) => void
  draftSelected: boolean
}

const FLAG_LABELS: { key: keyof RiskAssessment['flags']; label: string }[] = [
  { key: 'idExpiringSoon', label: 'ID Expiring Soon' },
  { key: 'paypalPreviouslyUsed', label: 'PayPal Previously Used' },
  { key: 'addressMismatch', label: 'Address Mismatch' },
  { key: 'debankedHistory', label: 'De-banked History' },
  { key: 'criminalRecord', label: 'Criminal Record' },
  { key: 'undisclosedInfo', label: 'Undisclosed Info' },
]

export function RiskPanel({ assessment, draftSelected }: RiskPanelProps) {
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

              {FLAG_LABELS.map(({ key, label }) => {
                const active = assessment.flags[key]
                return (
                  <div
                    key={key}
                    className="flex items-center text-xs"
                    data-testid={`risk-flag-${key}`}
                  >
                    <span
                      className={cn(
                        'flex items-center gap-1',
                        active ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-1.5 w-1.5 rounded-full',
                          active ? 'bg-destructive' : 'bg-muted-foreground/30',
                        )}
                      />
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Threshold guide */}
            <div className="rounded-md border p-2 text-[10px] text-muted-foreground space-y-0.5">
              <p className="font-medium">Thresholds</p>
              <p>0–29: Low (green)</p>
              <p>30–49: Medium (amber)</p>
              <p>50+: High (red)</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
