'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface AgeFlag {
  message: string
  severity: 'high-risk' | 'review'
}

interface ComplianceData {
  hasCriminalRecord: string
  hasBankingHistory: string
  criminalDetails?: string
  idType: string
  hasAddressProof: string
  idNotes?: string
  hasPayPal: string
  hasBettingHistory: string
  bettingDetails?: string
  riskLevel: string
  authorizationNotes?: string
}

interface ClientSourceData {
  introducedBy: string
  howMet: string
  profession: string
  isReliable: string
  previouslyFlagged: string
  additionalNotes: string
}

interface DecisionPanelProps {
  open: boolean
  onClose: () => void
  idConfirmed: boolean
  ageFlag: AgeFlag | null
  overriddenFields: string[]
  complianceData: ComplianceData
  clientSourceData: ClientSourceData
  agentConfirms: boolean
  onClientSourceChange: (field: keyof ClientSourceData, value: string) => void
  onAgentConfirmChange: (checked: boolean) => void
}

export function DecisionPanel({
  open,
  onClose,
  idConfirmed,
  ageFlag,
  overriddenFields,
  complianceData,
  clientSourceData,
  agentConfirms,
  onClientSourceChange,
  onAgentConfirmChange,
}: DecisionPanelProps) {
  if (!open) return null

  const summaryRows = [
    {
      label: 'ID Verification',
      value: idConfirmed ? 'Confirmed' : 'Pending',
      status: idConfirmed ? 'success' : 'warning',
    },
    {
      label: 'Age Compliance',
      value: ageFlag
        ? ageFlag.severity === 'high-risk'
          ? 'HIGH RISK'
          : 'REVIEW FLAG'
        : 'Passed',
      status: ageFlag
        ? ageFlag.severity === 'high-risk'
          ? 'error'
          : 'warning'
        : 'success',
    },
    {
      label: 'Manual Overrides',
      value:
        overriddenFields.length > 0
          ? `${overriddenFields.length} field(s)`
          : 'None',
      status: overriddenFields.length > 0 ? 'warning' : 'success',
    },
    {
      label: 'Criminal Record',
      value:
        complianceData.hasCriminalRecord === 'yes'
          ? 'Disclosed'
          : complianceData.hasCriminalRecord === 'no'
            ? 'None'
            : complianceData.hasCriminalRecord === 'prefer-not'
              ? 'Not disclosed'
              : '\u2014',
      status:
        complianceData.hasCriminalRecord === 'yes'
          ? 'error'
          : complianceData.hasCriminalRecord === 'no'
            ? 'success'
            : complianceData.hasCriminalRecord === 'prefer-not'
              ? 'warning'
              : 'neutral',
    },
    {
      label: 'Previously Flagged',
      value:
        clientSourceData.previouslyFlagged === 'yes'
          ? 'Yes'
          : clientSourceData.previouslyFlagged === 'no'
            ? 'No'
            : clientSourceData.previouslyFlagged || '\u2014',
      status:
        clientSourceData.previouslyFlagged === 'yes'
          ? 'error'
          : clientSourceData.previouslyFlagged === 'no'
            ? 'success'
            : 'neutral',
    },
  ] as const

  return (
    <div
      className="absolute inset-y-0 right-0 w-[380px] border-l border-border bg-card z-30 shadow-xl animate-fade-in"
      data-testid="decision-panel"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold text-foreground">
          Decision Panel
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
          data-testid="decision-panel-close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-[calc(100%-52px)]">
        <div className="space-y-6 p-5">
          {/* Compliance Summary */}
          <div>
            <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Compliance Summary
            </h3>
            <div className="space-y-1.5">
              {summaryRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between border-b border-border/50 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{row.label}</span>
                  <span
                    className={cn(
                      'text-xs font-medium',
                      row.status === 'success' && 'text-success',
                      row.status === 'warning' && 'text-warning',
                      row.status === 'error' && 'text-destructive',
                      row.status === 'neutral' && 'text-muted-foreground',
                    )}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Client Source & Trust */}
          <div>
            <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              How do we know this client?
            </h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">
                  Introduced by
                </Label>
                <Input
                  placeholder="Referrer name"
                  value={clientSourceData.introducedBy}
                  onChange={(e) =>
                    onClientSourceChange('introducedBy', e.target.value)
                  }
                  className="mt-1 h-8 text-sm"
                  data-testid="decision-introduced-by"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  How was client met?
                </Label>
                <Input
                  placeholder="e.g., Referral, Event, Online"
                  value={clientSourceData.howMet}
                  onChange={(e) =>
                    onClientSourceChange('howMet', e.target.value)
                  }
                  className="mt-1 h-8 text-sm"
                  data-testid="decision-how-met"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Profession
                </Label>
                <Input
                  placeholder="Occupation"
                  value={clientSourceData.profession}
                  onChange={(e) =>
                    onClientSourceChange('profession', e.target.value)
                  }
                  className="mt-1 h-8 text-sm"
                  data-testid="decision-profession"
                />
              </div>
              <div className="flex items-center justify-between py-2 text-sm">
                <span className="text-muted-foreground">
                  Reliable / Vetted
                </span>
                <span
                  className={cn(
                    'text-xs',
                    clientSourceData.isReliable === 'yes'
                      ? 'text-success'
                      : clientSourceData.isReliable === 'no'
                        ? 'text-destructive'
                        : 'text-muted-foreground',
                  )}
                >
                  {clientSourceData.isReliable === 'yes'
                    ? 'Yes'
                    : clientSourceData.isReliable === 'no'
                      ? 'No'
                      : clientSourceData.isReliable === 'unknown'
                        ? 'Unknown'
                        : '\u2014'}
                </span>
              </div>
            </div>
          </div>

          {/* Risk Flags */}
          <div>
            <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Risk Flags
            </h3>
            <div className="space-y-2">
              {ageFlag && (
                <Badge
                  variant="outline"
                  className={cn(
                    'w-full justify-start py-1.5 text-[10px]',
                    ageFlag.severity === 'high-risk'
                      ? 'border-destructive/30 bg-destructive/10 text-destructive'
                      : 'border-warning/30 bg-warning/10 text-warning',
                  )}
                >
                  {ageFlag.message}
                </Badge>
              )}
              {complianceData.hasCriminalRecord === 'yes' && (
                <Badge
                  variant="outline"
                  className="w-full justify-start border-destructive/30 bg-destructive/10 py-1.5 text-[10px] text-destructive"
                >
                  Criminal record disclosed
                </Badge>
              )}
              {complianceData.hasPayPal === 'yes' && (
                <Badge
                  variant="outline"
                  className="w-full justify-start border-warning/30 bg-warning/10 py-1.5 text-[10px] text-warning"
                >
                  PayPal linked — verify SSN status
                </Badge>
              )}
              {overriddenFields.length > 0 && (
                <Badge
                  variant="outline"
                  className="w-full justify-start border-warning/30 bg-warning/10 py-1.5 text-[10px] text-warning"
                >
                  {overriddenFields.length} field(s) manually overridden
                </Badge>
              )}
              {!ageFlag &&
                complianceData.hasCriminalRecord !== 'yes' &&
                overriddenFields.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No risk flags detected.
                  </p>
                )}
            </div>
          </div>

          {/* Agent Confirmation */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="decisionPanelConfirm"
                checked={agentConfirms}
                onCheckedChange={(val) => onAgentConfirmChange(val === true)}
                data-testid="decision-agent-confirm"
              />
              <Label
                htmlFor="decisionPanelConfirm"
                className="cursor-pointer text-xs leading-relaxed text-foreground"
              >
                I confirm this client is suitable to proceed to application
                email issuance.
              </Label>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
