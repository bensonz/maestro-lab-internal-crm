'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Hourglass,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Clock,
  FileText,
  FileCheck,
  Shield,
  ClipboardCheck,
  Mail,
  CreditCard,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { IntakeStatus } from '@/types'
import { cn } from '@/lib/utils'
import type { AgentClient, AgentDraft, VerificationSubCategory } from './types'

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

function formatDeadlineCountdown(isoString: string | null): string {
  if (!isoString) return ''
  const diff = new Date(isoString).getTime() - Date.now()
  if (diff <= 0) return 'overdue'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 24) return `${hours}h left`
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
  { key: 'step-4', label: 'Contract', stepNumber: 4, icon: ClipboardCheck, headerColor: 'text-primary' },
  { key: 'pending-approval', label: 'Pending Approval', stepNumber: 0, icon: Hourglass, headerColor: 'text-warning' },
]

/* ─── Verification sub-step definitions ─── */
interface VerificationStep {
  key: string
  label: string
  icon: React.ElementType
  headerColor: string
  categories: VerificationSubCategory[]
  defaultOpen: boolean
}

const verificationSteps: VerificationStep[] = [
  { key: 'action-required', label: 'Action Required', icon: Shield, headerColor: 'text-primary', categories: ['platform-verification', 'bank-visit'], defaultOpen: true },
  { key: 'awaiting-mail', label: 'Awaiting Mail', icon: Mail, headerColor: 'text-muted-foreground', categories: ['awaiting-mail'], defaultOpen: false },
]

/* ─── Non-in-progress status groups (excluding verification — it has its own section) ─── */
interface StatusGroup {
  key: string
  label: string
  statuses: IntakeStatus[]
  collapsedByDefault: boolean
}

const statusGroups: StatusGroup[] = [
  {
    key: 'approved',
    label: 'Approved',
    statuses: [IntakeStatus.APPROVED],
    collapsedByDefault: true,
  },
]

/* ─── Client row (generic fallback) ─── */
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

/* ─── Verification row — uniform grid across all sub-categories ─── */
function VerificationRow({ client }: { client: AgentClient }) {
  const badgeLabel = client.verificationPlatform || (
    client.verificationSubCategory === 'bank-visit' ? 'Bank' : 'Mail'
  )

  const badgeColor =
    client.verificationSubCategory === 'platform-verification'
      ? 'border-primary/30 bg-primary/10 text-primary'
      : client.verificationSubCategory === 'bank-visit'
        ? 'border-warning/30 bg-warning/10 text-warning'
        : 'border-border bg-muted/30 text-muted-foreground'

  const isOverdue = client.deadline
    ? new Date(client.deadline).getTime() < Date.now()
    : false

  const deadlineText = formatDeadlineCountdown(client.deadline)

  return (
    <div
      className="grid grid-cols-[minmax(100px,_1fr)_80px_1fr_auto] items-center gap-2 border-b border-border/50 bg-card/50 px-5 py-2"
      data-testid={`verify-row-${client.id}`}
    >
      {/* Name */}
      <span className="min-w-0 truncate text-sm font-medium text-foreground">
        {client.name}
      </span>

      {/* Badge — fixed-width column for alignment */}
      <Badge
        variant="outline"
        className={cn('w-fit text-[10px]', badgeColor)}
      >
        {badgeLabel}
      </Badge>

      {/* Task text — aligned across all rows */}
      <span className="min-w-0 truncate text-xs text-muted-foreground">
        {client.verificationTask}
      </span>

      {/* Deadline countdown — prominent */}
      <span className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-xs font-medium',
        isOverdue
          ? 'bg-destructive/10 text-destructive'
          : deadlineText.startsWith('0') || deadlineText.includes('h left')
            ? 'bg-warning/10 text-warning'
            : 'bg-muted/60 text-foreground/70',
      )}>
        <Clock className="h-3.5 w-3.5" />
        {deadlineText}
      </span>
    </div>
  )
}

