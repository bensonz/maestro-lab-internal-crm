'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
            <RadioGroup
              value={data.hasBankingHistory}
              onValueChange={(value) => updateField('hasBankingHistory', value)}
              className="flex gap-4"
            >
              {['yes', 'no', 'unknown'].map((v) => (
                <div key={v} className="flex items-center space-x-2">
                  <RadioGroupItem value={v} id={`banking-${v}`} />
                  <Label htmlFor={`banking-${v}`} className="cursor-pointer capitalize">
                    {v}
                  </Label>
                </div>
              ))}
            </RadioGroup>
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
            <RadioGroup
              value={data.hasBeenDebanked}
              onValueChange={(value) => updateField('hasBeenDebanked', value)}
              className="flex gap-4"
            >
              {['yes', 'no'].map((v) => (
                <div key={v} className="flex items-center space-x-2">
                  <RadioGroupItem value={v} id={`debanked-${v}`} />
                  <Label htmlFor={`debanked-${v}`} className="cursor-pointer capitalize">
                    {v}
                  </Label>
                </div>
              ))}
            </RadioGroup>
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
            <RadioGroup
              value={data.bankAccountType}
              onValueChange={(value) => updateField('bankAccountType', value)}
              className="flex gap-4"
            >
              {['checking', 'savings'].map((v) => (
                <div key={v} className="flex items-center space-x-2">
                  <RadioGroupItem value={v} id={`account-type-${v}`} />
                  <Label htmlFor={`account-type-${v}`} className="cursor-pointer capitalize">
                    {v}
                  </Label>
                </div>
              ))}
            </RadioGroup>
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
            <RadioGroup
              value={data.hasPayPal}
              onValueChange={(value) => updateField('hasPayPal', value)}
              className="flex gap-4"
            >
              {['yes', 'no', 'unknown'].map((v) => (
                <div key={v} className="flex items-center space-x-2">
                  <RadioGroupItem value={v} id={`paypal-${v}`} />
                  <Label htmlFor={`paypal-${v}`} className="cursor-pointer capitalize">
                    {v}
                  </Label>
                </div>
              ))}
            </RadioGroup>
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
                <RadioGroup
                  value={data.paypalPreviouslyUsed}
                  onValueChange={(value) =>
                    updateField('paypalPreviouslyUsed', value)
                  }
                  className="flex gap-4"
                >
                  {['yes', 'no'].map((v) => (
                    <div key={v} className="flex items-center space-x-2">
                      <RadioGroupItem value={v} id={`paypal-prev-${v}`} />
                      <Label htmlFor={`paypal-prev-${v}`} className="cursor-pointer capitalize">
                        {v}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">
                  PayPal Verification Status
                </Label>
                <RadioGroup
                  value={data.paypalVerificationStatus}
                  onValueChange={(value) =>
                    updateField('paypalVerificationStatus', value)
                  }
                  className="flex gap-4"
                >
                  {['verified', 'unverified', 'multiple'].map((v) => (
                    <div key={v} className="flex items-center space-x-2">
                      <RadioGroupItem value={v} id={`paypal-verif-${v}`} />
                      <Label htmlFor={`paypal-verif-${v}`} className="cursor-pointer capitalize">
                        {v === 'multiple' ? 'Multiple Accounts' : v}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
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
            <RadioGroup
              value={data.hasBettingHistory}
              onValueChange={(value) =>
                updateField('hasBettingHistory', value)
              }
              className="flex gap-4"
            >
              {['none', 'some', 'extensive'].map((v) => (
                <div key={v} className="flex items-center space-x-2">
                  <RadioGroupItem value={v} id={`betting-${v}`} />
                  <Label htmlFor={`betting-${v}`} className="cursor-pointer capitalize">
                    {v}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {(data.hasBettingHistory === 'some' ||
            data.hasBettingHistory === 'extensive') && (
            <>
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">
                  Which platforms? (Select all that apply)
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {BETTING_PLATFORMS.map((platform) => (
                    <div
                      key={platform}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`platform-${platform}`}
                        checked={data.previousPlatforms.includes(platform)}
                        onCheckedChange={() => togglePlatform(platform)}
                      />
                      <Label
                        htmlFor={`platform-${platform}`}
                        className="cursor-pointer text-sm"
                      >
                        {platform}
                      </Label>
                    </div>
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
            <RadioGroup
              value={data.hasEightPlusRegistrations}
              onValueChange={(value) =>
                updateField('hasEightPlusRegistrations', value)
              }
              className="flex gap-4"
            >
              {['yes', 'no'].map((v) => (
                <div key={v} className="flex items-center space-x-2">
                  <RadioGroupItem value={v} id={`eight-plus-${v}`} />
                  <Label htmlFor={`eight-plus-${v}`} className="cursor-pointer capitalize">
                    {v}
                  </Label>
                </div>
              ))}
            </RadioGroup>
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
            <RadioGroup
              value={data.hasCriminalRecord}
              onValueChange={(value) =>
                updateField('hasCriminalRecord', value)
              }
              className="flex gap-4"
            >
              {['no', 'yes', 'unknown'].map((v) => (
                <div key={v} className="flex items-center space-x-2">
                  <RadioGroupItem value={v} id={`criminal-${v}`} />
                  <Label htmlFor={`criminal-${v}`} className="cursor-pointer capitalize">
                    {v}
                  </Label>
                </div>
              ))}
            </RadioGroup>
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
            <RadioGroup
              value={data.idType}
              onValueChange={(value) => updateField('idType', value)}
              className="grid gap-2 sm:grid-cols-2"
            >
              {[
                { value: 'drivers_license', label: "Driver's License" },
                { value: 'state_id', label: 'State ID' },
                { value: 'passport', label: 'Passport' },
                { value: 'other', label: 'Other' },
              ].map(({ value, label }) => (
                <div key={value} className="flex items-center space-x-2">
                  <RadioGroupItem value={value} id={`id-${value}`} />
                  <Label htmlFor={`id-${value}`} className="cursor-pointer">
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Has address proof been provided?
            </Label>
            <RadioGroup
              value={data.hasAddressProof}
              onValueChange={(value) =>
                updateField('hasAddressProof', value)
              }
              className="flex gap-4"
            >
              {['yes', 'no', 'pending'].map((v) => (
                <div key={v} className="flex items-center space-x-2">
                  <RadioGroupItem value={v} id={`address-proof-${v}`} />
                  <Label htmlFor={`address-proof-${v}`} className="cursor-pointer capitalize">
                    {v}
                  </Label>
                </div>
              ))}
            </RadioGroup>
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
            <RadioGroup
              value={data.riskLevel}
              onValueChange={(value) => updateField('riskLevel', value)}
              className="grid gap-2 sm:grid-cols-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="risk-low" />
                <Label htmlFor="risk-low" className="cursor-pointer text-success">
                  Low Risk
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="risk-medium" />
                <Label htmlFor="risk-medium" className="cursor-pointer text-amber-500">
                  Medium Risk
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="risk-high" />
                <Label htmlFor="risk-high" className="cursor-pointer text-destructive">
                  High Risk
                </Label>
              </div>
            </RadioGroup>
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
            <RadioGroup
              value={data.isReliable}
              onValueChange={(value) => updateField('isReliable', value)}
              className="flex gap-4"
            >
              {['yes', 'no', 'unknown'].map((v) => (
                <div key={v} className="flex items-center space-x-2">
                  <RadioGroupItem value={v} id={`reliable-${v}`} />
                  <Label htmlFor={`reliable-${v}`} className="cursor-pointer capitalize">
                    {v}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Has the client been previously flagged?
            </Label>
            <RadioGroup
              value={data.previouslyFlagged}
              onValueChange={(value) =>
                updateField('previouslyFlagged', value)
              }
              className="flex gap-4"
            >
              {['yes', 'no'].map((v) => (
                <div key={v} className="flex items-center space-x-2">
                  <RadioGroupItem value={v} id={`flagged-${v}`} />
                  <Label htmlFor={`flagged-${v}`} className="cursor-pointer capitalize">
                    {v}
                  </Label>
                </div>
              ))}
            </RadioGroup>
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
            <RadioGroup
              value={data.canReadEnglish}
              onValueChange={(value) =>
                updateField('canReadEnglish', value)
              }
              className="flex gap-4"
            >
              {['yes', 'no', 'limited'].map((v) => (
                <div key={v} className="flex items-center space-x-2">
                  <RadioGroupItem value={v} id={`read-english-${v}`} />
                  <Label htmlFor={`read-english-${v}`} className="cursor-pointer capitalize">
                    {v}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Can the client speak English?
            </Label>
            <RadioGroup
              value={data.canSpeakEnglish}
              onValueChange={(value) =>
                updateField('canSpeakEnglish', value)
              }
              className="flex gap-4"
            >
              {['yes', 'no', 'limited'].map((v) => (
                <div key={v} className="flex items-center space-x-2">
                  <RadioGroupItem value={v} id={`speak-english-${v}`} />
                  <Label htmlFor={`speak-english-${v}`} className="cursor-pointer capitalize">
                    {v}
                  </Label>
                </div>
              ))}
            </RadioGroup>
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
