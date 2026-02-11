'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  ChevronDown,
  ShieldCheck,
  CreditCard,
  History,
  FileCheck,
  AlertTriangle,
  Languages,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ComplianceData {
  // Group A: Banking & Financial
  hasBankingHistory: string
  bankName: string
  hasBeenDebanked: string
  debankedBy: string
  ssn: string
  bankAccountType: string

  // Group B: PayPal & Payment History
  hasPayPal: string
  paypalPreviouslyUsed: string
  paypalVerificationStatus: string
  paypalEmail: string

  // Group C: Platform History
  hasBettingHistory: string
  previousPlatforms: string[]
  bettingDetails: string
  hasEightPlusRegistrations: string

  // Group D: Criminal & Legal
  hasCriminalRecord: string
  criminalDetails: string
  idType: string
  hasAddressProof: string
  idNotes: string

  // Group E: Risk Assessment
  riskLevel: string
  authorizationNotes: string
  introducedBy: string
  howMet: string
  profession: string
  isReliable: string
  previouslyFlagged: string

  // Group F: Language & Communication
  canReadEnglish: string
  canSpeakEnglish: string
  languageNotes: string
}

export const EMPTY_COMPLIANCE_DATA: ComplianceData = {
  hasBankingHistory: '',
  bankName: '',
  hasBeenDebanked: '',
  debankedBy: '',
  ssn: '',
  bankAccountType: '',
  hasPayPal: '',
  paypalPreviouslyUsed: '',
  paypalVerificationStatus: '',
  paypalEmail: '',
  hasBettingHistory: '',
  previousPlatforms: [],
  bettingDetails: '',
  hasEightPlusRegistrations: '',
  hasCriminalRecord: '',
  criminalDetails: '',
  idType: '',
  hasAddressProof: '',
  idNotes: '',
  riskLevel: '',
  authorizationNotes: '',
  introducedBy: '',
  howMet: '',
  profession: '',
  isReliable: '',
  previouslyFlagged: '',
  canReadEnglish: '',
  canSpeakEnglish: '',
  languageNotes: '',
}

const BETTING_PLATFORMS = [
  'DraftKings',
  'FanDuel',
  'BetMGM',
  'Caesars',
  'Fanatics',
  'BallyBet',
  'BetRivers',
  'Bet365',
]

