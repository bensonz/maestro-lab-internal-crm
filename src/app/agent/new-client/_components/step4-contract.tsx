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
  PhoneOff,
  ShieldAlert,
  FileWarning,
  UserX,
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
  getActive: (flags: RiskAssessment['flags']) => boolean
  severity: 'high' | 'medium' | 'info'
}

const RISK_FLAG_DEFS: RiskFlagDef[] = [
  {
    key: 'criminalRecord',
    label: 'Criminal Record',
    getActive: (f) => !!f.criminalRecord,
    severity: 'high',
  },
  {
    key: 'debankedHistory',
    label: 'De-banked History',
    getActive: (f) => !!f.debankedHistory,
    severity: 'high',
  },
  {
    key: 'idExpiryRisk',
    label: 'ID Expiring Soon',
    getActive: (f) => f.idExpiryRisk !== 'none',
    severity: 'medium',
  },
  {
    key: 'paypalPreviouslyUsed',
    label: 'PayPal Previously Used',
    getActive: (f) => !!f.paypalPreviouslyUsed,
    severity: 'medium',
  },
  {
    key: 'missingIdCount',
    label: 'Missing IDs',
    getActive: (f) => (f.missingIdCount ?? 0) > 0,
    severity: 'medium',
  },
  {
    key: 'multipleAddresses',
    label: 'Multiple Addresses',
    getActive: (f) => (f.discoveredAddressCount ?? 0) >= 2,
    severity: 'info',
  },
  {
    key: 'householdAwareness',
    label: 'Household Awareness Concern',
    getActive: (f) => !!f.householdAwareness && f.householdAwareness !== 'supportive' && f.householdAwareness !== 'not_applicable',
    severity: 'info',
  },
  {
    key: 'familyTechSupport',
    label: 'Family Tech Support',
    getActive: (f) => !!f.familyTechSupport && f.familyTechSupport !== 'willing_to_help',
    severity: 'medium',
  },
  {
    key: 'financialAutonomy',
    label: 'Financial Autonomy',
    getActive: (f) => !!f.financialAutonomy && f.financialAutonomy !== 'fully_independent',
    severity: 'medium',
  },
]

/* ─── Integrity assessment questions ─── */
const INTEGRITY_QUESTIONS = [
  {
    key: 'integrityOwnPhone',
    label: 'Did the client try to use their own phone instead of the assigned device?',
    icon: PhoneOff,
  },
  {
    key: 'integrityBypassSteps',
    label: 'Did the client attempt to bypass or alter any registration steps?',
    icon: ShieldAlert,
  },
  {
    key: 'integrityInconsistent',
    label: 'Did the client provide inconsistent or contradictory information?',
    icon: FileWarning,
  },
  {
    key: 'integrityEvasive',
    label: 'Did the client seem reluctant or evasive when asked to provide documents?',
    icon: UserX,
  },
]

