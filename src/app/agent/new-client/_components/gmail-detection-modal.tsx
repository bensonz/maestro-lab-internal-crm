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
import { ScanLine, CheckCircle2 } from 'lucide-react'
import type { GmailExtractionResult } from './mock-extract-id'

interface GmailDetectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: GmailExtractionResult
  onConfirm: (emailAddress: string) => void
}

export function GmailDetectionModal({
  open,
  onOpenChange,
  data,
  onConfirm,
}: GmailDetectionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="gmail-detection-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Gmail Screenshot Analysis
          </DialogTitle>
          <DialogDescription>
            Detected info from screenshot ({Math.round(data.confidence * 100)}% confidence).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {data.emailAddress && (
            <div
              className="flex items-center gap-2 rounded-md border border-success/30 bg-success/5 p-3"
              data-testid="gmail-detected-email"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
              <div>
                <p className="text-sm font-medium">Gmail Address</p>
                <p className="text-sm text-muted-foreground">{data.emailAddress}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            data-testid="gmail-detection-cancel"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onConfirm(data.emailAddress)
              onOpenChange(false)
            }}
            data-testid="gmail-detection-confirm"
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
