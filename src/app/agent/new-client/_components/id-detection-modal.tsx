'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScanLine } from 'lucide-react'
import type { IdExtractionResult } from './mock-extract-id'

interface IdDetectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: IdExtractionResult
  onConfirm: (selectedFields: Partial<IdExtractionResult>) => void
}

const FIELD_LABELS: { key: keyof IdExtractionResult; label: string }[] = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'dateOfBirth', label: 'Date of Birth' },
  { key: 'address', label: 'Address' },
  { key: 'idExpiry', label: 'ID Expiry' },
]

export function IdDetectionModal({
  open,
  onOpenChange,
  data,
  onConfirm,
}: IdDetectionModalProps) {
  const [selected, setSelected] = useState<Set<keyof IdExtractionResult>>(
    () => new Set(FIELD_LABELS.map((f) => f.key)),
  )

  function toggleField(key: keyof IdExtractionResult) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  function handleConfirm() {
    const result: Partial<IdExtractionResult> = {}
    for (const key of selected) {
      ;(result as Record<string, unknown>)[key] = data[key]
    }
    onConfirm(result)
    onOpenChange(false)
  }

  function handleCancel() {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="id-detection-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            ID Detection Results
          </DialogTitle>
          <DialogDescription>
            The following fields were extracted from your ID document
            ({Math.round(data.confidence * 100)}% confidence). Select which
            fields to auto-fill.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {FIELD_LABELS.map(({ key, label }) => {
            const value = data[key]
            if (!value || key === 'confidence') return null
            return (
              <label
                key={key}
                className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                data-testid={`id-field-${key}`}
              >
                <Checkbox
                  checked={selected.has(key)}
                  onCheckedChange={() => toggleField(key)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {String(value)}
                  </p>
                </div>
              </label>
            )
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            data-testid="id-detection-cancel"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            data-testid="id-detection-confirm"
          >
            Apply Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
