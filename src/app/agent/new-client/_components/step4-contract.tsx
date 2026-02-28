'use client'

import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import { FileText } from 'lucide-react'
import { ChevronDown } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface Step4Props {
  formData: Record<string, unknown>
  onChange: (field: string, value: unknown) => void
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

export function Step4Contract({ formData, onChange }: Step4Props) {
  return (
    <div className="space-y-4" data-testid="step4-contract">

      {/* Contract Upload */}
      <SectionCard title="Contract Document">
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
      </SectionCard>

      {/* Submission Checklist */}
      <SectionCard title="Submission Checklist">
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className={formData.firstName ? 'text-success' : 'text-destructive'}>
              {formData.firstName ? '\u2713' : '\u2717'}
            </span>
            First name provided
          </li>
          <li className="flex items-center gap-2">
            <span className={formData.lastName ? 'text-success' : 'text-destructive'}>
              {formData.lastName ? '\u2713' : '\u2717'}
            </span>
            Last name provided
          </li>
          <li className="flex items-center gap-2">
            <span
              className={
                formData.contractDocument ? 'text-success' : 'text-destructive'
              }
            >
              {formData.contractDocument ? '\u2713' : '\u2717'}
            </span>
            Contract document uploaded
          </li>
        </ul>
      </SectionCard>
    </div>
  )
}
