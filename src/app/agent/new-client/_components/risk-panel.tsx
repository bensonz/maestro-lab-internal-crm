'use client'

import { cn } from '@/lib/utils'
import { Shield, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { RiskAssessment } from '@/types/backend-types'

interface RiskPanelProps {
  assessment: RiskAssessment
  onFlagsChange: (flags: Record<string, boolean>) => void
  draftSelected: boolean
}

const FLAG_LABELS: { key: keyof RiskAssessment['flags']; label: string; weight: string }[] = [
  { key: 'idExpiringSoon', label: 'ID Expiring Soon', weight: '+10' },
  { key: 'paypalPreviouslyUsed', label: 'PayPal Previously Used', weight: '+10' },
  { key: 'addressMismatch', label: 'Address Mismatch', weight: 'info' },
  { key: 'debankedHistory', label: 'De-banked History', weight: '+30' },
  { key: 'criminalRecord', label: 'Criminal Record', weight: '+30' },
  { key: 'undisclosedInfo', label: 'Undisclosed Info', weight: '+20' },
]

export function RiskPanel({ assessment, draftSelected }: RiskPanelProps) {
  const levelColors = {
    low: 'text-green-600 bg-green-50 border-green-200',
    medium: 'text-amber-600 bg-amber-50 border-amber-200',
    high: 'text-red-600 bg-red-50 border-red-200',
  }

  const LevelIcon = {
    low: CheckCircle2,
    medium: AlertTriangle,
    high: XCircle,
  }[assessment.level]

  return (
    <div
      className="hidden w-56 flex-col border-l bg-sidebar lg:flex"
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

              {FLAG_LABELS.map(({ key, label, weight }) => {
                const active = assessment.flags[key]
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between text-xs"
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
                          active ? 'bg-red-500' : 'bg-muted-foreground/30',
                        )}
                      />
                      {label}
                    </span>
                    <Badge
                      variant={active ? 'destructive' : 'secondary'}
                      className="h-4 px-1 text-[9px]"
                    >
                      {weight}
                    </Badge>
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
