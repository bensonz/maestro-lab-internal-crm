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
import type { AddressProofExtractionResult } from './mock-extract-id'

interface AddressDetectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: AddressProofExtractionResult
  onConfirm: (address: string) => void
}

export function AddressDetectionModal({
  open,
  onOpenChange,
  data,
  onConfirm,
}: AddressDetectionModalProps) {
  function handleConfirm() {
    onConfirm(data.address)
    onOpenChange(false)
  }

  function handleCancel() {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="address-detection-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Address Detection Results
          </DialogTitle>
          <DialogDescription>
            The following address was extracted from your document
            ({Math.round(data.confidence * 100)}% confidence).
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border p-3" data-testid="address-detected-value">
          <p className="text-sm font-medium">Address</p>
          <p className="text-sm text-muted-foreground">{data.address}</p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            data-testid="address-detection-cancel"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            data-testid="address-detection-confirm"
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
