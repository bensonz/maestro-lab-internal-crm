'use client'

import { useCallback, useState } from 'react'
import { UploadDropzone, ScreenshotThumbnail } from '@/components/upload-dropzone'
import {
  FileText,
  CheckCircle2,
  XCircle,
  ChevronDown,
  MapPin,
  Pencil,
  AlertTriangle,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { DiscoveredAddress, RiskAssessment } from '@/types/backend-types'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface Step4Props {
  formData: Record<string, unknown>
  onChange: (field: string, value: unknown) => void
  discoveredAddresses: DiscoveredAddress[]
  onAddressUpdate: (addresses: DiscoveredAddress[]) => void
  riskAssessment: RiskAssessment
}

function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Collapsible>
      <div className="card-terminal w-full overflow-hidden !p-0" data-testid={`section-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <CollapsibleTrigger className="flex w-full items-center justify-between border-b border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-card-hover group" data-testid="section-trigger">
          <span>{title}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 p-4">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

/* ─── Risk flag display definitions ─── */
interface RiskFlagDef {
  key: string
  label: string
  description: string
  getActive: (flags: RiskAssessment['flags']) => boolean
  getImpact: (flags: RiskAssessment['flags']) => string
  severity: 'high' | 'medium' | 'info'
}

const RISK_FLAG_DEFS: RiskFlagDef[] = [
  {
    key: 'criminalRecord',
    label: 'Criminal Record',
    description: 'Client has disclosed a criminal record',
    getActive: (f) => !!f.criminalRecord,
    getImpact: () => '-30 pts',
    severity: 'high',
  },
  {
    key: 'debankedHistory',
    label: 'De-banked History',
    description: 'Client was previously de-banked by a financial institution',
    getActive: (f) => !!f.debankedHistory,
    getImpact: () => '-30 pts',
    severity: 'high',
  },
  {
    key: 'idExpiryRisk',
    label: 'ID Expiring Soon',
    description: 'Client ID document is expiring within 100 days',
    getActive: (f) => f.idExpiryRisk !== 'none',
    getImpact: (f) => f.idExpiryRisk === 'high' ? '-20 pts (< 75 days)' : '-10 pts (75-99 days)',
    severity: 'medium',
  },
  {
    key: 'paypalPreviouslyUsed',
    label: 'PayPal Previously Used',
    description: 'Client has an existing PayPal account with prior usage',
    getActive: (f) => !!f.paypalPreviouslyUsed,
    getImpact: () => '-10 pts',
    severity: 'medium',
  },
  {
    key: 'missingIdCount',
    label: 'Missing IDs',
    description: 'Client is missing one or more required identification documents',
    getActive: (f) => (f.missingIdCount ?? 0) > 0,
    getImpact: (f) => {
      const count = f.missingIdCount ?? 0
      return count > 0 ? `-${count * 10} pts (${count} missing)` : '0 pts'
    },
    severity: 'medium',
  },
  {
    key: 'multipleAddresses',
    label: 'Multiple Addresses',
    description: 'Different addresses detected across platform registrations',
    getActive: (f) => (f.discoveredAddressCount ?? 0) >= 2,
    getImpact: (f) => `${f.discoveredAddressCount ?? 0} addresses found`,
    severity: 'info',
  },
  {
    key: 'householdAwareness',
    label: 'Household Awareness Concern',
    description: 'Household members may not be aware of or supportive of the client\'s activity',
    getActive: (f) => !!f.householdAwareness && f.householdAwareness !== 'supportive' && f.householdAwareness !== 'not_applicable',
    getImpact: () => 'up to -8 pts',
    severity: 'info',
  },
  {
    key: 'familyTechSupport',
    label: 'Family Tech Support',
    description: 'Client lacks family or household support for tech/device usage',
    getActive: (f) => !!f.familyTechSupport && f.familyTechSupport !== 'willing_to_help',
    getImpact: () => 'up to -15 pts',
    severity: 'medium',
  },
  {
    key: 'financialAutonomy',
    label: 'Financial Autonomy',
    description: 'Client does not have full financial independence or decision-making authority',
    getActive: (f) => !!f.financialAutonomy && f.financialAutonomy !== 'fully_independent',
    getImpact: () => 'up to -15 pts',
    severity: 'medium',
  },
]

export function Step4Contract({ formData, onChange, discoveredAddresses, onAddressUpdate, riskAssessment }: Step4Props) {
  const [addressesConfirmed, setAddressesConfirmed] = useState(false)
  const [riskFlagsReviewed, setRiskFlagsReviewed] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const handleContractUpload = useCallback(
    async (file: File) => {
      const body = new FormData()
      body.append('file', file)
      try {
        const res = await fetch('/api/upload/public', { method: 'POST', body })
        const data = await res.json()
        if (!res.ok) return { success: false, error: data.error ?? 'Upload failed' }
        onChange('contractDocument', data.url)
        return { success: true }
      } catch {
        return { success: false, error: 'Upload failed' }
      }
    },
    [onChange],
  )

  const hasContract = !!(formData.contractDocument as string)
  const hasFirstName = !!(formData.firstName as string)
  const hasLastName = !!(formData.lastName as string)
  const hasConfidence = !!(formData.agentConfidenceLevel as string)
  const addressCount = discoveredAddresses.length
  const allReady = hasContract && hasFirstName && hasLastName
    && (addressCount === 0 || addressesConfirmed)
    && hasConfidence
    && riskFlagsReviewed

  const addressCountColor = addressCount <= 1
    ? 'text-success border-success/30 bg-success/10'
    : addressCount === 2
      ? 'text-warning border-warning/30 bg-warning/10'
      : 'text-destructive border-destructive/30 bg-destructive/10'

  const handleAddressEdit = (index: number, newAddress: string) => {
    const updated = [...discoveredAddresses]
    updated[index] = { ...updated[index], address: newAddress }
    onAddressUpdate(updated)
    setEditingIndex(null)
    setEditValue('')
  }

  // Risk assessment data
  const activeFlags = RISK_FLAG_DEFS.filter((def) => def.getActive(riskAssessment.flags))
  const levelConfig = {
    low: { color: 'text-success', bg: 'bg-success/10 border-success/30', icon: CheckCircle2, label: 'Low Risk' },
    medium: { color: 'text-warning', bg: 'bg-warning/10 border-warning/30', icon: AlertTriangle, label: 'Medium Risk' },
    high: { color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30', icon: AlertTriangle, label: 'High Risk' },
  }
  const levelCfg = levelConfig[riskAssessment.level]
  const LevelIcon = levelCfg.icon

  return (
    <div className="space-y-4" data-testid="step4-contract">

      {/* ═══ Tab 1: Contract Document ═══ */}
      <SectionCard title="Contract Document">
        {hasContract ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <ScreenshotThumbnail
                src={formData.contractDocument as string}
                onDelete={() => onChange('contractDocument', '')}
              />
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                Contract uploaded
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Upload the signed contract document
              </p>
            </div>
            <UploadDropzone
              onUpload={handleContractUpload}
              accept="image/jpeg,image/png,image/webp,application/pdf"
              data-testid="contract-upload-dropzone"
            />
          </div>
        )}
      </SectionCard>

      {/* ═══ Tab 2: Submission Checklist (includes address summary, risk flags, agent questions, checklist) ═══ */}
      <SectionCard title="Submission Checklist">
        <div className="space-y-6" data-testid="submission-checklist">

          {/* ── Section A: Address Summary ── */}
          {addressCount > 0 && (
            <div className="space-y-3" data-testid="address-summary">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Address Summary
              </p>
              {/* Count badge */}
              <div className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium', addressCountColor)}>
                <MapPin className="h-3 w-3" />
                {addressCount} {addressCount === 1 ? 'Address' : 'Addresses'} Discovered
              </div>

              {/* Address list */}
              <div className="space-y-2">
                {discoveredAddresses.map((addr, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-md border border-border p-2.5 text-xs"
                    data-testid={`discovered-address-${i}`}
                  >
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          From {addr.source}
                        </span>
                        {addr.confirmedByAgent && (
                          <span className="text-[10px] text-success">Confirmed</span>
                        )}
                      </div>
                      {editingIndex === i ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-6 text-xs"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddressEdit(i, editValue)
                              if (e.key === 'Escape') { setEditingIndex(null); setEditValue('') }
                            }}
                            data-testid={`address-edit-input-${i}`}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddressEdit(i, editValue)}
                            className="text-success hover:text-success/80 transition-colors"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium">{addr.address}</p>
                          <button
                            type="button"
                            onClick={() => { setEditingIndex(i); setEditValue(addr.address) }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            data-testid={`address-edit-btn-${i}`}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Confirmation checkbox */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="addressesConfirmed"
                  checked={addressesConfirmed}
                  onCheckedChange={(checked) => setAddressesConfirmed(!!checked)}
                  data-testid="addresses-confirmed-checkbox"
                />
                <label htmlFor="addressesConfirmed" className="text-xs">
                  I confirm all addresses are correct
                </label>
              </div>
            </div>
          )}

          {/* ── Divider ── */}
          {addressCount > 0 && <div className="border-t border-border" />}

          {/* ── Section B: Risk Assessment Flags ── */}
          <div className="space-y-3" data-testid="risk-assessment-summary">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Risk Assessment Flags
            </p>

            {/* Risk level badge */}
            <div className={cn('inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium', levelCfg.bg, levelCfg.color)}>
              <LevelIcon className="h-4 w-4" />
              {levelCfg.label}
              <span className="font-mono text-xs opacity-70">Score: {riskAssessment.score}</span>
            </div>

            {/* Active risk flags with specific descriptions */}
            {activeFlags.length > 0 ? (
              <div className="space-y-1.5">
                {activeFlags.map((def) => (
                  <div
                    key={def.key}
                    className="flex items-start gap-2 rounded-md border border-border p-2.5 text-xs"
                    data-testid={`risk-flag-${def.key}`}
                  >
                    <span className={cn(
                      'mt-0.5 h-2 w-2 shrink-0 rounded-full',
                      def.severity === 'high' ? 'bg-destructive' : def.severity === 'medium' ? 'bg-warning' : 'bg-muted-foreground',
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{def.label}</span>
                        <span className={cn(
                          'ml-auto shrink-0 font-mono text-[10px]',
                          def.severity === 'high' ? 'text-destructive' : def.severity === 'medium' ? 'text-warning' : 'text-muted-foreground',
                        )}>
                          {def.getImpact(riskAssessment.flags)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-muted-foreground">{def.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                No active risk flags
              </div>
            )}

            {/* Review checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="riskFlagsReviewed"
                checked={riskFlagsReviewed}
                onCheckedChange={(checked) => setRiskFlagsReviewed(!!checked)}
                data-testid="risk-flags-reviewed-checkbox"
              />
              <label htmlFor="riskFlagsReviewed" className="text-xs">
                I have reviewed all risk flags
              </label>
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-border" />

          {/* ── Section C: Agent Assessment Questions ── */}
          <div className="space-y-4" data-testid="agent-assessment">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Agent Assessment
            </p>

            {/* Confidence Level */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                How confident are you about this client?
              </label>
              <Select
                value={(formData.agentConfidenceLevel as string) || ''}
                onValueChange={(value) => onChange('agentConfidenceLevel', value)}
              >
                <SelectTrigger className="w-48" data-testid="agent-confidence-select">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Hiding Info */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Did the client try to hide information during the application process?
              </label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="clientHidingInfo"
                  checked={formData.clientHidingInfo === true}
                  onCheckedChange={(checked) => {
                    onChange('clientHidingInfo', !!checked)
                    if (!checked) onChange('clientHidingInfoNotes', '')
                  }}
                  data-testid="client-hiding-info-checkbox"
                />
                <label htmlFor="clientHidingInfo" className="text-sm cursor-pointer">
                  Yes
                </label>
              </div>
              {formData.clientHidingInfo === true && (
                <Textarea
                  value={(formData.clientHidingInfoNotes as string) || ''}
                  onChange={(e) => onChange('clientHidingInfoNotes', e.target.value)}
                  placeholder="e.g., while at the bank, did they try to use their own phone instead of the assigned device?"
                  className="min-h-[80px]"
                  data-testid="client-hiding-info-notes"
                />
              )}
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-border" />

          {/* ── Section D: Final Checklist ── */}
          <div className="space-y-3">
            {allReady && (
              <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                All required items are complete. Ready to submit.
              </div>
            )}

            <ul className="space-y-2 text-sm">
              <ChecklistItem checked={hasFirstName} label="First name provided" />
              <ChecklistItem checked={hasLastName} label="Last name provided" />
              <ChecklistItem checked={hasContract} label="Contract document uploaded" />
              {addressCount > 0 && (
                <ChecklistItem
                  checked={addressesConfirmed}
                  label={`All addresses confirmed (${addressCount} unique ${addressCount === 1 ? 'address' : 'addresses'})`}
                />
              )}
              <ChecklistItem checked={riskFlagsReviewed} label="Risk assessment reviewed" />
              <ChecklistItem checked={hasConfidence} label="Agent confidence level selected" />
            </ul>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function ChecklistItem({ checked, label }: { checked: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {checked ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
      ) : (
        <XCircle className="h-4 w-4 shrink-0 text-destructive/60" />
      )}
      <span className={checked ? 'text-foreground' : 'text-muted-foreground'}>
        {label}
      </span>
    </li>
  )
}