/* ─── Approved client row — name + phone + age + state + zelle + duration + start ─── */
function ApprovedClientRow({ client }: { client: AgentClient }) {
  return (
    <Link href={`/agent/clients/${client.id}`}>
      <div
        className="group flex cursor-pointer items-center gap-3 border-b border-border/50 bg-card/50 px-5 py-1.5 transition-colors hover:bg-card"
        data-testid={`client-row-${client.id}`}
      >
        <span className="min-w-0 shrink-0 truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
          {client.name}
        </span>
        {client.phone && (
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{client.phone}</span>
        )}
        {client.age != null && (
          <span className="shrink-0 text-[11px] text-muted-foreground">{client.age}y</span>
        )}
        {client.state && (
          <span className="shrink-0 text-[11px] font-medium text-muted-foreground">{client.state}</span>
        )}
        {client.zelle && (
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{client.zelle}</span>
        )}
        {client.intakeDuration && (
          <span className="shrink-0 font-mono text-[11px] text-primary">{client.intakeDuration}</span>
        )}
        {client.startDate && (
          <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{client.startDate}</span>
        )}
      </div>
    </Link>
  )
}

/* ─── Draft row ─── */
function DraftRow({
  draft,
  onUploadCard,
}: {
  draft: AgentDraft
  onUploadCard?: (draftId: string, name: string) => void
}) {
  const progressPct = draft.innerStepTotal > 0
    ? Math.round((draft.innerStepCompleted / draft.innerStepTotal) * 100)
    : 0

  const isSubmitted = draft.status === 'SUBMITTED'

  return (
    <Link href={`/agent/new-client?draft=${draft.id}`}>
      <div
        className="group grid cursor-pointer grid-cols-[1fr_auto_140px_40px] items-center gap-3 border-b border-dashed border-border/50 bg-muted/20 px-5 py-2 transition-colors hover:bg-muted/40"
        data-testid={`draft-row-${draft.id}`}
      >
        {/* Name */}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
            {draft.name}
          </p>
        </div>

        {/* Column 2: Progress for steps 1-3, Upload Card button for submitted, nothing for step 4 */}
        <div className="flex items-center gap-2">
          {isSubmitted && onUploadCard ? (
            <Button
              size="sm"
              variant="outline"
              className="h-6 shrink-0 gap-1 px-2 text-[10px]"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onUploadCard(draft.id, draft.name)
              }}
              data-testid={`upload-card-${draft.id}`}
            >
              <CreditCard className="h-3 w-3" />
              Upload Card #
            </Button>
          ) : draft.innerStepTotal > 0 ? (
            <>
              <span className="font-mono text-xs text-muted-foreground">
                {draft.innerStepCompleted}/{draft.innerStepTotal}
              </span>
              <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/60 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </>
          ) : null}
        </div>

        {/* Timing */}
        <span className="font-mono text-xs text-muted-foreground">
          {formatRelativeTime(draft.updatedAt)}
        </span>

        {/* Arrow */}
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
  onUploadCard,
}: {
  step: InProgressStep
  drafts: AgentDraft[]
  onUploadCard?: (draftId: string, name: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const Icon = step.icon

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={drafts.length > 0 ? setIsOpen : undefined}
      data-testid={`substep-${step.key}`}
    >
      <CollapsibleTrigger asChild>
        <button className={cn(
          'flex w-full items-center justify-between border-b border-border/30 px-5 py-2.5 transition-colors',
          drafts.length > 0 ? 'hover:bg-muted/30' : 'opacity-50',
        )}>
          <div className="flex items-center gap-2.5">
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            {step.stepNumber > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded bg-muted px-1 text-[10px] font-bold text-muted-foreground">
                {step.stepNumber}
              </span>
            )}
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
            <DraftRow
              key={draft.id}
              draft={draft}
              onUploadCard={step.key === 'pending-approval' ? onUploadCard : undefined}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

/* ─── In Progress collapsible (parent with sub-steps) ─── */
function InProgressSection({
  drafts,
  onUploadCard,
}: {
  drafts: AgentDraft[]
  onUploadCard?: (draftId: string, name: string) => void
}) {
  const [isOpen, setIsOpen] = useState(true)

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
            isOpen && 'rounded-b-none border-b-0',
          )}
        >
          <div className="flex items-center gap-3">
            {isOpen ? (
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
      <CollapsibleContent>
        <div className="overflow-hidden rounded-b-lg border border-t-0 border-border/50 shadow-sm">
          {inProgressSteps.map((step) => {
            let stepDrafts: AgentDraft[]
            if (step.key === 'pending-approval') {
              // SUBMITTED drafts go to Pending Approval
              stepDrafts = drafts.filter((d) => d.status === 'SUBMITTED')
            } else if (step.key === 'step-4') {
              // Step 4 (Contract) only shows non-submitted drafts
              stepDrafts = drafts.filter((d) => d.step === 4 && d.status !== 'SUBMITTED')
            } else {
              stepDrafts = drafts.filter((d) => d.step === step.stepNumber && d.status !== 'SUBMITTED')
            }
            return (
              <SubStepSection
                key={step.key}
                step={step}
                drafts={stepDrafts}
                onUploadCard={onUploadCard}
              />
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

/* ─── Verification sub-step section (mirrors SubStepSection) ─── */
function VerificationSubStepSection({
  step,
  clients,
}: {
  step: VerificationStep
  clients: AgentClient[]
}) {
  const [isOpen, setIsOpen] = useState(step.defaultOpen && clients.length > 0)
  const Icon = step.icon

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={clients.length > 0 ? setIsOpen : undefined}
      data-testid={`verify-substep-${step.key}`}
    >
      <CollapsibleTrigger asChild>
        <button className={cn(
          'flex w-full items-center justify-between border-b border-border/30 px-5 py-2.5 transition-colors',
          clients.length > 0 ? 'hover:bg-muted/30' : 'opacity-50',
        )}>
          <div className="flex items-center gap-2.5">
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <Icon className={cn('h-3.5 w-3.5', step.headerColor)} />
            <span className={cn('text-xs font-medium', step.headerColor)}>
              {step.label}
            </span>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'h-5 px-1.5 font-mono text-[10px]',
              clients.length > 0 ? 'border-primary/30 bg-primary/5 text-primary' : '',
            )}
          >
            {clients.length}
          </Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-b border-border/20 bg-muted/10">
          {clients.map((client) => (
            <VerificationRow key={client.id} client={client} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

/* ─── Verification Needed collapsible (parent with sub-steps) ─── */
function VerificationSection({
  clients,
}: {
  clients: AgentClient[]
}) {
  const [isOpen, setIsOpen] = useState(clients.length > 0)

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={clients.length > 0 ? setIsOpen : undefined}
      className="mb-2"
      data-testid="group-verification-needed"
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
              Verification Needed
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
            {verificationSteps.map((step) => {
              const stepClients = clients.filter(
                (c) => c.verificationSubCategory != null && step.categories.includes(c.verificationSubCategory),
              )
              return (
                <VerificationSubStepSection
                  key={step.key}
                  step={step}
                  clients={stepClients}
                />
              )
            })}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}

/* ─── Collapsible status group (for Approved, etc.) ─── */
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
            {clients.map((client) =>
              group.key === 'approved' ? (
                <ApprovedClientRow key={client.id} client={client} />
              ) : (
                <ClientRow key={client.id} client={client} />
              ),
            )}
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
  onUploadCard?: (draftId: string, name: string) => void
}

export function ClientsGroupedList({ clients, drafts, onUploadCard }: ClientsGroupedListProps) {
  // Separate verification clients from the rest
  const verificationClients = clients.filter(
    (c) => c.verificationSubCategory != null,
  )
  const nonVerificationClients = clients.filter(
    (c) => c.verificationSubCategory == null,
  )

  return (
    <div className="space-y-1">
      {/* In Progress section (drafts only, with sub-steps) */}
      <InProgressSection drafts={drafts} onUploadCard={onUploadCard} />

      {/* Verification Needed section (with sub-categories) */}
      <VerificationSection clients={verificationClients} />

      {/* Other status groups (Approved, etc.) */}
      {statusGroups.map((group) => {
        const groupClients = nonVerificationClients.filter((c) =>
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