export function Step4Contract({ formData, onChange, discoveredAddresses, onAddressUpdate, riskAssessment }: Step4Props) {
  const [addressesConfirmed, setAddressesConfirmed] = useState(false)
  const [riskFlagsReviewed, setRiskFlagsReviewed] = useState(false)
  const [reviewedWithBackoffice, setReviewedWithBackoffice] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  // Integrity question local state (syncs to formData.clientHidingInfo)
  const [integrityFlags, setIntegrityFlags] = useState<Record<string, boolean>>({})

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

  const hasConfidence = !!(formData.agentConfidenceLevel as string)
  const addressCount = discoveredAddresses.length

  // Risk assessment data
  const activeFlags = RISK_FLAG_DEFS.filter((def) => def.getActive(riskAssessment.flags))
  const needsBackofficeReview = activeFlags.length > 3
  const levelConfig = {
    low: { color: 'text-success', bg: 'bg-success/10 border-success/30', icon: CheckCircle2, label: 'Low Risk' },
    medium: { color: 'text-warning', bg: 'bg-warning/10 border-warning/30', icon: AlertTriangle, label: 'Medium Risk' },
    high: { color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30', icon: AlertTriangle, label: 'High Risk' },
  }
  const levelCfg = levelConfig[riskAssessment.level]
  const LevelIcon = levelCfg.icon

  const allReady =
    (addressCount === 0 || addressesConfirmed)
    && riskFlagsReviewed
    && hasConfidence
    && (!needsBackofficeReview || reviewedWithBackoffice)

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

  const handleIntegrityChange = (key: string, checked: boolean) => {
    const updated = { ...integrityFlags, [key]: checked }
    setIntegrityFlags(updated)
    const anyFlagged = Object.values(updated).some(Boolean)
    onChange('clientHidingInfo', anyFlagged)
    if (!anyFlagged) onChange('clientHidingInfoNotes', '')
  }

  const anyIntegrityFlagged = Object.values(integrityFlags).some(Boolean)

  return (
    <div className="space-y-4" data-testid="step4-contract">

      {/* ═══ Tab 1: Contract Document ═══ */}
      <SectionCard title="Contract Document">
        {!!(formData.contractDocument as string) ? (
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

      {/* ═══ Tab 2: Submission Checklist ═══ */}
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

            {/* Risk level badge — compact, no score */}
            <div className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium', levelCfg.bg, levelCfg.color)}>
              <LevelIcon className="h-3.5 w-3.5" />
              {levelCfg.label}
            </div>

            {/* Active risk flags — horizontal inline badges */}
            {activeFlags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {activeFlags.map((def) => (
                  <div
                    key={def.key}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium',
                      def.severity === 'high'
                        ? 'border-destructive/30 bg-destructive/10 text-destructive'
                        : def.severity === 'medium'
                          ? 'border-warning/30 bg-warning/10 text-warning'
                          : 'border-border bg-muted/50 text-muted-foreground',
                    )}
                    data-testid={`risk-flag-${def.key}`}
                  >
                    <span className={cn(
                      'h-1.5 w-1.5 shrink-0 rounded-full',
                      def.severity === 'high' ? 'bg-destructive' : def.severity === 'medium' ? 'bg-warning' : 'bg-muted-foreground',
                    )} />
                    {def.label}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                No active risk flags
              </div>
            )}

            {/* Backoffice review checkbox (when >3 flags) */}
            {needsBackofficeReview && (
              <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
                <Checkbox
                  id="reviewedWithBackoffice"
                  checked={reviewedWithBackoffice}
                  onCheckedChange={(checked) => setReviewedWithBackoffice(!!checked)}
                  data-testid="reviewed-with-backoffice-checkbox"
                />
                <label htmlFor="reviewedWithBackoffice" className="text-xs font-medium text-warning">
                  Please review this with back office over phone
                </label>
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

            {/* Confidence Level — moved here from Agent Assessment */}
            <div className="space-y-2 pt-1">
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
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-border" />

          {/* ── Section C: Client Integrity Assessment ── */}
          <div className="space-y-4" data-testid="client-integrity-assessment">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Client Integrity Assessment
            </p>

            <div className="space-y-2.5">
              {INTEGRITY_QUESTIONS.map((q) => {
                const Icon = q.icon
                return (
                  <div
                    key={q.key}
                    className={cn(
                      'flex items-start gap-2.5 rounded-md border p-2.5 transition-colors',
                      integrityFlags[q.key]
                        ? 'border-destructive/30 bg-destructive/5'
                        : 'border-border',
                    )}
                  >
                    <Checkbox
                      id={q.key}
                      checked={integrityFlags[q.key] || false}
                      onCheckedChange={(checked) => handleIntegrityChange(q.key, !!checked)}
                      className="mt-0.5"
                      data-testid={`integrity-${q.key}`}
                    />
                    <Icon className={cn(
                      'mt-0.5 h-3.5 w-3.5 shrink-0',
                      integrityFlags[q.key] ? 'text-destructive' : 'text-muted-foreground',
                    )} />
                    <label htmlFor={q.key} className="cursor-pointer text-xs leading-relaxed">
                      {q.label}
                    </label>
                  </div>
                )
              })}
            </div>

            {/* Notes textarea — shown when any integrity question is flagged */}
            {anyIntegrityFlagged && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-destructive">
                  Describe what happened
                </label>
                <Textarea
                  value={(formData.clientHidingInfoNotes as string) || ''}
                  onChange={(e) => onChange('clientHidingInfoNotes', e.target.value)}
                  placeholder="Provide details about the flagged behavior(s) — what did you observe, when did it happen, and how did the client respond when confronted?"
                  className="min-h-[80px] border-destructive/30"
                  data-testid="client-hiding-info-notes"
                />
              </div>
            )}
          </div>

          {/* ── Ready banner ── */}
          {allReady && (
            <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              All required items are complete. Ready to submit.
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}
