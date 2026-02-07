'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { requestDeadlineExtension } from '@/app/actions/extensions'

interface ExtensionRequestDialogProps {
  clientId: string
  currentDeadline: Date
  extensionsUsed: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MAX_EXTENSIONS = 3
const MIN_REASON_LENGTH = 10

export function ExtensionRequestDialog({
  clientId,
  currentDeadline,
  extensionsUsed,
  open,
  onOpenChange,
}: ExtensionRequestDialogProps) {
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()

  const formattedDeadline = new Date(currentDeadline).toLocaleDateString(
    'en-US',
    {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    },
  )

  const isReasonValid = reason.trim().length >= MIN_REASON_LENGTH

  function handleSubmit() {
    if (!isReasonValid) return

    startTransition(async () => {
      const result = await requestDeadlineExtension(clientId, reason)
      if (result.success) {
        toast.success(
          'Extension request submitted — awaiting backoffice approval',
        )
        setReason('')
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Failed to submit extension request')
      }
    })
  }

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return
    if (!nextOpen) {
      setReason('')
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Deadline Extension</DialogTitle>
          <DialogDescription>
            Submit a request for additional time. This will be reviewed by the
            backoffice team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted/30 p-3 ring-1 ring-border/30 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Current Deadline
            </p>
            <p className="text-sm font-medium text-foreground">
              {formattedDeadline}
            </p>
          </div>

          <div className="rounded-lg bg-muted/30 p-3 ring-1 ring-border/30">
            <p className="text-xs text-muted-foreground">
              {extensionsUsed} of {MAX_EXTENSIONS} extensions used
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="extension-reason"
              className="text-sm font-medium text-foreground"
            >
              Reason for Extension
            </label>
            <Textarea
              id="extension-reason"
              placeholder="Explain why additional time is needed (min 10 characters)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground text-right">
              {reason.trim().length} / {MIN_REASON_LENGTH} min characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isReasonValid || isPending}>
            {isPending ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
