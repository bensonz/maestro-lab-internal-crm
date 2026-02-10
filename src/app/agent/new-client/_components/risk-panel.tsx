'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  CheckCircle2,
  Shield,
} from 'lucide-react'
import type { ComplianceData } from './compliance-groups'

interface AgeFlag {
  message: string
  severity: 'high-risk' | 'review'
}

interface ExtractedIdData {
  firstName: string
  middleName?: string
  lastName: string
  dateOfBirth: string
  address?: string
  city?: string
  state?: string
  zip?: string
  idExpiry?: string
}

interface RiskPanelProps {
  extractedData: ExtractedIdData | null
  complianceData: ComplianceData
  ageFlag: AgeFlag | null
  idConfirmed: boolean
  overriddenFields: string[]
  agentConfirms: boolean
  onAgentConfirmChange: (checked: boolean) => void
  phase: number
}

interface ComplianceRule {
  id: string
  label: string
  active: boolean
  detail?: string
}

export function RiskPanel({
  extractedData,
  complianceData,
  ageFlag,
  idConfirmed,
  overriddenFields,
  agentConfirms,
  onAgentConfirmChange,
  phase,
}: RiskPanelProps) {
  const riskLevel = computeRiskLevel(complianceData, ageFlag, extractedData, overriddenFields)
  const rules = computeComplianceRules(complianceData, extractedData)
  const activeRules = rules.filter((r) => r.active)

  const riskColor = {
    low: 'text-success',
    medium: 'text-warning',
    high: 'text-destructive',
  }[riskLevel]

  return (
    <div
      className="flex h-full flex-col border-l border-sidebar-border bg-sidebar"
      data-testid="risk-panel"
    >
      {/* Header */}
      <div className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Risk</h2>
          </div>
          <span className={cn('text-xs font-medium', riskColor)} data-testid="risk-level-badge">
            {riskLevel.toUpperCase()}
          </span>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          {/* Flags */}
          {activeRules.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Flags ({activeRules.length})
              </h3>
              <div className="space-y-1">
                {activeRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-start gap-2 py-1 text-xs"
                    data-testid={`rule-${rule.id}`}
                  >
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                    <div className="min-w-0">
                      <span className="text-foreground">{rule.label}</span>
                      {rule.detail && (
                        <span className="ml-1 text-muted-foreground">
                          — {rule.detail}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeRules.length === 0 && (
            <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 shrink-0" />
              No active flags
            </div>
          )}

          {/* Checks */}
          <div>
            <h3 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Checks
            </h3>
            <div className="space-y-0.5">
              <CheckRow
                label="ID"
                value={idConfirmed ? 'Confirmed' : 'Pending'}
                ok={idConfirmed}
              />
              <CheckRow
                label="Age"
                value={
                  ageFlag
                    ? ageFlag.severity === 'high-risk' ? 'Blocked' : 'Review'
                    : 'OK'
                }
                ok={!ageFlag}
              />
              <CheckRow
                label="English"
                value={
                  complianceData.canReadEnglish === 'no' || complianceData.canSpeakEnglish === 'no'
                    ? 'No'
                    : complianceData.canReadEnglish === 'limited' || complianceData.canSpeakEnglish === 'limited'
                      ? 'Limited'
                      : complianceData.canReadEnglish === 'yes' ? 'Yes' : '\u2014'
                }
                ok={
                  complianceData.canReadEnglish === 'yes' && complianceData.canSpeakEnglish === 'yes'
                }
              />
              <CheckRow
                label="Criminal"
                value={
                  complianceData.hasCriminalRecord === 'yes'
                    ? 'Yes' : complianceData.hasCriminalRecord === 'no' ? 'None' : '\u2014'
                }
                ok={complianceData.hasCriminalRecord === 'no'}
              />
              <CheckRow
                label="Overrides"
                value={overriddenFields.length > 0 ? `${overriddenFields.length}` : 'None'}
                ok={overriddenFields.length === 0}
              />
            </div>
          </div>

          {/* Agent Confirmation */}
          {phase === 2 && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="riskPanelConfirm"
                  checked={agentConfirms}
                  onCheckedChange={(val) =>
                    onAgentConfirmChange(val === true)
                  }
                  data-testid="risk-panel-agent-confirm"
                />
                <Label
                  htmlFor="riskPanelConfirm"
                  className="cursor-pointer text-xs leading-relaxed text-foreground"
                >
                  Client is suitable to proceed
                </Label>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function CheckRow({
  label,
  value,
  ok,
}: {
  label: string
  value: string
  ok: boolean
}) {
  return (
    <div className="flex items-center justify-between py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium', ok ? 'text-success' : 'text-muted-foreground')}>
        {value}
      </span>
    </div>
  )
}

function computeRiskLevel(
  complianceData: ComplianceData,
  ageFlag: AgeFlag | null,
  extractedData: ExtractedIdData | null,
  overriddenFields: string[],
): 'low' | 'medium' | 'high' {
  // HIGH
  if (ageFlag?.severity === 'high-risk') return 'high'
  if (complianceData.hasCriminalRecord === 'yes') return 'high'
  if (complianceData.hasBeenDebanked === 'yes') return 'high'
  if (
    complianceData.paypalPreviouslyUsed === 'yes' &&
    complianceData.paypalVerificationStatus === 'multiple'
  )
    return 'high'

  // MEDIUM
  if (ageFlag) return 'medium'
  if (complianceData.hasCriminalRecord === 'unknown') return 'medium'
  if (extractedData?.idExpiry) {
    const daysUntilExpiry = Math.floor(
      (new Date(extractedData.idExpiry).getTime() - Date.now()) / 86400000,
    )
    if (daysUntilExpiry > 0 && daysUntilExpiry <= 75) return 'medium'
  }
  if (
    complianceData.canReadEnglish === 'limited' ||
    complianceData.canReadEnglish === 'no' ||
    complianceData.canSpeakEnglish === 'limited' ||
    complianceData.canSpeakEnglish === 'no'
  )
    return 'medium'
  if (complianceData.hasBettingHistory === 'extensive') return 'medium'
  if (complianceData.hasEightPlusRegistrations === 'yes') return 'medium'
  if (overriddenFields.length > 0) return 'medium'

  return 'low'
}

function computeComplianceRules(
  complianceData: ComplianceData,
  extractedData: ExtractedIdData | null,
): ComplianceRule[] {
  const idExpiringSoon = (() => {
    if (!extractedData?.idExpiry) return false
    const days = Math.floor(
      (new Date(extractedData.idExpiry).getTime() - Date.now()) / 86400000,
    )
    return days > 0 && days <= 75
  })()

  return [
    {
      id: 'id-expire-soon',
      label: 'ID expires soon',
      active: idExpiringSoon,
      detail: extractedData?.idExpiry
        ? `Exp: ${extractedData.idExpiry}`
        : undefined,
    },
    {
      id: 'paypal-previously-used',
      label: 'PayPal used before',
      active: complianceData.paypalPreviouslyUsed === 'yes',
      detail: complianceData.paypalEmail || undefined,
    },
    {
      id: 'platforms-previously-used',
      label: 'Prior platform history',
      active: complianceData.hasBettingHistory !== 'none' && complianceData.hasBettingHistory !== '',
      detail:
        complianceData.previousPlatforms.length > 0
          ? complianceData.previousPlatforms.join(', ')
          : undefined,
    },
    {
      id: 'debanked',
      label: complianceData.hasBeenDebanked === 'yes' && complianceData.debankedBy
        ? `Debanked by ${complianceData.debankedBy}`
        : 'Debanked',
      active: complianceData.hasBeenDebanked === 'yes',
    },
    {
      id: 'multiple-paypal',
      label: 'Multiple PayPal accounts',
      active: complianceData.paypalVerificationStatus === 'multiple',
    },
    {
      id: 'eight-plus-platforms',
      label: '8+ platforms registered',
      active: complianceData.hasEightPlusRegistrations === 'yes',
    },
  ]
}
