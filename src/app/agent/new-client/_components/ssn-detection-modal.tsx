'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScanLine } from 'lucide-react'
import type { SsnExtractionResult } from './mock-extract-id'

interface SsnDetectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: SsnExtractionResult
  onConfirm: (ssnNumber: string) => void
}

export function SsnDetectionModal({
  open,
  onOpenChange,
  data,
  onConfirm,
}: SsnDetectionModalProps) {
  function handleConfirm() {
    onConfirm(data.ssnNumber)
    onOpenChange(false)
  }

  function handleCancel() {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="ssn-detection-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            SSN Detection Results
          </DialogTitle>
          <DialogDescription>
            The following SSN was extracted from your document
            ({Math.round(data.confidence * 100)}% confidence).
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border p-3" data-testid="ssn-detected-value">
          <p className="text-sm font-medium">SSN Number</p>
          <p className="text-sm text-muted-foreground font-mono">{data.ssnNumber}</p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            data-testid="ssn-detection-cancel"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            data-testid="ssn-detection-confirm"
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
