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
  FileText,
  FileCheck,
  Shield,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { IntakeStatus } from '@/types'
import { cn } from '@/lib/utils'
import type { AgentClient, AgentDraft } from './types'

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

/* ─── In Progress sub-step definitions ─── */
interface InProgressStep {
  key: string
  label: string
  stepNumber: number
  stepLabel: string
  icon: React.ElementType
  headerColor: string
}

const inProgressSteps: InProgressStep[] = [
  { key: 'step-1', label: 'Pre-Qual', stepNumber: 1, stepLabel: '1', icon: FileText, headerColor: 'text-muted-foreground' },
  { key: 'step-2', label: 'Background', stepNumber: 2, stepLabel: '2', icon: FileCheck, headerColor: 'text-primary' },
  { key: 'step-3', label: 'Platforms', stepNumber: 3, stepLabel: '3', icon: Shield, headerColor: 'text-primary' },
  { key: 'step-4', label: 'Pending Approval', stepNumber: 4, stepLabel: '4', icon: Hourglass, headerColor: 'text-warning' },
]

/* ─── Non-in-progress status groups ─── */
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
            {client.step}/{client.totalSteps}
          </span>
          {!isTerminal && (
            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${client.progress}%` }}
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

/* ─── Draft row ─── */
function DraftRow({ draft }: { draft: AgentDraft }) {
  const progressPct = draft.innerStepTotal > 0
    ? Math.round((draft.innerStepCompleted / draft.innerStepTotal) * 100)
    : 0

  return (
    <Link href={`/agent/new-client?draft=${draft.id}`}>
      <div
        className="group grid cursor-pointer grid-cols-[1fr_100px_140px_40px] items-center gap-4 border-b border-dashed border-border/50 bg-muted/20 px-4 py-3 transition-colors hover:bg-muted/40"
        data-testid={`draft-row-${draft.id}`}
      >
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground transition-colors group-hover:text-primary">
            {draft.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            Draft — click to continue
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {draft.innerStepCompleted}/{draft.innerStepTotal}
          </span>
          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/60 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="font-mono">{draft.lastUpdated}</span>
        </div>
        <div className="flex justify-end">
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
        </div>
      </div>
    </Link>
  )
}

/* ─── Sub-step section within In Progress ─── */
function SubStepSection({
  step,
  drafts,
}: {
  step: InProgressStep
  drafts: AgentDraft[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const Icon = step.icon

  if (drafts.length === 0) return null

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      data-testid={`substep-${step.key}`}
    >
      <CollapsibleTrigger asChild>
        <button className="flex w-full items-center justify-between border-b border-border/30 px-5 py-2.5 transition-colors hover:bg-muted/30">
          <div className="flex items-center gap-2.5">
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="flex h-5 min-w-5 items-center justify-center rounded bg-muted px-1 text-[10px] font-bold text-muted-foreground">
              {step.stepLabel}
            </span>
            <Icon className={cn('h-3.5 w-3.5', step.headerColor)} />
            <span className={cn('text-xs font-medium', step.headerColor)}>
              {step.label}
            </span>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'h-5 px-1.5 font-mono text-[10px]',
              drafts.length > 0 ? 'border-primary/30 bg-primary/5 text-primary' : '',
            )}
          >
            {drafts.length}
          </Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-b border-border/20 bg-muted/10">
          {drafts.map((draft) => (
            <DraftRow key={draft.id} draft={draft} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

/* ─── In Progress collapsible (parent with sub-steps) ─── */
function InProgressSection({
  drafts,
}: {
  drafts: AgentDraft[]
}) {
  const [isOpen, setIsOpen] = useState(true)

  if (drafts.length === 0) return null

  // Count per sub-step for the collapsed summary
  const stepCounts = inProgressSteps.map((step) => ({
    ...step,
    count: drafts.filter((d) => d.step === step.stepNumber).length,
  }))

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="mb-2"
      data-testid="group-in-progress"
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
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              In Progress
            </span>
            {/* Sub-step summary chips when collapsed */}
            {!isOpen && (
              <div className="ml-1 flex items-center gap-1.5">
                {stepCounts.map((s) => {
                  if (s.count === 0) return null
                  return (
                    <span
                      key={s.key}
                      className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      title={s.label}
                    >
                      {s.stepLabel} {s.count}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
          <span className="rounded bg-background px-2 py-0.5 font-mono text-xs text-muted-foreground">
            {drafts.length}
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="overflow-hidden rounded-b-md border border-t-0 border-border/50">
          {inProgressSteps.map((step) => {
            const stepDrafts = drafts.filter((d) => d.step === step.stepNumber)
            return (
              <SubStepSection
                key={step.key}
                step={step}
                drafts={stepDrafts}
              />
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
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

/* ─── Main export ─── */
interface ClientsGroupedListProps {
  clients: AgentClient[]
  drafts: AgentDraft[]
}

export function ClientsGroupedList({ clients, drafts }: ClientsGroupedListProps) {
  const hasContent = clients.length > 0 || drafts.length > 0

  if (!hasContent) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No clients found matching your criteria.
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* Table header */}
      <div className="mb-2 grid grid-cols-[1fr_120px_100px_140px_40px] gap-4 border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span>Client</span>
        <span>Status</span>
        <span>Progress</span>
        <span>Last Updated</span>
        <span />
      </div>

      {/* In Progress section (drafts only, with sub-steps) */}
      <InProgressSection drafts={drafts} />

      {/* Other status groups (Verification, Approved, Rejected, etc.) */}
      {statusGroups.map((group) => {
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
      })}
    </div>
  )
}
