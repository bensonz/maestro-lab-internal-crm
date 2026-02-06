'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Plus } from 'lucide-react'
import { PhoneAssignmentDialog } from './phone-assignment-dialog'

interface EligibleClient {
  id: string
  name: string
  agentName: string
}

interface PhoneTrackingHeaderProps {
  eligibleClients: EligibleClient[]
}

export function PhoneTrackingHeader({ eligibleClients }: PhoneTrackingHeaderProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Phone Number Tracking
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track all issued phone numbers and their assignment status
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={() => setDialogOpen(true)}
          className="gap-2"
          data-testid="assign-phone-button"
        >
          <Plus className="h-4 w-4" />
          Assign Phone
        </Button>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      <PhoneAssignmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        eligibleClients={eligibleClients}
      />
    </div>
  )
}
