'use client'

import Link from 'next/link'
import {
  Clock,
  Shield,
  Mail,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { IntakeStatus } from '@/types'
import { cn } from '@/lib/utils'
import { DeadlineCountdown } from '@/components/deadline-countdown'
import type { AgentClient, AgentDraft, VerificationSubCategory } from './types'

const STEP_LABELS: Record<number, string> = {
  1: 'Pre-Qual',
  2: 'Background',
  3: 'Platforms',
  4: 'Contract',
}

/* ─── Verification sub-groups for card view ─── */
const verificationSubGroups: {
  key: string
  label: string
  icon: React.ElementType
  borderColor: string
  categories: VerificationSubCategory[]
}[] = [
  { key: 'action-required', label: 'Action Required', icon: Shield, borderColor: 'border-l-primary', categories: ['platform-verification', 'bank-visit'] },
  { key: 'awaiting-mail', label: 'Awaiting Mail', icon: Mail, borderColor: 'border-l-muted-foreground', categories: ['awaiting-mail'] },
]

/* ─── Approved group ─── */
const approvedGroup = {
  key: 'approved',
  label: 'Approved',
  statuses: [IntakeStatus.APPROVED],
}

const STATUS_BORDER_COLOR: Record<string, string> = {
  [IntakeStatus.IN_EXECUTION]: 'border-l-primary',
  [IntakeStatus.PHONE_ISSUED]: 'border-l-primary',
  [IntakeStatus.NEEDS_MORE_INFO]: 'border-l-destructive',
  [IntakeStatus.PENDING_EXTERNAL]: 'border-l-destructive',
  [IntakeStatus.EXECUTION_DELAYED]: 'border-l-warning',
  [IntakeStatus.READY_FOR_APPROVAL]: 'border-l-warning',
  [IntakeStatus.PENDING]: 'border-l-muted-foreground',
  [IntakeStatus.INACTIVE]: 'border-l-muted-foreground',
  [IntakeStatus.APPROVED]: 'border-l-success',
  [IntakeStatus.REJECTED]: 'border-l-destructive',
  [IntakeStatus.PARTNERSHIP_ENDED]: 'border-l-muted-foreground',
}

interface ClientsCardViewProps {
  clients: AgentClient[]
  drafts: AgentDraft[]
}

export function ClientsCardView({ clients, drafts }: ClientsCardViewProps) {
  // Separate verification clients from regular clients
  const verificationClients = clients.filter((c) => c.verificationSubCategory != null)
  const approvedClients = clients.filter(
    (c) => c.verificationSubCategory == null && (approvedGroup.statuses as readonly string[]).includes(c.intakeStatus),
  )

  return (
    <div className="space-y-6">
      {/* In Progress section (drafts) */}
      <div className={cn(drafts.length === 0 && 'opacity-60')}>
        <div className="mb-3 flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">In Progress</span>
          <Badge
            variant="outline"
            className="h-6 border-primary/30 bg-primary/10 px-2.5 font-mono text-xs font-semibold text-primary"
          >
            {drafts.length}
          </Badge>
        </div>
        {drafts.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {drafts.map((draft) => {
              const progressPct = draft.innerStepTotal > 0
                ? Math.round((draft.innerStepCompleted / draft.innerStepTotal) * 100)
                : 0

              return (
                <Link key={draft.id} href={`/agent/new-client?draft=${draft.id}`}>
                  <Card
                    className="group h-full cursor-pointer border-l-2 border-dashed border-border/50 border-l-muted-foreground bg-muted/20 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
                    data-testid={`draft-card-${draft.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground transition-colors group-hover:text-primary">
                            {draft.name}
                          </p>
                        </div>
                        <Badge variant="outline" className="ml-2 shrink-0 gap-1 border-dashed text-[10px] font-medium text-muted-foreground">
                          Step {draft.step}: {STEP_LABELS[draft.step] || ''}
                        </Badge>
                      </div>
                      <div className="mb-3">
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {draft.innerStepCompleted}/{draft.innerStepTotal} completed
                          </span>
                          <span className="font-mono text-primary/60">
                            {progressPct}%
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary/60 transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-border/40 pt-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Updated {draft.lastUpdated}</span>
                        </div>
                        <span className="text-xs text-muted-foreground transition-colors group-hover:text-primary">
                          Continue →
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Verification Needed — sub-grouped by category */}
      <div className={cn(verificationClients.length === 0 && 'opacity-60')}>
        <div className="mb-3 flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">Verification Needed</span>
          <Badge
            variant="outline"
            className="h-6 border-primary/30 bg-primary/10 px-2.5 font-mono text-xs font-semibold text-primary"
          >
            {verificationClients.length}
          </Badge>
        </div>
        {verificationClients.length > 0 && (
          <div className="space-y-4">
            {verificationSubGroups.map((subGroup) => {
              const subClients = verificationClients.filter(
                (c) => c.verificationSubCategory != null && subGroup.categories.includes(c.verificationSubCategory),
              )
              if (subClients.length === 0) return null
              const SubIcon = subGroup.icon

              return (
                <div key={subGroup.key}>
                  <div className="mb-2 flex items-center gap-2">
                    <SubIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {subGroup.label}
                    </span>
                    <Badge variant="outline" className="h-5 px-1.5 font-mono text-[10px]">
                      {subClients.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {subClients.map((client) => (
                      <Card
                        key={client.id}
                        className={cn(
                          'h-full border-l-2 border-border/50 bg-card/80 backdrop-blur-sm',
                          subGroup.borderColor,
                        )}
                        data-testid={`verify-card-${client.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="mb-3">
                            <p className="truncate font-medium text-foreground">
                              {client.name}
                            </p>
                          </div>
                          {client.verificationPlatform && (
                            <div className="mb-3">
                              <Badge
                                variant="outline"
                                className="border-primary/30 bg-primary/10 text-[10px] text-primary"
                              >
                                {client.verificationPlatform}
                              </Badge>
                            </div>
                          )}
                          <p className="mb-3 text-xs text-muted-foreground">
                            {client.verificationTask}
                          </p>
                          {client.deadline && (
                            <div className="mb-3">
                              <DeadlineCountdown
                                deadline={client.deadline}
                                variant="badge"
                              />
                            </div>
                          )}
                          <div className="flex items-center border-t border-border/40 pt-3">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span>Updated {client.lastUpdated}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Approved group */}
      <div className={cn(approvedClients.length === 0 && 'opacity-60')}>
        <div className="mb-3 flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">Approved</span>
          <Badge
            variant="outline"
            className="h-6 border-primary/30 bg-primary/10 px-2.5 font-mono text-xs font-semibold text-primary"
          >
            {approvedClients.length}
          </Badge>
        </div>
        {approvedClients.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {approvedClients.map((client) => (
              <Link key={client.id} href={`/agent/clients/${client.id}`}>
                <Card
                  className={cn(
                    'group h-full cursor-pointer border-l-2 border-border/50 bg-card/80 opacity-60 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10',
                    STATUS_BORDER_COLOR[client.intakeStatus] || 'border-l-muted-foreground',
                  )}
                  data-testid={`client-card-${client.id}`}
                >
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground transition-colors group-hover:text-primary">
                          {client.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-border/40 pt-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Updated {client.lastUpdated}</span>
                      </div>
                      <span className="text-xs text-muted-foreground transition-colors group-hover:text-primary">
                        View →
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
