'use client'

import {
  ShieldCheck,
  Upload,
  CalendarPlus,
  Loader2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MaintenanceClient } from './types'

// Client Card

function ClientCard({
  client,
  onProcess,
  onExtend,
  isUploading,
  isUploadingThis,
  isExtendingThis,
}: {
  client: MaintenanceClient
  onProcess: (todoId: string) => void
  onExtend: (todoId: string) => void
  isUploading: boolean
  isUploadingThis: boolean
  isExtendingThis: boolean
}) {
  const isOverdue = client.daysRemaining < 0
  const absDays = Math.abs(client.daysRemaining)
  const canExtend =
    client.extensionsUsed < client.maxExtensions && !isExtendingThis

  return (
    <div
      className={cn(
        'rounded-md border bg-muted/10 px-3 py-2.5',
        client.urgency === 'critical'
          ? 'border-destructive/30'
          : client.urgency === 'warning'
            ? 'border-warning/30'
            : 'border-border/30',
      )}
      data-testid={`maintenance-client-${client.id}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {client.name}
            </span>
            <Badge
              variant="outline"
              className={cn(
                'h-4 px-1.5 text-[9px]',
                client.urgency === 'critical'
                  ? 'border-destructive/40 text-destructive'
                  : client.urgency === 'warning'
                    ? 'border-warning/40 text-warning'
                    : 'border-border text-muted-foreground',
              )}
            >
              {client.urgency === 'critical'
                ? 'Overdue'
                : client.urgency === 'warning'
                  ? 'Due Soon'
                  : 'Pending'}
            </Badge>
          </div>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {client.taskDescription}
            {client.overduePercent > 0 && (
              <span className="text-destructive">
                {' '}
                &middot; -{client.overduePercent}% bonus
              </span>
            )}
          </p>
        </div>

        {/* Time remaining + actions */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {/* Process button */}
          <Button
            variant="outline"
            size="sm"
            className="h-6 gap-1 px-2 text-[10px]"
            onClick={() => onProcess(client.todoId)}
            disabled={isUploading}
            data-testid={`process-btn-${client.todoId}`}
          >
            {isUploadingThis ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            Process
          </Button>

          {/* Extend button */}
          {canExtend && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() => onExtend(client.todoId)}
              disabled={isExtendingThis}
              title={`${client.extensionsUsed}/${client.maxExtensions} extensions used`}
              data-testid={`extend-btn-${client.todoId}`}
            >
              {isExtendingThis ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CalendarPlus className="h-3 w-3" />
              )}
              +3d
            </Button>
          )}
          {isExtendingThis && !canExtend && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          )}

          {/* Time display */}
          <div className="w-10 text-right">
            {isOverdue ? (
              <>
                <p className="font-mono text-sm font-bold text-destructive">
                  {absDays}d
                </p>
                <p className="text-[9px] text-destructive">overdue</p>
              </>
            ) : client.daysRemaining === 99 ? (
              <>
                <p className="font-mono text-sm font-bold text-muted-foreground">
                  —
                </p>
                <p className="text-[9px] text-muted-foreground">no due</p>
              </>
            ) : (
              <>
                <p
                  className={cn(
                    'font-mono text-sm font-bold',
                    client.urgency === 'warning'
                      ? 'text-warning'
                      : 'text-muted-foreground',
                  )}
                >
                  {client.daysRemaining}d
                </p>
                <p className="text-[9px] text-muted-foreground">left</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Maintenance Panel

interface MaintenancePanelProps {
  clients: MaintenanceClient[]
  totalOverduePercent: number
  onProcess: (todoId: string) => void
  onExtend: (todoId: string) => void
  isUploading: boolean
  uploadingTodoId: string | null
  extendingTodoId: string | null
}

export function MaintenancePanel({
  clients,
  totalOverduePercent,
  onProcess,
  onExtend,
  isUploading,
  uploadingTodoId,
  extendingTodoId,
}: MaintenancePanelProps) {
  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card"
      data-testid="maintenance-panel"
    >
      {/* Header */}
      <div className="border-b border-border/40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              Maintenance Track
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted-foreground">
              {clients.length} task{clients.length !== 1 ? 's' : ''}
            </span>
            <span
              className={cn(
                'font-mono text-xs font-semibold',
                totalOverduePercent > 0 ? 'text-destructive' : 'text-success',
              )}
            >
              overdue {totalOverduePercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Cards — sorted by days remaining (most urgent first) */}
      <div className="max-h-[320px] space-y-2 overflow-y-auto p-3">
        {clients.length > 0 ? (
          [...clients]
            .sort((a, b) => a.daysRemaining - b.daysRemaining)
            .map((c) => (
              <ClientCard
                key={c.todoId}
                client={c}
                onProcess={onProcess}
                onExtend={onExtend}
                isUploading={isUploading}
                isUploadingThis={uploadingTodoId === c.todoId}
                isExtendingThis={extendingTodoId === c.todoId}
              />
            ))
        ) : (
          <div className="py-8 text-center">
            <ShieldCheck className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">
              No maintenance tasks
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
