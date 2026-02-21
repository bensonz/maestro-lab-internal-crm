'use client'

import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import { FileText } from 'lucide-react'

interface Step4Props {
  formData: Record<string, unknown>
  onChange: (field: string, value: unknown) => void
}

export function Step4Contract({ formData, onChange }: Step4Props) {
  return (
    <div className="space-y-5" data-testid="step4-contract">
      <h2 className="text-lg font-semibold">Step 4: Contract</h2>

      <div className="rounded-md border border-dashed p-6 text-center">
        <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          Upload the signed contract document
        </p>

        <Field className="mt-4 text-left">
          <FieldLabel htmlFor="contractDocument">Contract Document *</FieldLabel>
          <Input
            id="contractDocument"
            value={(formData.contractDocument as string) || ''}
            onChange={(e) => onChange('contractDocument', e.target.value)}
            placeholder="Upload path or URL"
            data-testid="client-contract-document"
          />
        </Field>
      </div>

      <div className="rounded-md bg-muted/50 p-4">
        <h3 className="text-sm font-medium">Submission Checklist</h3>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className={formData.firstName ? 'text-green-600' : 'text-destructive'}>
              {formData.firstName ? '\u2713' : '\u2717'}
            </span>
            First name provided
          </li>
          <li className="flex items-center gap-2">
            <span className={formData.lastName ? 'text-green-600' : 'text-destructive'}>
              {formData.lastName ? '\u2713' : '\u2717'}
            </span>
            Last name provided
          </li>
          <li className="flex items-center gap-2">
            <span
              className={
                formData.contractDocument ? 'text-green-600' : 'text-destructive'
              }
            >
              {formData.contractDocument ? '\u2713' : '\u2717'}
            </span>
            Contract document uploaded
          </li>
        </ul>
      </div>
    </div>
  )
}
