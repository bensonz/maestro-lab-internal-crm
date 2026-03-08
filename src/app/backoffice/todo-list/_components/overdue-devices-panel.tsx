'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Smartphone, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { OverdueDevice } from './types'

interface OverdueDevicesPanelProps {
  devices: OverdueDevice[]
}

export function OverdueDevicesPanel({ devices }: OverdueDevicesPanelProps) {
  return (
    <Card id="overdue-devices" data-testid="overdue-devices-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Overdue Devices</CardTitle>
          {devices.length > 0 && (
            <Badge variant="destructive" className="ml-auto text-[10px]">
              {devices.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {devices.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No overdue devices
          </p>
        ) : (
          <div className="space-y-2">
            {devices.map((device) => (
              <div
                key={device.assignmentId}
                className="flex items-center gap-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2"
                data-testid={`overdue-device-${device.assignmentId}`}
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {device.agentName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {device.phoneNumber}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    Client: {device.clientName} — Due: {format(new Date(device.dueBackAt), 'MMM d')}
                  </p>
                </div>
                <Badge
                  variant="destructive"
                  className={cn(
                    'shrink-0 text-[10px]',
                    device.daysOverdue >= 3 && 'animate-pulse',
                  )}
                >
                  {device.daysOverdue}d overdue
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
