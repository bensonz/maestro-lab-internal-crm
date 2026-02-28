'use client'

import { useCallback } from 'react'
import { UploadDropzone, ScreenshotThumbnail } from '@/components/upload-dropzone'
import { FileText, CheckCircle2, XCircle, ChevronDown } from 'lucide-react'
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
  const allReady = hasContract && hasFirstName && hasLastName

  return (
    <div className="space-y-4" data-testid="step4-contract">

      {/* Contract Upload */}
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

      {/* Submission Checklist */}
      <SectionCard title="Submission Checklist">
        <div className="space-y-2">
          {allReady && (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              All required fields are filled. Ready to submit.
            </div>
          )}

          <ul className="space-y-2 text-sm">
            <ChecklistItem checked={hasFirstName} label="First name provided" />
            <ChecklistItem checked={hasLastName} label="Last name provided" />
            <ChecklistItem checked={hasContract} label="Contract document uploaded" />
          </ul>
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
