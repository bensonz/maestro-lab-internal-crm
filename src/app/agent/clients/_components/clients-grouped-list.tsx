'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
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

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  if (diff < 0) return '0m'
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days}d${remainingHours}h` : `${days}d`
}

/* ─── In Progress sub-step definitions ─── */
interface InProgressStep {
  key: string
  label: string
  stepNumber: number
  icon: React.ElementType
  headerColor: string
}

const inProgressSteps: InProgressStep[] = [
  { key: 'step-1', label: 'Pre-Qual', stepNumber: 1, icon: FileText, headerColor: 'text-muted-foreground' },
  { key: 'step-2', label: 'Background', stepNumber: 2, icon: FileCheck, headerColor: 'text-primary' },
  { key: 'step-3', label: 'Platforms', stepNumber: 3, icon: Shield, headerColor: 'text-primary' },
  { key: 'step-4', label: 'Pending Approval', stepNumber: 4, icon: Hourglass, headerColor: 'text-warning' },
]

/* ─── Non-in-progress status groups ─── */
interface StatusGroup {
  key: string
  label: string
  statuses: IntakeStatus[]
  collapsedByDefault: boolean
}

const statusGroups: StatusGroup[] = [
  {
    key: 'verification-needed',
    label: 'Verification Needed',
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
    statuses: [IntakeStatus.APPROVED],
    collapsedByDefault: true,
  },
]

/* ─── Client row ─── */
function ClientRow({ client }: { client: AgentClient }) {
  const isTerminal =
    client.intakeStatus === IntakeStatus.APPROVED ||
    client.intakeStatus === IntakeStatus.REJECTED

  return (
    <Link href={`/agent/clients/${client.id}`}>
      <div
        className={cn(
          'grid grid-cols-[1fr_100px_140px_40px] items-center gap-3 border-b border-border/50 bg-card/50 px-5 py-2 transition-colors hover:bg-card',
          'cursor-pointer group',
          isTerminal && 'opacity-60',
        )}
        data-testid={`client-row-${client.id}`}
      >
        {/* Name + suggested action */}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
            {client.name}
          </p>
          {client.nextTask && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              Next: {client.nextTask}
            </p>
          )}
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
        <span className="font-mono text-xs text-muted-foreground">
          {formatRelativeTime(client.updatedAt)}
        </span>

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
        className="group grid cursor-pointer grid-cols-[1fr_100px_140px_40px] items-center gap-3 border-b border-dashed border-border/50 bg-muted/20 px-5 py-2 transition-colors hover:bg-muted/40"
        data-testid={`draft-row-${draft.id}`}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
            {draft.name}
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
        <span className="font-mono text-xs text-muted-foreground">
          {formatRelativeTime(draft.updatedAt)}
        </span>
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
              {step.stepNumber}
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
  const [isOpen, setIsOpen] = useState(drafts.length > 0)

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
            'flex w-full items-center justify-between rounded-lg border border-border/50 bg-card px-4 py-3 shadow-sm transition-colors hover:bg-accent/5',
            isOpen && drafts.length > 0 && 'rounded-b-none border-b-0',
          )}
        >
          <div className="flex items-center gap-3">
            {isOpen && drafts.length > 0 ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-semibold text-foreground">
              In Progress
            </span>
          </div>
          <Badge
            variant="outline"
            className="h-6 border-primary/30 bg-primary/10 px-2.5 font-mono text-xs font-semibold text-primary"
          >
            {drafts.length}
          </Badge>
        </button>
      </CollapsibleTrigger>
      {drafts.length > 0 && (
        <CollapsibleContent>
          <div className="overflow-hidden rounded-b-lg border border-t-0 border-border/50 shadow-sm">
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
      )}
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
  const [isOpen, setIsOpen] = useState(!group.collapsedByDefault && clients.length > 0)

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={clients.length > 0 ? setIsOpen : undefined}
      className="mb-2"
      data-testid={`group-${group.key}`}
    >
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'flex w-full items-center justify-between rounded-lg border border-border/50 bg-card px-4 py-3 shadow-sm transition-colors',
            clients.length > 0 && 'hover:bg-accent/5',
            isOpen && clients.length > 0 && 'rounded-b-none border-b-0',
            clients.length === 0 && 'opacity-60',
          )}
        >
          <div className="flex items-center gap-3">
            {isOpen && clients.length > 0 ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-semibold text-foreground">
              {group.label}
            </span>
          </div>
          <Badge
            variant="outline"
            className="h-6 border-primary/30 bg-primary/10 px-2.5 font-mono text-xs font-semibold text-primary"
          >
            {clients.length}
          </Badge>
        </button>
      </CollapsibleTrigger>
      {clients.length > 0 && (
        <CollapsibleContent>
          <div className="overflow-hidden rounded-b-lg border border-t-0 border-border/50 shadow-sm">
            {clients.map((client) => (
              <ClientRow key={client.id} client={client} />
            ))}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}

/* ─── Main export ─── */
interface ClientsGroupedListProps {
  clients: AgentClient[]
  drafts: AgentDraft[]
}

export function ClientsGroupedList({ clients, drafts }: ClientsGroupedListProps) {
  return (
    <div className="space-y-1">
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
