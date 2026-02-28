'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldLabel } from '@/components/ui/field'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'

interface Step2Props {
  formData: Record<string, unknown>
  onChange: (field: string, value: unknown) => void
  onRiskFlagsChange: (flags: Record<string, unknown>) => void
}

function SectionCard({
  title,
  children,
  defaultOpen,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
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

export function Step2Background({ formData, onChange, onRiskFlagsChange }: Step2Props) {
  return (
    <div className="space-y-4" data-testid="step2-background">

      {/* Documents & Address */}
      <SectionCard title="Documents & Address">
        <Field>
          <FieldLabel htmlFor="ssnDocument">SSN Document</FieldLabel>
          <Input
            id="ssnDocument"
            value={(formData.ssnDocument as string) || ''}
            onChange={(e) => onChange('ssnDocument', e.target.value)}
            placeholder="Upload path or URL"
            data-testid="client-ssn-document"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="secondAddress">Secondary Address</FieldLabel>
          <Input
            id="secondAddress"
            value={(formData.secondAddress as string) || ''}
            onChange={(e) => onChange('secondAddress', e.target.value)}
            placeholder="Secondary address (if any)"
            data-testid="client-second-address"
          />
        </Field>
      </SectionCard>

      {/* Criminal Record */}
      <SectionCard title="Criminal Record">
        <div className="flex items-center gap-2">
          <Checkbox
            id="hasCriminalRecord"
            checked={formData.hasCriminalRecord as boolean}
            onCheckedChange={(checked) => {
              const val = checked === true
              onChange('hasCriminalRecord', val)
              onRiskFlagsChange({ criminalRecord: val })
            }}
            data-testid="client-criminal-record"
          />
          <label htmlFor="hasCriminalRecord" className="text-sm font-medium">
            Has Criminal Record
          </label>
        </div>

        {(formData.hasCriminalRecord as boolean) && (
          <Field>
            <FieldLabel htmlFor="criminalRecordNotes">Details</FieldLabel>
            <Textarea
              id="criminalRecordNotes"
              value={(formData.criminalRecordNotes as string) || ''}
              onChange={(e) => onChange('criminalRecordNotes', e.target.value)}
              placeholder="Describe the criminal record..."
              rows={3}
              data-testid="client-criminal-notes"
            />
          </Field>
        )}
      </SectionCard>

      {/* History */}
      <SectionCard title="History">
        <Field>
          <FieldLabel htmlFor="bankingHistory">Banking History</FieldLabel>
          <Select
            value={(formData.bankingHistory as string) || ''}
            onValueChange={(value) => onChange('bankingHistory', value)}
          >
            <SelectTrigger id="bankingHistory" data-testid="client-banking-history">
              <SelectValue placeholder="Select banking history" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="good">Good Standing</SelectItem>
              <SelectItem value="fair">Fair</SelectItem>
              <SelectItem value="poor">Poor / Issues</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="paypalHistory">PayPal History</FieldLabel>
          <Select
            value={(formData.paypalHistory as string) || ''}
            onValueChange={(value) => onChange('paypalHistory', value)}
          >
            <SelectTrigger id="paypalHistory" data-testid="client-paypal-history">
              <SelectValue placeholder="Select PayPal history" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New Account</SelectItem>
              <SelectItem value="active">Active Account</SelectItem>
              <SelectItem value="limited">Limited / Restricted</SelectItem>
              <SelectItem value="none">No Account</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="sportsbookHistory">Sportsbook History</FieldLabel>
          <Select
            value={(formData.sportsbookHistory as string) || ''}
            onValueChange={(value) => onChange('sportsbookHistory', value)}
          >
            <SelectTrigger id="sportsbookHistory" data-testid="client-sportsbook-history">
              <SelectValue placeholder="Select sportsbook history" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Prior Accounts</SelectItem>
              <SelectItem value="some">Some Prior Accounts</SelectItem>
              <SelectItem value="many">Many Prior Accounts</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </SectionCard>

      {/* Risk Flags */}
      <SectionCard title="Risk Flags">
        <div className="flex items-center gap-2">
          <Checkbox
            id="paypalPreviouslyUsed"
            checked={formData.paypalPreviouslyUsed as boolean}
            onCheckedChange={(checked) => {
              const val = checked === true
              onChange('paypalPreviouslyUsed', val)
              onRiskFlagsChange({ paypalPreviouslyUsed: val })
            }}
            data-testid="flag-paypal-used"
          />
          <label htmlFor="paypalPreviouslyUsed" className="text-sm font-medium">
            PayPal Previously Used for Sportsbook
          </label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="debankedHistory"
            checked={formData.debankedHistory as boolean}
            onCheckedChange={(checked) => {
              const val = checked === true
              onChange('debankedHistory', val)
              onRiskFlagsChange({ debankedHistory: val })
            }}
            data-testid="flag-debanked"
          />
          <label htmlFor="debankedHistory" className="text-sm font-medium">
            De-banked History
          </label>
        </div>

        {(formData.debankedHistory as boolean) && (
          <Field>
            <FieldLabel htmlFor="debankedBank">Bank Name</FieldLabel>
            <Input
              id="debankedBank"
              value={(formData.debankedBank as string) || ''}
              onChange={(e) => onChange('debankedBank', e.target.value)}
              placeholder="Which bank?"
              data-testid="client-debanked-bank"
            />
          </Field>
        )}

        <div className="flex items-center gap-2">
          <Checkbox
            id="addressMismatch"
            checked={formData.addressMismatch as boolean}
            onCheckedChange={(checked) => {
              const val = checked === true
              onChange('addressMismatch', val)
              onRiskFlagsChange({ addressMismatch: val })
            }}
            data-testid="flag-address-mismatch"
          />
          <label htmlFor="addressMismatch" className="text-sm font-medium">
            Address Mismatch
          </label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="undisclosedInfo"
            checked={formData.undisclosedInfo as boolean}
            onCheckedChange={(checked) => {
              const val = checked === true
              onChange('undisclosedInfo', val)
              onRiskFlagsChange({ undisclosedInfo: val })
            }}
            data-testid="flag-undisclosed"
          />
          <label htmlFor="undisclosedInfo" className="text-sm font-medium">
            Undisclosed Information
          </label>
        </div>
      </SectionCard>
    </div>
  )
}
