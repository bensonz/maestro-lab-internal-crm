'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Check, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { approveClient } from '@/app/actions/clients'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ApproveConfirmDialogProps {
  /** The ClientRecord ID to approve */
  clientRecordId: string | null
  clientName: string
  /** Whether debit cards have been uploaded (auto-detected) */
  hasDebitCards: boolean
  onClose: () => void
}

export function ApproveConfirmDialog({
  clientRecordId,
  clientName,
  hasDebitCards,
  onClose,
}: ApproveConfirmDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [reviewChecked, setReviewChecked] = useState(false)
  const [cardsChecked, setCardsChecked] = useState(false)

  const canApprove = reviewChecked && cardsChecked && !isPending

  const handleApprove = () => {
    if (!clientRecordId || !canApprove) return
    startTransition(async () => {
      try {
        const result = await approveClient(clientRecordId)
        if (result.success) {
          toast.success(
            `${clientName} approved! $400 bonus pool created (${result.distributedSlices} slices distributed, ${result.recycledSlices} recycled).`,
          )
          onClose()
          router.refresh()
        } else {
          toast.error(result.error || 'Failed to approve')
        }
      } catch {
        toast.error('Failed to approve client — please try again')
      }
    })
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setReviewChecked(false)
      setCardsChecked(false)
      onClose()
    }
  }

  return (
    <Dialog open={!!clientRecordId} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm" data-testid="approve-confirm-dialog">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Approve — {clientName}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Confirm both items before approving this client.
        </p>

        <div className="space-y-3 py-2">
          {/* Review checklist item */}
          <label
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-colors',
              reviewChecked
                ? 'border-success/40 bg-success/5'
                : 'border-border hover:bg-muted/30',
            )}
            data-testid="approve-check-review"
          >
            <Checkbox
              checked={reviewChecked}
              onCheckedChange={(v) => setReviewChecked(v === true)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <span className={cn('text-sm font-medium', reviewChecked && 'text-success')}>
                Review successful
              </span>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                All 4 steps have been reviewed and verified
              </p>
            </div>
            {reviewChecked && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />}
          </label>

          {/* Debit cards checklist item */}
          <label
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-colors',
              cardsChecked
                ? 'border-success/40 bg-success/5'
                : 'border-border hover:bg-muted/30',
            )}
            data-testid="approve-check-cards"
          >
            <Checkbox
              checked={cardsChecked}
              onCheckedChange={(v) => setCardsChecked(v === true)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <span className={cn('text-sm font-medium', cardsChecked && 'text-success')}>
                Debit cards # uploaded
              </span>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Both Bank and Edgeboost debit card numbers are on file
              </p>
            </div>
            {cardsChecked ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            ) : !hasDebitCards ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            ) : null}
          </label>

          {/* Warning if cards not detected */}
          {!hasDebitCards && (
            <div className="flex items-center gap-2 rounded-md bg-warning/10 px-3 py-2 text-[11px] text-warning">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Debit card data not detected — please upload before checking
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={handleApprove}
            disabled={!canApprove}
            data-testid="approve-confirm-btn"
          >
            {isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Check className="mr-1 h-3 w-3" />
            )}
            Approve Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
