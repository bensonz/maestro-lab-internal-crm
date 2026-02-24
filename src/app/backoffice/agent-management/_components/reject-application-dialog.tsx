'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { rejectApplication } from '@/app/actions/application-review'

interface Props {
  application: {
    id: string
    firstName: string
    lastName: string
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RejectApplicationDialog({
  application,
  open,
  onOpenChange,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const handleReject = async () => {
    if (!reason.trim()) {
      setError('Rejection reason is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await rejectApplication(application.id, reason)

      if (result.success) {
        toast.success(
          `Application rejected for ${application.firstName} ${application.lastName}`,
        )
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to reject application')
        setError(result.error || 'Failed to reject application')
      }
    } catch {
      toast.error('Something went wrong')
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="reject-application-dialog">
        <DialogHeader>
          <DialogTitle>
            Reject Application — {application.firstName}{' '}
            {application.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            This application will be marked as rejected. The applicant will not
            be able to create an account.
          </p>

          <Field>
            <FieldLabel htmlFor="reject-reason">Reason *</FieldLabel>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (error) setError('')
              }}
              placeholder="Why is this application being rejected?"
              rows={3}
              data-testid="reject-reason-input"
            />
            <FieldError>{error}</FieldError>
          </Field>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReject}
            disabled={loading}
            variant="destructive"
            data-testid="confirm-reject-btn"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <X className="h-4 w-4 mr-2" />
            )}
            Reject Application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