/* ─── Reusable pill button group ─── */
function PillGroup({
  field,
  value,
  options,
  onSelect,
  testIdPrefix,
}: {
  field: string
  value: string
  options: { value: string; label: string; selectedClass?: string }[]
  onSelect: (value: string) => void
  testIdPrefix?: string
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={field}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onSelect(opt.value)}
          className={cn(
            'rounded-lg border px-4 py-2 text-sm font-medium transition-all',
            value === opt.value
              ? (opt.selectedClass ?? 'border-primary bg-primary/20 text-primary')
              : 'border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          )}
          data-testid={testIdPrefix ? `${testIdPrefix}-${opt.value}` : undefined}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function yesNoOptions(extras?: string[]) {
  const base = ['yes', 'no', ...(extras ?? [])]
  return base.map((v) => ({
    value: v,
    label: v.charAt(0).toUpperCase() + v.slice(1),
  }))
}

function yesNoUnknownOptions() {
  return yesNoOptions(['unknown'])
}

interface ComplianceGroupsProps {
  onChange: (data: ComplianceData) => void
  defaultValues?: Partial<ComplianceData>
}

export function ComplianceGroups({
  onChange,
  defaultValues = {},
}: ComplianceGroupsProps) {
  const [openGroups, setOpenGroups] = useState<string[]>(['groupA'])
  const [data, setData] = useState<ComplianceData>({
    ...EMPTY_COMPLIANCE_DATA,
    ...defaultValues,
    previousPlatforms: defaultValues.previousPlatforms ?? [],
  })

  const toggleGroup = (group: string) => {
    setOpenGroups((prev) =>
      prev.includes(group)
        ? prev.filter((g) => g !== group)
        : [...prev, group],
    )
  }

  const updateField = (field: keyof ComplianceData, value: string | string[]) => {
    const newData = { ...data, [field]: value }
    setData(newData)
    onChange(newData)
  }

  const togglePlatform = (platform: string) => {
    const current = data.previousPlatforms
    const updated = current.includes(platform)
      ? current.filter((p) => p !== platform)
      : [...current, platform]
    updateField('previousPlatforms', updated)
  }

  return (
    <div className="space-y-3">
      {/* Group A: Banking & Financial */}
      <Collapsible
        open={openGroups.includes('groupA')}
        onOpenChange={() => toggleGroup('groupA')}
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">
                Group A: Banking & Financial
              </p>
              <p className="text-xs text-muted-foreground">
                Banking history, SSN, debanking status
              </p>
            </div>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-muted-foreground transition-transform ${
              openGroups.includes('groupA') ? 'rotate-180' : ''
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-4 rounded-lg border border-border/50 bg-muted/10 p-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Does the client have established banking history?
            </Label>
            <PillGroup
              field="hasBankingHistory"
              value={data.hasBankingHistory}
              options={yesNoUnknownOptions()}
              onSelect={(v) => updateField('hasBankingHistory', v)}
              testIdPrefix="banking"
            />
          </div>

          {data.hasBankingHistory === 'yes' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Bank Name
              </Label>
              <Input
                placeholder="e.g., Chase, Bank of America"
                value={data.bankName}
                onChange={(e) => updateField('bankName', e.target.value)}
                data-testid="bank-name-input"
              />
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Has the client ever been debanked?
            </Label>
            <PillGroup
              field="hasBeenDebanked"
              value={data.hasBeenDebanked}
              options={yesNoOptions()}
              onSelect={(v) => updateField('hasBeenDebanked', v)}
              testIdPrefix="debanked"
            />
          </div>

          {data.hasBeenDebanked === 'yes' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Debanked by which bank?
              </Label>
              <Input
                placeholder="Bank name"
                value={data.debankedBy}
                onChange={(e) => updateField('debankedBy', e.target.value)}
                data-testid="debanked-by-input"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Social Security Number (SSN)
            </Label>
            <Input
              type="password"
              placeholder="XXX-XX-XXXX"
              value={data.ssn}
              onChange={(e) => updateField('ssn', e.target.value)}
              className="max-w-xs font-mono"
              data-testid="ssn-input"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Bank Account Type
            </Label>
            <PillGroup
              field="bankAccountType"
              value={data.bankAccountType}
              options={[
                { value: 'checking', label: 'Checking' },
                { value: 'savings', label: 'Savings' },
              ]}
              onSelect={(v) => updateField('bankAccountType', v)}
              testIdPrefix="account-type"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Group B: PayPal & Payment History */}
      <Collapsible
        open={openGroups.includes('groupB')}
        onOpenChange={() => toggleGroup('groupB')}
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10">
              <CreditCard className="h-4 w-4 text-chart-2" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">
                Group B: PayPal & Payment History
              </p>
              <p className="text-xs text-muted-foreground">
                PayPal account, verification status
              </p>
            </div>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-muted-foreground transition-transform ${
              openGroups.includes('groupB') ? 'rotate-180' : ''
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-4 rounded-lg border border-border/50 bg-muted/10 p-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Does the client have a PayPal account?
            </Label>
            <PillGroup
              field="hasPayPal"
              value={data.hasPayPal}
              options={yesNoUnknownOptions()}
              onSelect={(v) => updateField('hasPayPal', v)}
              testIdPrefix="paypal"
            />
          </div>

          {data.hasPayPal === 'yes' && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  PayPal Email
                </Label>
                <Input
                  type="email"
                  placeholder="paypal@email.com"
                  value={data.paypalEmail}
                  onChange={(e) => updateField('paypalEmail', e.target.value)}
                  data-testid="paypal-email-input"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">
                  Has this PayPal been previously used with our service?
                </Label>
                <PillGroup
                  field="paypalPreviouslyUsed"
                  value={data.paypalPreviouslyUsed}
                  options={yesNoOptions()}
                  onSelect={(v) => updateField('paypalPreviouslyUsed', v)}
                  testIdPrefix="paypal-prev"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">
                  PayPal Verification Status
                </Label>
                <PillGroup
                  field="paypalVerificationStatus"
                  value={data.paypalVerificationStatus}
                  options={[
                    { value: 'verified', label: 'Verified' },
                    { value: 'unverified', label: 'Unverified' },
                    { value: 'multiple', label: 'Multiple Accounts' },
                  ]}
                  onSelect={(v) => updateField('paypalVerificationStatus', v)}
                  testIdPrefix="paypal-verif"
                />
              </div>
            </>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Group C: Platform History */}
      <Collapsible
        open={openGroups.includes('groupC')}
        onOpenChange={() => toggleGroup('groupC')}
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-3/10">
              <History className="h-4 w-4 text-chart-3" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">
                Group C: Platform History
              </p>
              <p className="text-xs text-muted-foreground">
                Previous betting platform usage
              </p>
            </div>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-muted-foreground transition-transform ${
              openGroups.includes('groupC') ? 'rotate-180' : ''
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-4 rounded-lg border border-border/50 bg-muted/10 p-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Has the client previously used any betting platforms?
            </Label>
            <PillGroup
              field="hasBettingHistory"
              value={data.hasBettingHistory}
              options={[
                { value: 'none', label: 'None' },
                { value: 'some', label: 'Some' },
                { value: 'extensive', label: 'Extensive' },
              ]}
              onSelect={(v) => updateField('hasBettingHistory', v)}
              testIdPrefix="betting"
            />
          </div>

          {(data.hasBettingHistory === 'some' ||
            data.hasBettingHistory === 'extensive') && (
            <>
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">
                  Which platforms? (Select all that apply)
                </Label>
                <div className="flex flex-wrap gap-2">
                  {BETTING_PLATFORMS.map((platform) => (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => togglePlatform(platform)}
                      className={cn(
                        'rounded-lg border px-4 py-2 text-sm font-medium transition-all',
                        data.previousPlatforms.includes(platform)
                          ? 'border-primary bg-primary/20 text-primary'
                          : 'border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                      )}
                      data-testid={`platform-${platform}`}
                    >
                      {platform}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Additional details
                </Label>
                <Textarea
                  placeholder="Additional context about platform usage..."
                  value={data.bettingDetails}
                  onChange={(e) =>
                    updateField('bettingDetails', e.target.value)
                  }
                  className="min-h-[80px] rounded-xl border-border/50 bg-input"
                />
              </div>
            </>
          )}

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Has the client registered on 8+ platforms before?
            </Label>
            <PillGroup
              field="hasEightPlusRegistrations"
              value={data.hasEightPlusRegistrations}
              options={yesNoOptions()}
              onSelect={(v) => updateField('hasEightPlusRegistrations', v)}
              testIdPrefix="eight-plus"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Group D: Criminal & Legal */}
      <Collapsible
        open={openGroups.includes('groupD')}
        onOpenChange={() => toggleGroup('groupD')}
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-4/10">
              <FileCheck className="h-4 w-4 text-chart-4" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">
                Group D: Criminal & Legal
              </p>
              <p className="text-xs text-muted-foreground">
                Criminal record, ID documents, address proof
              </p>
            </div>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-muted-foreground transition-transform ${
              openGroups.includes('groupD') ? 'rotate-180' : ''
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-4 rounded-lg border border-border/50 bg-muted/10 p-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Does the client have any criminal record?
            </Label>
            <PillGroup
              field="hasCriminalRecord"
              value={data.hasCriminalRecord}
              options={[
                { value: 'no', label: 'No' },
                { value: 'yes', label: 'Yes' },
                { value: 'unknown', label: 'Unknown' },
              ]}
              onSelect={(v) => updateField('hasCriminalRecord', v)}
              testIdPrefix="criminal"
            />
            {data.hasCriminalRecord === 'yes' && (
              <Textarea
                placeholder="Provide details about the criminal record..."
                value={data.criminalDetails}
                onChange={(e) =>
                  updateField('criminalDetails', e.target.value)
                }
                className="mt-2 min-h-[80px] rounded-xl border-border/50 bg-input"
              />
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Type of ID document provided
            </Label>
            <PillGroup
              field="idType"
              value={data.idType}
              options={[
                { value: 'drivers_license', label: "Driver's License" },
                { value: 'state_id', label: 'State ID' },
                { value: 'passport', label: 'Passport' },
                { value: 'other', label: 'Other' },
              ]}
              onSelect={(v) => updateField('idType', v)}
              testIdPrefix="id-type"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Has address proof been provided?
            </Label>
            <PillGroup
              field="hasAddressProof"
              value={data.hasAddressProof}
              options={yesNoOptions(['pending'])}
              onSelect={(v) => updateField('hasAddressProof', v)}
              testIdPrefix="address-proof"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Additional ID Notes
            </Label>
            <Textarea
              placeholder="Any notes about ID documents..."
              value={data.idNotes}
              onChange={(e) => updateField('idNotes', e.target.value)}
              className="min-h-[80px] rounded-xl border-border/50 bg-input"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Group E: Risk Assessment */}
      <Collapsible
        open={openGroups.includes('groupE')}
        onOpenChange={() => toggleGroup('groupE')}
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
              <AlertTriangle className="h-4 w-4 text-success" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">
                Group E: Risk Assessment
              </p>
              <p className="text-xs text-muted-foreground">
                Risk level, client source, authorization
              </p>
            </div>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-muted-foreground transition-transform ${
              openGroups.includes('groupE') ? 'rotate-180' : ''
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-4 rounded-lg border border-border/50 bg-muted/10 p-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Overall risk level assessment
            </Label>
            <PillGroup
              field="riskLevel"
              value={data.riskLevel}
              options={[
                {
                  value: 'low',
                  label: 'Low Risk',
                  selectedClass: 'border-success bg-success/20 text-success',
                },
                {
                  value: 'medium',
                  label: 'Medium Risk',
                  selectedClass: 'border-warning bg-warning/20 text-warning',
                },
                {
                  value: 'high',
                  label: 'High Risk',
                  selectedClass: 'border-destructive bg-destructive/20 text-destructive',
                },
              ]}
              onSelect={(v) => updateField('riskLevel', v)}
              testIdPrefix="risk"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Authorization Notes
            </Label>
            <Textarea
              placeholder="Notes about risk assessment and authorization..."
              value={data.authorizationNotes}
              onChange={(e) =>
                updateField('authorizationNotes', e.target.value)
              }
              className="min-h-[80px] rounded-xl border-border/50 bg-input"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Introduced by
              </Label>
              <Input
                placeholder="Referrer name"
                value={data.introducedBy}
                onChange={(e) =>
                  updateField('introducedBy', e.target.value)
                }
                data-testid="introduced-by-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                How was client met?
              </Label>
              <Input
                placeholder="e.g., Referral, Event, Online"
                value={data.howMet}
                onChange={(e) => updateField('howMet', e.target.value)}
                data-testid="how-met-input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Profession
            </Label>
            <Input
              placeholder="Occupation"
              value={data.profession}
              onChange={(e) => updateField('profession', e.target.value)}
              data-testid="profession-input"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Is the client reliable / vetted?
            </Label>
            <PillGroup
              field="isReliable"
              value={data.isReliable}
              options={yesNoUnknownOptions()}
              onSelect={(v) => updateField('isReliable', v)}
              testIdPrefix="reliable"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Has the client been previously flagged?
            </Label>
            <PillGroup
              field="previouslyFlagged"
              value={data.previouslyFlagged}
              options={yesNoOptions()}
              onSelect={(v) => updateField('previouslyFlagged', v)}
              testIdPrefix="flagged"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Group F: Language & Communication */}
      <Collapsible
        open={openGroups.includes('groupF')}
        onOpenChange={() => toggleGroup('groupF')}
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-5/10">
              <Languages className="h-4 w-4 text-chart-5" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">
                Group F: Language & Communication
              </p>
              <p className="text-xs text-muted-foreground">
                English proficiency, communication notes
              </p>
            </div>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-muted-foreground transition-transform ${
              openGroups.includes('groupF') ? 'rotate-180' : ''
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-4 rounded-lg border border-border/50 bg-muted/10 p-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Can the client read English?
            </Label>
            <PillGroup
              field="canReadEnglish"
              value={data.canReadEnglish}
              options={yesNoOptions(['limited'])}
              onSelect={(v) => updateField('canReadEnglish', v)}
              testIdPrefix="read-english"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Can the client speak English?
            </Label>
            <PillGroup
              field="canSpeakEnglish"
              value={data.canSpeakEnglish}
              options={yesNoOptions(['limited'])}
              onSelect={(v) => updateField('canSpeakEnglish', v)}
              testIdPrefix="speak-english"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Language Notes
            </Label>
            <Textarea
              placeholder="Any notes about language or communication..."
              value={data.languageNotes}
              onChange={(e) =>
                updateField('languageNotes', e.target.value)
              }
              className="min-h-[80px] rounded-xl border-border/50 bg-input"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
