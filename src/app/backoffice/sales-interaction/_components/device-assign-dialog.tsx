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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field, FieldLabel } from '@/components/ui/field'
import { Loader2, Info } from 'lucide-react'
import { assignAndSignOutDevice } from '@/app/actions/phone-assignments'
import { toast } from 'sonner'

interface DeviceAssignDialogProps {
  draftId: string | null
  clientName: string
  agentName: string
  onClose: () => void
}

export function DeviceAssignDialog({
  draftId,
  clientName,
  agentName,
  onClose,
}: DeviceAssignDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [carrier, setCarrier] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [notes, setNotes] = useState('')

  const handleClose = () => {
    setPhoneNumber('')
    setCarrier('')
    setDeviceId('')
    setNotes('')
    onClose()
  }

  const handleSubmit = () => {
    if (!draftId || !phoneNumber.trim()) return

    startTransition(async () => {
      const result = await assignAndSignOutDevice(
        draftId,
        phoneNumber,
        carrier || undefined,
        deviceId || undefined,
        notes || undefined,
      )

      if (result.success) {
        toast.success(`Device signed out for ${clientName}`)
        handleClose()
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to sign out device')
      }
    })
  }

  return (
    <Dialog open={!!draftId} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md" data-testid="device-assign-dialog">
        <DialogHeader>
          <DialogTitle>Assign Device — {clientName}</DialogTitle>
          <p className="text-sm text-muted-foreground">Agent: {agentName}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Field>
            <FieldLabel htmlFor="device-phone">Phone Number *</FieldLabel>
            <Input
              id="device-phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="(555) 123-4567"
              className="font-mono"
              data-testid="device-phone-input"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="device-carrier">Carrier</FieldLabel>
            <Select value={carrier} onValueChange={setCarrier}>
              <SelectTrigger id="device-carrier" data-testid="device-carrier-select">
                <SelectValue placeholder="Select carrier..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="T-Mobile">T-Mobile</SelectItem>
                <SelectItem value="AT&T">AT&T</SelectItem>
                <SelectItem value="Verizon">Verizon</SelectItem>
                <SelectItem value="Mint Mobile">Mint Mobile</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="device-id">Device ID</FieldLabel>
            <Input
              id="device-id"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="IMEI or serial number"
              data-testid="device-id-input"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="device-notes">Notes</FieldLabel>
            <Textarea
              id="device-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              data-testid="device-notes-input"
            />
          </Field>

          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Device will be due back in 3 days from sign-out.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="terminal"
            onClick={handleSubmit}
            disabled={isPending || !phoneNumber.trim()}
            data-testid="sign-out-device-btn"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign Out Device
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
