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
import { ScanLine, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BetmgmExtractionResult } from './mock-extract-id'

interface BetmgmDetectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: BetmgmExtractionResult
  screenshotType: 'registration' | 'login'
  onConfirm: (data: BetmgmExtractionResult) => void
}

export function BetmgmDetectionModal({
  open,
  onOpenChange,
  data,
  screenshotType,
  onConfirm,
}: BetmgmDetectionModalProps) {
  const title = screenshotType === 'login'
    ? 'BetMGM Login Screenshot Analysis'
    : 'BetMGM Registration Screenshot Analysis'

  const depositLabel = screenshotType === 'registration'
    ? '"Deposit" Word Detected'
    : 'Deposit Options'

  const depositDescription = data.depositWordDetected
    ? screenshotType === 'registration'
      ? 'Found — registration appears successful'
      : 'Detected — account appears functional'
    : screenshotType === 'registration'
      ? 'Not found — registration may have failed'
      : 'Not detected'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="betmgm-detection-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Detected info from screenshot ({Math.round(data.confidence * 100)}% confidence).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {data.loginEmail && (
            <div className="rounded-md border p-3" data-testid="betmgm-detected-email">
              <p className="text-sm font-medium">Login Email</p>
              <p className="text-sm text-muted-foreground">{data.loginEmail}</p>
            </div>
          )}

          {data.loginPassword && (
            <div className="rounded-md border p-3" data-testid="betmgm-detected-password">
              <p className="text-sm font-medium">Login Password</p>
              <p className="text-sm font-mono text-muted-foreground">{data.loginPassword}</p>
            </div>
          )}

          <div
            className={cn(
              'flex items-center gap-2 rounded-md border p-3',
              data.depositWordDetected
                ? 'border-success/30 bg-success/5'
                : 'border-destructive/30 bg-destructive/5',
            )}
            data-testid="betmgm-detected-deposit"
          >
            {data.depositWordDetected ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
            ) : (
              <XCircle className="h-5 w-5 shrink-0 text-destructive" />
            )}
            <div>
              <p className="text-sm font-medium">{depositLabel}</p>
              <p className="text-sm text-muted-foreground">
                {depositDescription}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            size="sm"
            onClick={() => {
              onConfirm(data)
              onOpenChange(false)
            }}
            data-testid="betmgm-detection-ok"
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
