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
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { approveApplication } from '@/app/actions/application-review'

interface Props {
  application: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  agents: { id: string; name: string }[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ApproveApplicationDialog({
  application,
  agents,
  open,
  onOpenChange,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [supervisorId, setSupervisorId] = useState('')
  const [tier, setTier] = useState('rookie')
  const [notes, setNotes] = useState('')

  const handleApprove = async () => {
    setLoading(true)
    try {
      const result = await approveApplication(application.id, {
        supervisorId: supervisorId || undefined,
        tier,
        notes: notes || undefined,
      })

      if (result.success) {
        toast.success(
          `Agent account created for ${application.firstName} ${application.lastName}`,
        )
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to approve application')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="approve-application-dialog">
        <DialogHeader>
          <DialogTitle>
            Approve Application — {application.firstName}{' '}
            {application.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            This will create an agent account for{' '}
            <strong>{application.email}</strong>. The applicant will be able to
            log in immediately.
          </p>

          <Field>
            <FieldLabel htmlFor="supervisor-select">Supervisor</FieldLabel>
            <Select value={supervisorId} onValueChange={setSupervisorId}>
              <SelectTrigger
                id="supervisor-select"
                data-testid="supervisor-select"
              >
                <SelectValue placeholder="Select supervisor (optional)" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="tier-select">Initial Tier</FieldLabel>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger id="tier-select" data-testid="tier-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rookie">Rookie</SelectItem>
                <SelectItem value="1-star">1-Star</SelectItem>
                <SelectItem value="2-star">2-Star</SelectItem>
                <SelectItem value="3-star">3-Star</SelectItem>
                <SelectItem value="4-star">4-Star</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="review-notes">Review Notes</FieldLabel>
            <Input
              id="review-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              data-testid="review-notes-input"
            />
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
            onClick={handleApprove}
            disabled={loading}
            className="bg-success text-success-foreground hover:bg-success/90"
            data-testid="confirm-approve-btn"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Approve & Create Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
