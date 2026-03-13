'use client'

import { useState } from 'react'
import { Smartphone, AlertTriangle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { OverdueDevice, DeviceReservation } from './types'

type DeviceTab = 'overdue' | 'pending'

interface DeviceManagementPanelProps {
  overdueDevices: OverdueDevice[]
  reservations: DeviceReservation[]
}

export function DeviceManagementPanel({
  overdueDevices,
  reservations,
}: DeviceManagementPanelProps) {
  const [tab, setTab] = useState<DeviceTab>(
    overdueDevices.length > 0 ? 'overdue' : 'pending',
  )

  const total = overdueDevices.length + reservations.length

  const tabs: { value: DeviceTab; label: string; count: number }[] = [
    { value: 'overdue', label: 'Overdue', count: overdueDevices.length },
    { value: 'pending', label: 'Pending Sign-out', count: reservations.length },
  ]

  return (
    <div id="device-management" className="card-terminal flex min-h-[256px] flex-col p-0" data-testid="device-management-panel">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-3">
        <Smartphone className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Device Management
        </h3>
        {total > 0 && (
          <span
            className={cn(
              'ml-auto rounded px-2 py-0.5 font-mono text-xs font-semibold',
              overdueDevices.length > 0
                ? 'bg-destructive/20 text-destructive'
                : 'bg-primary/20 text-primary',
            )}
          >
            {total}
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border/50 px-5 py-2">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'rounded px-3 py-1.5 text-xs font-medium transition-colors',
              tab === t.value
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            data-testid={`device-tab-${t.value}`}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className={cn(
                  'ml-1.5 font-mono',
                  t.value === 'overdue' && t.count > 0
                    ? 'text-destructive'
                    : 'text-primary',
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1">
      {tab === 'overdue' ? (
        overdueDevices.length === 0 ? (
          <div className="flex h-full items-center justify-center px-5 py-8">
            <p className="text-sm text-muted-foreground">No overdue devices</p>
          </div>
        ) : (
          <div className="max-h-[288px] divide-y divide-border/50 overflow-y-auto">
            {overdueDevices.map((device) => (
              <div
                key={device.assignmentId}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/20"
                data-testid={`overdue-device-${device.assignmentId}`}
              >
                <AlertTriangle
                  className={cn(
                    'h-4 w-4 shrink-0 text-destructive',
                    device.daysOverdue >= 3 && 'animate-pulse',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {device.agentName}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {device.phoneNumber}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {device.clientName} — Due {format(new Date(device.dueBackAt), 'MMM d')}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded px-2 py-1 font-mono text-xs font-semibold',
                    device.daysOverdue >= 3
                      ? 'bg-destructive/20 text-destructive animate-pulse'
                      : 'bg-warning/20 text-warning',
                  )}
                >
                  {device.daysOverdue}d
                </span>
              </div>
            ))}
          </div>
        )
      ) : reservations.length === 0 ? (
        <div className="flex h-full items-center justify-center px-5 py-8">
          <p className="text-sm text-muted-foreground">No pending device sign-outs</p>
        </div>
      ) : (
        <div className="max-h-[288px] divide-y divide-border/50 overflow-y-auto">
          {reservations.map((res) => {
            const waitDays = Math.max(
              1,
              Math.ceil(
                (Date.now() - new Date(res.requestedAt).getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            )
            return (
              <div
                key={res.clientRecordId}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/20"
                data-testid={`reservation-${res.clientRecordId}`}
              >
                <Clock className="h-4 w-4 shrink-0 text-warning" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {res.clientName}
                    </span>
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                      Step {res.step}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {res.agentName} — Requested {format(new Date(res.requestedAt), 'MMM d')}
                  </p>
                </div>
                <span className="shrink-0 rounded bg-warning/20 px-2 py-1 font-mono text-xs font-semibold text-warning">
                  {waitDays}d
                </span>
              </div>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}
