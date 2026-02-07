'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  ChevronDown,
  ShieldCheck,
  FileCheck,
  History,
  AlertTriangle,
} from 'lucide-react'

interface ComplianceData {
  // Group A: Quick Assessment
  hasCriminalRecord: string
  hasBankingHistory: string
  criminalDetails?: string

  // Group B: Identity & Documents
  idType: string
  hasAddressProof: string
  idNotes?: string

  // Group C: Behavior History
  hasPayPal: string
  hasBettingHistory: string
  bettingDetails?: string

  // Group D: Authorization & Risk
  riskLevel: string
  authorizationNotes?: string
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
    hasCriminalRecord: defaultValues.hasCriminalRecord ?? '',
    hasBankingHistory: defaultValues.hasBankingHistory ?? '',
    criminalDetails: defaultValues.criminalDetails ?? '',
    idType: defaultValues.idType ?? '',
    hasAddressProof: defaultValues.hasAddressProof ?? '',
    idNotes: defaultValues.idNotes ?? '',
    hasPayPal: defaultValues.hasPayPal ?? '',
    hasBettingHistory: defaultValues.hasBettingHistory ?? '',
    bettingDetails: defaultValues.bettingDetails ?? '',
    riskLevel: defaultValues.riskLevel ?? '',
    authorizationNotes: defaultValues.authorizationNotes ?? '',
  })

  const toggleGroup = (group: string) => {
    setOpenGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group],
    )
  }

  const updateField = (field: keyof ComplianceData, value: string) => {
    const newData = { ...data, [field]: value }
    setData(newData)
    onChange(newData)
  }

  return (
    <div className="space-y-3">
        {/* Group A: Quick Assessment */}
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
                  Group A: Quick Assessment
                </p>
                <p className="text-xs text-muted-foreground">
                  Criminal record, banking history
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
                Does the client have any criminal record?
              </Label>
              <RadioGroup
                value={data.hasCriminalRecord}
                onValueChange={(value) =>
                  updateField('hasCriminalRecord', value)
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="criminal-no" />
                  <Label htmlFor="criminal-no" className="cursor-pointer">
                    No
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="criminal-yes" />
                  <Label htmlFor="criminal-yes" className="cursor-pointer">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="unknown" id="criminal-unknown" />
                  <Label htmlFor="criminal-unknown" className="cursor-pointer">
                    Unknown
                  </Label>
                </div>
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
                Does the client have established banking history?
              </Label>
              <RadioGroup
                value={data.hasBankingHistory}
                onValueChange={(value) =>
                  updateField('hasBankingHistory', value)
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="banking-yes" />
                  <Label htmlFor="banking-yes" className="cursor-pointer">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="banking-no" />
                  <Label htmlFor="banking-no" className="cursor-pointer">
                    No
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="unknown" id="banking-unknown" />
                  <Label htmlFor="banking-unknown" className="cursor-pointer">
                    Unknown
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Group B: Identity & Documents */}
        <Collapsible
          open={openGroups.includes('groupB')}
          onOpenChange={() => toggleGroup('groupB')}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10">
                <FileCheck className="h-4 w-4 text-chart-2" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">
                  Group B: Identity & Documents
                </p>
                <p className="text-xs text-muted-foreground">
                  ID types, address verification
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
                Type of ID document provided
              </Label>
              <RadioGroup
                value={data.idType}
                onValueChange={(value) => updateField('idType', value)}
                className="grid gap-2 sm:grid-cols-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="drivers_license" id="id-drivers" />
                  <Label htmlFor="id-drivers" className="cursor-pointer">
                    Driver&apos;s License
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="state_id" id="id-state" />
                  <Label htmlFor="id-state" className="cursor-pointer">
                    State ID
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="passport" id="id-passport" />
                  <Label htmlFor="id-passport" className="cursor-pointer">
                    Passport
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="id-other" />
                  <Label htmlFor="id-other" className="cursor-pointer">
                    Other
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">
                Has address proof been provided?
              </Label>
              <RadioGroup
                value={data.hasAddressProof}
                onValueChange={(value) => updateField('hasAddressProof', value)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="address-proof-yes" />
                  <Label htmlFor="address-proof-yes" className="cursor-pointer">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="address-proof-no" />
                  <Label htmlFor="address-proof-no" className="cursor-pointer">
                    No
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pending" id="address-proof-pending" />
                  <Label
                    htmlFor="address-proof-pending"
                    className="cursor-pointer"
                  >
                    Pending
                  </Label>
                </div>
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

        {/* Group C: Behavior History */}
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
                  Group C: Behavior History
                </p>
                <p className="text-xs text-muted-foreground">
                  PayPal, betting platform history
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
                Does the client have a PayPal account?
              </Label>
              <RadioGroup
                value={data.hasPayPal}
                onValueChange={(value) => updateField('hasPayPal', value)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="paypal-yes" />
                  <Label htmlFor="paypal-yes" className="cursor-pointer">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="paypal-no" />
                  <Label htmlFor="paypal-no" className="cursor-pointer">
                    No
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="unknown" id="paypal-unknown" />
                  <Label htmlFor="paypal-unknown" className="cursor-pointer">
                    Unknown
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">
                Previous betting platform history?
              </Label>
              <RadioGroup
                value={data.hasBettingHistory}
                onValueChange={(value) =>
                  updateField('hasBettingHistory', value)
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="betting-none" />
                  <Label htmlFor="betting-none" className="cursor-pointer">
                    None
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="some" id="betting-some" />
                  <Label htmlFor="betting-some" className="cursor-pointer">
                    Some
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="extensive" id="betting-extensive" />
                  <Label htmlFor="betting-extensive" className="cursor-pointer">
                    Extensive
                  </Label>
                </div>
              </RadioGroup>
              {(data.hasBettingHistory === 'some' ||
                data.hasBettingHistory === 'extensive') && (
                <Textarea
                  placeholder="List platforms the client has used..."
                  value={data.bettingDetails}
                  onChange={(e) =>
                    updateField('bettingDetails', e.target.value)
                  }
                  className="mt-2 min-h-[80px] rounded-xl border-border/50 bg-input"
                />
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Group D: Authorization & Risk */}
        <Collapsible
          open={openGroups.includes('groupD')}
          onOpenChange={() => toggleGroup('groupD')}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
                <AlertTriangle className="h-4 w-4 text-success" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">
                  Group D: Authorization & Risk
                </p>
                <p className="text-xs text-muted-foreground">
                  Risk assessment, authorization level
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
                Overall risk level assessment
              </Label>
              <RadioGroup
                value={data.riskLevel}
                onValueChange={(value) => updateField('riskLevel', value)}
                className="grid gap-2 sm:grid-cols-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="low" id="risk-low" />
                  <Label
                    htmlFor="risk-low"
                    className="cursor-pointer text-success"
                  >
                    Low Risk
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="risk-medium" />
                  <Label
                    htmlFor="risk-medium"
                    className="cursor-pointer text-amber-500"
                  >
                    Medium Risk
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="high" id="risk-high" />
                  <Label
                    htmlFor="risk-high"
                    className="cursor-pointer text-destructive"
                  >
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
          </CollapsibleContent>
        </Collapsible>
    </div>
  )
}
