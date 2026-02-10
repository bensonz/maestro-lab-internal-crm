'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Hourglass,
  ChevronDown,
  ChevronRight,
  ArrowRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { IntakeStatus } from '@/types'
import { cn } from '@/lib/utils'
import type { AgentClient } from './types'

/* ─── Status badge config ─── */
const statusBadgeConfig: Record<
  string,
  { icon: React.ElementType | null; className: string }
> = {
  [IntakeStatus.IN_EXECUTION]: {
    icon: Clock,
    className: 'bg-primary/20 text-primary border-primary/30',
  },
  [IntakeStatus.PHONE_ISSUED]: {
    icon: Clock,
    className: 'bg-primary/20 text-primary border-primary/30',
  },
  [IntakeStatus.NEEDS_MORE_INFO]: {
    icon: AlertCircle,
    className: 'bg-destructive/20 text-destructive border-destructive/30',
  },
  [IntakeStatus.PENDING_EXTERNAL]: {
    icon: AlertCircle,
    className: 'bg-destructive/20 text-destructive border-destructive/30',
  },
  [IntakeStatus.EXECUTION_DELAYED]: {
    icon: AlertCircle,
    className: 'bg-warning/20 text-warning border-warning/30',
  },
  [IntakeStatus.READY_FOR_APPROVAL]: {
    icon: Hourglass,
    className: 'bg-warning/20 text-warning border-warning/30',
  },
  [IntakeStatus.APPROVED]: {
    icon: CheckCircle2,
    className: 'bg-success/20 text-success border-success/30',
  },
  [IntakeStatus.REJECTED]: {
    icon: XCircle,
    className: 'bg-destructive/20 text-destructive border-destructive/30',
  },
  [IntakeStatus.PENDING]: {
    icon: Clock,
    className: 'bg-muted text-muted-foreground border-muted',
  },
  [IntakeStatus.INACTIVE]: {
    icon: null,
    className: 'bg-muted text-muted-foreground border-muted',
  },
  [IntakeStatus.PARTNERSHIP_ENDED]: {
    icon: null,
    className: 'bg-muted text-muted-foreground border-muted',
  },
}

/* ─── Status groups ─── */
interface StatusGroup {
  key: string
  label: string
  icon: React.ElementType
  headerColor: string
  statuses: IntakeStatus[]
  collapsedByDefault: boolean
}

const statusGroups: StatusGroup[] = [
  {
    key: 'in-progress',
    label: 'In Progress',
    icon: Clock,
    headerColor: 'text-primary',
    statuses: [IntakeStatus.PHONE_ISSUED, IntakeStatus.IN_EXECUTION],
    collapsedByDefault: false,
  },
  {
    key: 'verification-needed',
    label: 'Verification Needed',
    icon: AlertCircle,
    headerColor: 'text-destructive',
    statuses: [
      IntakeStatus.NEEDS_MORE_INFO,
      IntakeStatus.PENDING_EXTERNAL,
      IntakeStatus.EXECUTION_DELAYED,
    ],
    collapsedByDefault: false,
  },
  {
    key: 'pending-approval',
    label: 'Pending Approval',
    icon: Hourglass,
    headerColor: 'text-warning',
    statuses: [IntakeStatus.READY_FOR_APPROVAL],
    collapsedByDefault: false,
  },
  {
    key: 'approved',
    label: 'Approved',
    icon: CheckCircle2,
    headerColor: 'text-success',
    statuses: [IntakeStatus.APPROVED],
    collapsedByDefault: true,
  },
  {
    key: 'rejected',
    label: 'Rejected',
    icon: XCircle,
    headerColor: 'text-destructive',
    statuses: [IntakeStatus.REJECTED],
    collapsedByDefault: true,
  },
  {
    key: 'partnership-ended',
    label: 'Partnership Ended',
    icon: XCircle,
    headerColor: 'text-muted-foreground',
    statuses: [IntakeStatus.PARTNERSHIP_ENDED],
    collapsedByDefault: true,
  },
]

