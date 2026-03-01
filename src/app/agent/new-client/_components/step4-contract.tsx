'use client'

import { useCallback, useState } from 'react'
import { UploadDropzone, ScreenshotThumbnail } from '@/components/upload-dropzone'
import { FileText, CheckCircle2, XCircle, ChevronDown, MapPin, Pencil } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { DiscoveredAddress } from '@/types/backend-types'
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

export function Step4Contract({ formData, onChange, discoveredAddresses, onAddressUpdate }: Step4Props) {
  const [addressesConfirmed, setAddressesConfirmed] = useState(false)
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
  const addressCount = discoveredAddresses.length
  const allReady = hasContract && hasFirstName && hasLastName && (addressCount === 0 || addressesConfirmed)

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

      {/* Address Summary — only shown when addresses have been discovered */}
      {addressCount > 0 && (
        <SectionCard title="Address Summary">
          <div className="space-y-3" data-testid="address-summary">
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
            <div className="flex items-center gap-2 pt-1">
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
        </SectionCard>
      )}

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
            {addressCount > 0 && (
              <ChecklistItem
                checked={addressesConfirmed}
                label={`All addresses confirmed (${addressCount} unique ${addressCount === 1 ? 'address' : 'addresses'})`}
              />
            )}
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
