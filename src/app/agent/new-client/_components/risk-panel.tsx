'use client'

import { cn } from '@/lib/utils'
import { Shield, AlertTriangle, CheckCircle2, XCircle, KeyRound, MapPin, Trophy } from 'lucide-react'
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

const CREDENTIAL_DISPLAY_NAMES: Record<string, string> = {
  GMAIL: 'Gmail',
  BETMGM: 'BetMGM',
  PAYPAL: 'PayPal',
  BANK: 'Online Banking',
  EDGEBOOST: 'EdgeBoost',
  DRAFTKINGS: 'DraftKings',
  FANDUEL: 'FanDuel',
  CAESARS: 'Caesars',
  FANATICS: 'Fanatics',
  BALLYBET: 'Bally Bet',
  BETRIVERS: 'BetRivers',
  BET365: 'Bet365',
}

type FlagEntry = {
  key: keyof RiskAssessment['flags']
  label: string
  type: 'boolean' | 'idExpiry' | 'missingId' | 'assessment' | 'addressCount'
  labels?: Record<string, string>
}

const FLAG_ENTRIES: FlagEntry[] = [
  { key: 'missingIdCount', label: 'Missing IDs', type: 'missingId' },
  { key: 'idExpiryRisk', label: 'ID Expiring Soon', type: 'idExpiry' },
  { key: 'discoveredAddressCount', label: 'Addresses', type: 'addressCount' },
  { key: 'multipleAddresses', label: 'Multiple Addresses', type: 'boolean' },
  { key: 'paypalPreviouslyUsed', label: 'PayPal Previously Used', type: 'boolean' },
  { key: 'debankedHistory', label: 'De-banked History', type: 'boolean' },
  { key: 'criminalRecord', label: 'Criminal Record', type: 'boolean' },
  { key: 'householdAwareness', label: 'Household Awareness', type: 'assessment', labels: HOUSEHOLD_LABELS },
  { key: 'familyTechSupport', label: 'Family Support', type: 'assessment', labels: FAMILY_SUPPORT_LABELS },
  { key: 'financialAutonomy', label: 'Financial Autonomy', type: 'assessment', labels: AUTONOMY_LABELS },
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
              <p className="text-sm font-semibold capitalize">
                {assessment.level} Risk
              </p>
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

                if (entry.type === 'addressCount') {
                  const count = (value as number) || 0
                  if (count === 0) return null // Don't show when no addresses detected
                  const addrColor = count <= 1 ? 'text-success' : count === 2 ? 'text-warning' : 'text-destructive'
                  const dotColor = count <= 1 ? 'bg-success' : count === 2 ? 'bg-warning' : 'bg-destructive'
                  return (
                    <div
                      key={entry.key}
                      className="flex items-center text-xs"
                      data-testid={`risk-flag-${entry.key}`}
                    >
                      <span className={cn('flex items-center gap-1', addrColor)}>
                        <span className={cn('inline-block h-1.5 w-1.5 rounded-full', dotColor)} />
                        <MapPin className="h-3 w-3" />
                        {count} {count === 1 ? 'Address' : 'Addresses'}
                      </span>
                    </div>
                  )
                }

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
                    className="flex items-center text-xs"
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
                  </div>
                )
              })}
            </div>

            {/* Credentials section */}
            <div className="space-y-2" data-testid="credentials-section">
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <KeyRound className="h-3 w-3" />
                Credentials
              </p>
              {(() => {
                const entries = Object.entries(assessment.flags.credentialMismatches)
                if (entries.length === 0) {
                  return (
                    <p className="text-[10px] text-muted-foreground/60">
                      No platforms checked yet
                    </p>
                  )
                }
                const totalPlatforms = entries.length
                const matchCount = entries.filter(([, m]) => !m.username && !m.password).length
                const accuracyPct = Math.round((matchCount / totalPlatforms) * 100)
                const isPerfect = accuracyPct === 100

                return (
                  <>
                    {entries.map(([platform, m]) => {
                      const name = CREDENTIAL_DISPLAY_NAMES[platform] || CREDENTIAL_DISPLAY_NAMES[platform.toUpperCase()] || platform.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\B\w+/g, (w) => w.toLowerCase())
                      const hasMismatch = m.username || m.password
                      const detail = hasMismatch
                        ? [m.username && 'email', m.password && 'password'].filter(Boolean).join(', ')
                        : null
                      return (
                        <div
                          key={platform}
                          className="flex items-center justify-between text-xs"
                          data-testid={`credential-${platform}`}
                        >
                          <span className={cn('flex items-center gap-1', hasMismatch ? 'text-foreground' : 'text-success')}>
                            <span className={cn('inline-block h-1.5 w-1.5 rounded-full', hasMismatch ? 'bg-destructive' : 'bg-success')} />
                            {name}
                          </span>
                          {hasMismatch ? (
                            <span className="text-destructive/70 text-[10px]">{detail}</span>
                          ) : (
                            <span className="text-success/70 text-[10px]">match</span>
                          )}
                        </div>
                      )
                    })}

                    {/* Accuracy score */}
                    <div
                      className={cn(
                        'mt-1 rounded-md border p-2.5 text-center',
                        isPerfect
                          ? 'border-success/30 bg-success/5'
                          : 'border-border bg-muted/30',
                      )}
                      data-testid="credential-accuracy"
                    >
                      <p className={cn(
                        'font-mono text-lg font-bold',
                        isPerfect ? 'text-success' : accuracyPct >= 80 ? 'text-warning' : 'text-destructive',
                      )}>
                        {accuracyPct}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {matchCount}/{totalPlatforms} credentials accurate
                      </p>
                      <div className={cn(
                        'mt-1.5 flex items-center justify-center gap-1 text-[10px] font-medium',
                        isPerfect ? 'text-success' : 'text-muted-foreground',
                      )}>
                        <Trophy className="h-3 w-3" />
                        {isPerfect
                          ? 'Perfect accuracy! This boosts your bonus and team performance.'
                          : 'Credential accuracy boosts your bonus and team performance.'}
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>

          </>
        )}
      </div>
    </div>
  )
}
