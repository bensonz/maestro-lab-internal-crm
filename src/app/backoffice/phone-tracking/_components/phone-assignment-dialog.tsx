'use client'

import { useState, useTransition } from 'react'
import { Phone } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { assignPhone } from '@/app/actions/phones'
import { toast } from 'sonner'

interface EligibleClient {
  id: string
  name: string
  agentName: string
}

interface PhoneAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eligibleClients: EligibleClient[]
  preselectedClientId?: string
}

export function PhoneAssignmentDialog({
  open,
  onOpenChange,
  eligibleClients,
  preselectedClientId,
}: PhoneAssignmentDialogProps) {
  const [clientId, setClientId] = useState(preselectedClientId ?? '')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  const selectedClient = eligibleClients.find((c) => c.id === clientId)

  function resetForm() {
    setClientId(preselectedClientId ?? '')
    setPhoneNumber('')
    setDeviceId('')
    setNotes('')
  }

  function handleSubmit() {
    if (!clientId || !phoneNumber.trim()) return

    startTransition(async () => {
      const result = await assignPhone(
        clientId,
        phoneNumber.trim(),
        deviceId.trim() || undefined,
        notes.trim() || undefined
      )
      if (result.success) {
        toast.success('Phone assigned successfully')
        resetForm()
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Failed to assign phone')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            Assign Phone Number
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Field>
            <FieldLabel htmlFor="client">Client</FieldLabel>
            {eligibleClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No eligible clients (PENDING status with no phone)
              </p>
            ) : (
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger id="client" data-testid="client-selector">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleClients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {c.agentName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>

          {selectedClient && (
            <p className="text-sm text-muted-foreground">
              Assigning phone to:{' '}
              <span className="font-medium text-foreground">
                {selectedClient.name}
              </span>{' '}
              (Agent: {selectedClient.agentName})
            </p>
          )}

          <Field>
            <FieldLabel htmlFor="phoneNumber">Phone Number</FieldLabel>
            <Input
              id="phoneNumber"
              placeholder="(555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="font-mono"
              data-testid="phone-number-input"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="deviceId">Device ID (optional)</FieldLabel>
            <Input
              id="deviceId"
              placeholder="e.g. IMEI or serial number"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="font-mono"
              data-testid="device-id-input"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="notes">Notes (optional)</FieldLabel>
            <Textarea
              id="notes"
              placeholder="Any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              data-testid="notes-input"
            />
          </Field>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!clientId || !phoneNumber.trim() || isPending}
            data-testid="confirm-assign-phone"
          >
            {isPending ? 'Assigning...' : 'Confirm Assignment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
