'use client'

import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import { Checkbox } from '@/components/ui/checkbox'

interface Step1Props {
  formData: Record<string, unknown>
  onChange: (field: string, value: unknown) => void
  onRiskFlagsChange: (flags: Record<string, boolean>) => void
}

export function Step1PreQual({ formData, onChange, onRiskFlagsChange }: Step1Props) {
  function handleIdExpiryChange(value: string) {
    onChange('idExpiry', value)
    // Check if ID expires within 75 days
    if (value) {
      const expiry = new Date(value)
      const daysUntil = Math.floor(
        (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      )
      onRiskFlagsChange({ idExpiringSoon: daysUntil < 75 })
    } else {
      onRiskFlagsChange({ idExpiringSoon: false })
    }
  }

  return (
    <div className="space-y-5" data-testid="step1-prequal">
      <h2 className="text-lg font-semibold">Step 1: Pre-Qualification</h2>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor="firstName">First Name *</FieldLabel>
          <Input
            id="firstName"
            value={(formData.firstName as string) || ''}
            onChange={(e) => onChange('firstName', e.target.value)}
            placeholder="First name"
            data-testid="client-first-name"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="lastName">Last Name *</FieldLabel>
          <Input
            id="lastName"
            value={(formData.lastName as string) || ''}
            onChange={(e) => onChange('lastName', e.target.value)}
            placeholder="Last name"
            data-testid="client-last-name"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            value={(formData.email as string) || ''}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="client@example.com"
            data-testid="client-email"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="phone">Phone</FieldLabel>
          <Input
            id="phone"
            value={(formData.phone as string) || ''}
            onChange={(e) => onChange('phone', e.target.value)}
            placeholder="(555) 000-0000"
            data-testid="client-phone"
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="idDocument">ID Document</FieldLabel>
        <Input
          id="idDocument"
          value={(formData.idDocument as string) || ''}
          onChange={(e) => onChange('idDocument', e.target.value)}
          placeholder="Upload path or URL"
          data-testid="client-id-document"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor="idNumber">ID Number</FieldLabel>
          <Input
            id="idNumber"
            value={(formData.idNumber as string) || ''}
            onChange={(e) => onChange('idNumber', e.target.value)}
            placeholder="DL-12345678"
            data-testid="client-id-number"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="idExpiry">ID Expiry</FieldLabel>
          <Input
            id="idExpiry"
            type="date"
            value={(formData.idExpiry as string)?.split('T')[0] || ''}
            onChange={(e) => handleIdExpiryChange(e.target.value)}
            data-testid="client-id-expiry"
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="assignedGmail">Assigned Gmail</FieldLabel>
        <Input
          id="assignedGmail"
          type="email"
          value={(formData.assignedGmail as string) || ''}
          onChange={(e) => onChange('assignedGmail', e.target.value)}
          placeholder="assigned@gmail.com"
          data-testid="client-assigned-gmail"
        />
      </Field>

      <div className="flex items-center gap-2">
        <Checkbox
          id="betmgmCheckPassed"
          checked={formData.betmgmCheckPassed as boolean}
          onCheckedChange={(checked) =>
            onChange('betmgmCheckPassed', checked === true)
          }
          data-testid="client-betmgm-check"
        />
        <label htmlFor="betmgmCheckPassed" className="text-sm">
          BetMGM Pre-Check Passed
        </label>
      </div>
    </div>
  )
}