/* ─── Client row ─── */
function ClientRow({ client }: { client: AgentClient }) {
  const badge = statusBadgeConfig[client.intakeStatus] ?? {
    icon: null,
    className: 'bg-muted text-muted-foreground',
  }
  const BadgeIcon = badge.icon
  const isTerminal =
    client.intakeStatus === IntakeStatus.APPROVED ||
    client.intakeStatus === IntakeStatus.REJECTED

  return (
    <Link href={`/agent/clients/${client.id}`}>
      <div
        className={cn(
          'grid grid-cols-[1fr_120px_100px_140px_40px] items-center gap-4 border-b border-border/50 bg-card/50 px-4 py-3 transition-colors hover:bg-card',
          'cursor-pointer group',
          isTerminal && 'opacity-60',
        )}
        data-testid={`client-row-${client.id}`}
      >
        {/* Name + suggested action */}
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground transition-colors group-hover:text-primary">
            {client.name}
          </p>
          {client.nextTask && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              Next: {client.nextTask}
            </p>
          )}
        </div>

        {/* Status badge */}
        <div>
          <Badge
            variant="outline"
            className={cn('gap-1 text-[10px] font-medium', badge.className)}
          >
            {BadgeIcon && <BadgeIcon className="h-3 w-3" />}
            <span className="truncate">{client.status}</span>
          </Badge>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {client.phase != null ? `${client.phase}/4` : `${client.step}/${client.totalSteps}`}
          </span>
          {!isTerminal && client.phase == null && (
            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${client.progress}%` }}
              />
            </div>
          )}
          {!isTerminal && client.phase != null && (
            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(client.phase / 4) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Last updated */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="font-mono">{client.lastUpdated}</span>
        </div>

        {/* Arrow */}
        <div className="flex justify-end">
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
        </div>
      </div>
    </Link>
  )
}

/* ─── Collapsible status group ─── */
function GroupSection({
  group,
  clients,
}: {
  group: StatusGroup
  clients: AgentClient[]
}) {
  const [isOpen, setIsOpen] = useState(!group.collapsedByDefault)
  const Icon = group.icon

  if (clients.length === 0) return null

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="mb-2"
      data-testid={`group-${group.key}`}
    >
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'flex w-full items-center justify-between rounded-t-md bg-muted/50 px-4 py-2.5 transition-colors hover:bg-muted',
            !isOpen && 'rounded-b-md',
          )}
        >
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Icon className={cn('h-4 w-4', group.headerColor)} />
            <span className={cn('text-sm font-medium', group.headerColor)}>
              {group.label}
            </span>
          </div>
          <span className="rounded bg-background px-2 py-0.5 font-mono text-xs text-muted-foreground">
            {clients.length}
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="overflow-hidden rounded-b-md border border-t-0 border-border/50">
          {clients.map((client) => (
            <ClientRow key={client.id} client={client} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

/* ─── Phase groups for "In Progress" view ─── */
interface PhaseGroup {
  key: string
  label: string
  phase: number
  icon: React.ElementType
  headerColor: string
  collapsedByDefault: boolean
}

const phaseGroups: PhaseGroup[] = [
  {
    key: 'phase-1',
    label: 'Phase 1 (1/4)',
    phase: 1,
    icon: Clock,
    headerColor: 'text-muted-foreground',
    collapsedByDefault: false,
  },
  {
    key: 'phase-2',
    label: 'Phase 2 (2/4)',
    phase: 2,
    icon: Clock,
    headerColor: 'text-primary',
    collapsedByDefault: false,
  },
  {
    key: 'phase-3',
    label: 'Phase 3 (3/4)',
    phase: 3,
    icon: Clock,
    headerColor: 'text-primary',
    collapsedByDefault: false,
  },
  {
    key: 'phase-4',
    label: 'Phase 4 (4/4)',
    phase: 4,
    icon: Hourglass,
    headerColor: 'text-warning',
    collapsedByDefault: false,
  },
]

function PhaseGroupSection({
  group,
  clients,
}: {
  group: PhaseGroup
  clients: AgentClient[]
}) {
  const [isOpen, setIsOpen] = useState(!group.collapsedByDefault)
  const Icon = group.icon

  if (clients.length === 0) return null

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="mb-2"
      data-testid={`group-${group.key}`}
    >
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'flex w-full items-center justify-between rounded-t-md bg-muted/50 px-4 py-2.5 transition-colors hover:bg-muted',
            !isOpen && 'rounded-b-md',
          )}
        >
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Icon className={cn('h-4 w-4', group.headerColor)} />
            <span className={cn('text-sm font-medium', group.headerColor)}>
              {group.label}
            </span>
          </div>
          <span className="rounded bg-background px-2 py-0.5 font-mono text-xs text-muted-foreground">
            {clients.length}
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="overflow-hidden rounded-b-md border border-t-0 border-border/50">
          {clients.map((client) => (
            <ClientRow key={client.id} client={client} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

/* ─── Main export ─── */
interface ClientsGroupedListProps {
  clients: AgentClient[]
  activeFilter?: string | null
}

export function ClientsGroupedList({ clients, activeFilter }: ClientsGroupedListProps) {
  const hasClients = clients.length > 0

  if (!hasClients) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No clients found matching your criteria.
      </div>
    )
  }

  const usePhaseGroups = activeFilter === 'inProgress'

  return (
    <div className="space-y-1">
      {/* Table header */}
      <div className="mb-2 grid grid-cols-[1fr_120px_100px_140px_40px] gap-4 border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span>Client</span>
        <span>Status</span>
        <span>{usePhaseGroups ? 'Phase' : 'Step'}</span>
        <span>Last Updated</span>
        <span />
      </div>

      {usePhaseGroups ? (
        /* Phase-based groups when viewing In Progress */
        phaseGroups.map((group) => {
          const groupClients = clients.filter((c) => c.phase === group.phase)
          return (
            <PhaseGroupSection
              key={group.key}
              group={group}
              clients={groupClients}
            />
          )
        })
      ) : (
        /* Status groups (default) */
        statusGroups.map((group) => {
          const groupClients = clients.filter((c) =>
            group.statuses.includes(c.intakeStatus),
          )
          return (
            <GroupSection
              key={group.key}
              group={group}
              clients={groupClients}
            />
          )
        })
      )}
    </div>
  )
}
