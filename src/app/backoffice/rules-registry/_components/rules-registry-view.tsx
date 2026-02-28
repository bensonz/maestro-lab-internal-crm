'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  AlertTriangle,
  AlertCircle,
  Info,
  Bell,
  ChevronDown,
  ChevronRight,
  Smartphone,
  FileText,
  CheckCircle2,
  Clock,
  Shield,
  Eye,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

// ── Rule definitions ────────────────────────────────────

type RulePriority = 'urgent' | 'warning' | 'info'
type RuleOwner = 'agent' | 'backoffice' | 'both'
type RuleType = 'computed' | 'event-driven'
type DataSource = 'real' | 'mock' | 'planned'

interface TodoRule {
  id: string
  title: string
  trigger: string
  owner: RuleOwner
  priority: RulePriority
  type: RuleType
  dataSource: DataSource
  agentMessage: string | null
  backofficeMessage: string | null
  sourcePage: string
  action: string
  notes: string
  category: string
}

const RULES: TodoRule[] = [
  {
    id: 'DEVICE_ASSIGNED',
    title: 'Device Assigned',
    trigger: 'Fires immediately when assignAndSignOutDevice() server action succeeds',
    owner: 'agent',
    priority: 'urgent',
    type: 'event-driven',
    dataSource: 'real',
    agentMessage: 'A device has been assigned for {clientName} — come pick it up. Due back in 3 days.',
    backofficeMessage: null,
    sourcePage: 'Sales Interaction (In Progress)',
    action: 'Link to /agent/new-client?draft={draftId} (Step 3 unlocked)',
    notes: 'Push notification, not computed. Agent needs to physically pick up the device.',
    category: 'Device Lifecycle',
  },
  {
    id: 'DEVICE_OVERDUE',
    title: 'Device Overdue',
    trigger: 'PhoneAssignment where status = SIGNED_OUT AND dueBackAt < now()',
    owner: 'both',
    priority: 'urgent',
    type: 'computed',
    dataSource: 'real',
    agentMessage: 'Device #{phoneNumber} is overdue — return it or contact your supervisor',
    backofficeMessage: 'Device #{phoneNumber} overdue for {agentName} — follow up with agent',
    sourcePage: 'Sales Interaction (In Progress)',
    action: 'Agent: /agent/clients | Backoffice: Sales Interaction row',
    notes: 'dueBackAt is set to 3 days after sign-out. OVERDUE computed at view time.',
    category: 'Device Lifecycle',
  },
  {
    id: 'DEVICE_PENDING_ASSIGN',
    title: 'Device Pending Assignment',
    trigger: 'ClientDraft where deviceReservationDate IS NOT NULL AND no PhoneAssignment exists',
    owner: 'backoffice',
    priority: 'warning',
    type: 'computed',
    dataSource: 'real',
    agentMessage: null,
    backofficeMessage: 'Device requested for {clientName} (agent: {agentName}) — assign a device so agent can proceed to Step 3',
    sourcePage: 'Sales Interaction (In Progress, Step 2)',
    action: 'Open Device Assign dialog on Sales Interaction page',
    notes: 'Agent is blocked on Step 2 until backoffice assigns.',
    category: 'Device Lifecycle',
  },
  {
    id: 'PHONE_ISSUED_NO_PROGRESS',
    title: 'Phone Issued, No Progress',
    trigger: 'PhoneAssignment where status = SIGNED_OUT AND draft.step = 3 AND platformProgress = 0 AND signedOutAt < now() - 2 days',
    owner: 'both',
    priority: 'warning',
    type: 'computed',
    dataSource: 'real',
    agentMessage: 'Device issued {days} days ago for {clientName} but no platforms registered yet — start registrations',
    backofficeMessage: 'Device issued {days} days ago for {clientName} ({agentName}) with 0 platform progress — follow up',
    sourcePage: 'Sales Interaction (In Progress, Step 3)',
    action: 'Agent: /agent/new-client?draft={draftId} | Backoffice: Sales Interaction row',
    notes: 'Fires before DEVICE_OVERDUE as an early warning (2 days vs 3 days).',
    category: 'Device Lifecycle',
  },
  {
    id: 'DRAFT_STALE',
    title: 'Stale Draft',
    trigger: 'ClientDraft where status = DRAFT AND updatedAt < now() - 7 days',
    owner: 'both',
    priority: 'warning',
    type: 'computed',
    dataSource: 'real',
    agentMessage: "Draft for {clientName} hasn't been updated in {days} days — continue or delete it",
    backofficeMessage: 'Draft for {clientName} by {agentName} stale for {days} days — follow up with agent',
    sourcePage: 'Sales Interaction (In Progress, all steps)',
    action: 'Agent: /agent/new-client?draft={draftId} | Backoffice: Sales Interaction row',
    notes: 'Threshold: 7 days. Escalates to urgent at 14 days.',
    category: 'Draft Progress',
  },
  {
    id: 'STEP4_AWAITING_APPROVAL',
    title: 'Awaiting Approval',
    trigger: 'ClientDraft where status = SUBMITTED AND linked Client.status = PENDING',
    owner: 'backoffice',
    priority: 'warning',
    type: 'computed',
    dataSource: 'real',
    agentMessage: null,
    backofficeMessage: 'Client {clientName} submitted by {agentName} — review and approve',
    sourcePage: 'Sales Interaction (In Progress, Step 4)',
    action: 'Open Review dialog → Approve Client',
    notes: 'Primary backoffice workflow action. Shows as step-4 with resultClientId set.',
    category: 'Draft Progress',
  },
  {
    id: 'STEP4_LONG_WAIT',
    title: 'Approval Long Wait',
    trigger: 'ClientDraft where status = SUBMITTED AND Client.status = PENDING AND updatedAt < now() - 3 days',
    owner: 'both',
    priority: 'urgent',
    type: 'computed',
    dataSource: 'real',
    agentMessage: 'Your client {clientName} has been waiting for approval for {days} days',
    backofficeMessage: 'Client {clientName} by {agentName} waiting {days} days for approval — escalate or approve',
    sourcePage: 'Sales Interaction (In Progress, Step 4)',
    action: 'Backoffice: Review dialog → Approve | Agent: informational',
    notes: 'Escalation of STEP4_AWAITING_APPROVAL. 3-day threshold.',
    category: 'Draft Progress',
  },
  {
    id: 'VERIFICATION_TASK_PENDING',
    title: 'Verification Task Pending',
    trigger: 'VerificationTask where status = Pending',
    owner: 'both',
    priority: 'warning',
    type: 'computed',
    dataSource: 'mock',
    agentMessage: '{task} needed for {clientName} on {platformLabel}',
    backofficeMessage: '{task} pending for {clientName} ({agentName}) on {platformLabel}',
    sourcePage: 'Sales Interaction (Verification Needed)',
    action: 'Agent: upload page | Backoffice: Document Review modal',
    notes: 'Currently mock data. Will need a real VerificationTask model.',
    category: 'Verification',
  },
  {
    id: 'VERIFICATION_DEADLINE_APPROACHING',
    title: 'Verification Deadline Approaching',
    trigger: 'VerificationTask where status = Pending AND deadline < now() + 2 days',
    owner: 'both',
    priority: 'urgent',
    type: 'computed',
    dataSource: 'mock',
    agentMessage: 'Deadline approaching: {task} for {clientName} on {platformLabel} due {deadlineLabel}',
    backofficeMessage: 'Deadline approaching: {task} for {clientName} ({agentName}) on {platformLabel} due {deadlineLabel}',
    sourcePage: 'Sales Interaction (Verification Needed)',
    action: 'Agent: upload page | Backoffice: Document Review modal',
    notes: 'Fires within 2 days of deadline. Supersedes VERIFICATION_TASK_PENDING.',
    category: 'Verification',
  },
  {
    id: 'POST_APPROVAL_LIMITED',
    title: 'Post-Approval Limited Platforms',
    trigger: 'Approved Client with one or more platforms in LIMITED status',
    owner: 'both',
    priority: 'info',
    type: 'computed',
    dataSource: 'mock',
    agentMessage: '{clientName} has {count} LIMITED platform(s): {platformNames} — follow up',
    backofficeMessage: '{clientName} ({agentName}) has {count} LIMITED platform(s): {platformNames}',
    sourcePage: 'Sales Interaction (Verification Needed → Post-Approval)',
    action: 'Agent: client detail | Backoffice: Client Management detail',
    notes: 'Currently mock data. Will need platform status tracking on approved clients.',
    category: 'Verification',
  },
]

// ── Helpers ─────────────────────────────────────────────

const priorityConfig: Record<RulePriority, { label: string; icon: typeof AlertTriangle; className: string; badgeClass: string }> = {
  urgent: {
    label: 'Urgent',
    icon: AlertTriangle,
    className: 'text-destructive',
    badgeClass: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
  warning: {
    label: 'Warning',
    icon: AlertCircle,
    className: 'text-warning',
    badgeClass: 'border-warning/30 bg-warning/10 text-warning',
  },
  info: {
    label: 'Info',
    icon: Info,
    className: 'text-primary',
    badgeClass: 'border-primary/30 bg-primary/10 text-primary',
  },
}

const ownerConfig: Record<RuleOwner, { label: string; badgeClass: string }> = {
  agent: { label: 'Agent', badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' },
  backoffice: { label: 'Backoffice', badgeClass: 'border-blue-500/30 bg-blue-500/10 text-blue-500' },
  both: { label: 'Both', badgeClass: 'border-purple-500/30 bg-purple-500/10 text-purple-500' },
}

const dataSourceConfig: Record<DataSource, { label: string; badgeClass: string }> = {
  real: { label: 'Live', badgeClass: 'border-success/30 bg-success/10 text-success' },
  mock: { label: 'Mock', badgeClass: 'border-warning/30 bg-warning/10 text-warning' },
  planned: { label: 'Planned', badgeClass: 'border-muted-foreground/30 bg-muted/50 text-muted-foreground' },
}

const categoryConfig: Record<string, { icon: typeof Smartphone }> = {
  'Device Lifecycle': { icon: Smartphone },
  'Draft Progress': { icon: FileText },
  'Verification': { icon: Shield },
}

// ── Filters ─────────────────────────────────────────────

type FilterKey = 'all' | 'urgent' | 'warning' | 'info' | 'agent' | 'backoffice' | 'both' | 'real' | 'mock'

// ── Pages reviewed checklist ────────────────────────────

interface PageAudit {
  name: string
  route: string
  reviewed: boolean
  ruleIds: string[]
}

const PAGES_AUDIT: PageAudit[] = [
  { name: 'Agent Dashboard', route: '/agent', reviewed: false, ruleIds: [] },
  { name: 'Agent Clients', route: '/agent/clients', reviewed: false, ruleIds: [] },
  { name: 'Agent New Client', route: '/agent/new-client', reviewed: false, ruleIds: [] },
  { name: 'Agent Earnings', route: '/agent/earnings', reviewed: false, ruleIds: [] },
  { name: 'Agent Team', route: '/agent/team', reviewed: false, ruleIds: [] },
  { name: 'Agent Settings', route: '/agent/settings', reviewed: false, ruleIds: [] },
  { name: 'Backoffice Overview', route: '/backoffice', reviewed: false, ruleIds: [] },
  { name: 'Backoffice Agent Management', route: '/backoffice/agent-management', reviewed: false, ruleIds: [] },
  {
    name: 'Backoffice Sales Interaction',
    route: '/backoffice/sales-interaction',
    reviewed: true,
    ruleIds: [
      'DEVICE_ASSIGNED', 'DEVICE_OVERDUE', 'DEVICE_PENDING_ASSIGN', 'DRAFT_STALE',
      'STEP4_AWAITING_APPROVAL', 'STEP4_LONG_WAIT', 'VERIFICATION_TASK_PENDING',
      'VERIFICATION_DEADLINE_APPROACHING', 'POST_APPROVAL_LIMITED', 'PHONE_ISSUED_NO_PROGRESS',
    ],
  },
  { name: 'Backoffice Client Management', route: '/backoffice/client-management', reviewed: false, ruleIds: [] },
  { name: 'Backoffice Commissions', route: '/backoffice/commissions', reviewed: false, ruleIds: [] },
  { name: 'Backoffice Settlements', route: '/backoffice/client-settlement', reviewed: false, ruleIds: [] },
  { name: 'Backoffice Phone Tracking', route: '/backoffice/phone-tracking', reviewed: false, ruleIds: [] },
  { name: 'Backoffice Fund Allocation', route: '/backoffice/fund-allocation', reviewed: false, ruleIds: [] },
  { name: 'Backoffice Reports', route: '/backoffice/reports', reviewed: false, ruleIds: [] },
  { name: 'Backoffice Login Management', route: '/backoffice/login-management', reviewed: false, ruleIds: [] },
  { name: 'Backoffice Action Hub', route: '/backoffice/todo-list', reviewed: false, ruleIds: [] },
]

// ── Component ───────────────────────────────────────────

export function RulesRegistryView() {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set())
  const [showAudit, setShowAudit] = useState(false)

  const toggleRule = (id: string) => {
    setExpandedRules((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredRules = useMemo(() => {
    let result = RULES

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.trigger.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.notes.toLowerCase().includes(q),
      )
    }

    if (activeFilter !== 'all') {
      result = result.filter((r) => {
        if (activeFilter === 'urgent' || activeFilter === 'warning' || activeFilter === 'info') return r.priority === activeFilter
        if (activeFilter === 'agent' || activeFilter === 'backoffice' || activeFilter === 'both') return r.owner === activeFilter
        if (activeFilter === 'real' || activeFilter === 'mock') return r.dataSource === activeFilter
        return true
      })
    }

    return result
  }, [search, activeFilter])

  // Group by category
  const grouped = useMemo(() => {
    const groups = new Map<string, TodoRule[]>()
    for (const rule of filteredRules) {
      if (!groups.has(rule.category)) groups.set(rule.category, [])
      groups.get(rule.category)!.push(rule)
    }
    return [...groups.entries()]
  }, [filteredRules])

  // Stats
  const stats = {
    total: RULES.length,
    urgent: RULES.filter((r) => r.priority === 'urgent').length,
    warning: RULES.filter((r) => r.priority === 'warning').length,
    info: RULES.filter((r) => r.priority === 'info').length,
    live: RULES.filter((r) => r.dataSource === 'real').length,
    mock: RULES.filter((r) => r.dataSource === 'mock').length,
    pagesReviewed: PAGES_AUDIT.filter((p) => p.reviewed).length,
    pagesTotal: PAGES_AUDIT.length,
  }

  return (
    <div className="space-y-6 p-6 animate-fade-in" data-testid="rules-registry-view">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Rules Registry</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All computed todo rules that generate notifications and action items across the CRM.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="card-terminal">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Rules</p>
                <p className="mt-1 font-mono text-2xl font-semibold">{stats.total}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-terminal">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Urgent</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-destructive">{stats.urgent}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-terminal">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Live Data</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-success">{stats.live}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/20">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-terminal">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Pages Reviewed</p>
                <p className="mt-1 font-mono text-2xl font-semibold">
                  {stats.pagesReviewed}<span className="text-sm text-muted-foreground">/{stats.pagesTotal}</span>
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/20">
                <Eye className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search rules..."
            className="border-border bg-card pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="rules-search"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { key: 'all' as FilterKey, label: 'All', count: stats.total },
            { key: 'urgent' as FilterKey, label: 'Urgent', count: stats.urgent },
            { key: 'warning' as FilterKey, label: 'Warning', count: stats.warning },
            { key: 'info' as FilterKey, label: 'Info', count: stats.info },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(activeFilter === f.key ? 'all' : f.key)}
              className={cn(
                'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                activeFilter === f.key
                  ? f.key === 'urgent'
                    ? 'border-destructive/30 bg-destructive/10 text-destructive'
                    : f.key === 'warning'
                      ? 'border-warning/30 bg-warning/10 text-warning'
                      : f.key === 'info'
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted/50',
              )}
              data-testid={`filter-${f.key}`}
            >
              {f.label}
              <span className="font-mono text-[10px]">{f.count}</span>
            </button>
          ))}

          <span className="mx-1 self-center text-border">|</span>

          {[
            { key: 'real' as FilterKey, label: 'Live', count: stats.live },
            { key: 'mock' as FilterKey, label: 'Mock', count: stats.mock },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(activeFilter === f.key ? 'all' : f.key)}
              className={cn(
                'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                activeFilter === f.key
                  ? f.key === 'real'
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-warning/30 bg-warning/10 text-warning'
                  : 'border-border text-muted-foreground hover:bg-muted/50',
              )}
              data-testid={`filter-${f.key}`}
            >
              {f.label}
              <span className="font-mono text-[10px]">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Rules by Category */}
      <div className="space-y-4">
        {grouped.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No rules match your search.</p>
        ) : (
          grouped.map(([category, rules]) => {
            const catConfig = categoryConfig[category] ?? { icon: FileText }
            const CatIcon = catConfig.icon

            return (
              <div key={category} data-testid={`category-${category}`}>
                <div className="mb-2 flex items-center gap-2">
                  <CatIcon className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">{category}</h2>
                  <Badge variant="outline" className="h-5 px-1.5 font-mono text-[10px]">
                    {rules.length}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  {rules.map((rule) => (
                    <RuleRow
                      key={rule.id}
                      rule={rule}
                      expanded={expandedRules.has(rule.id)}
                      onToggle={() => toggleRule(rule.id)}
                    />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pages Audit Section */}
      <Collapsible open={showAudit} onOpenChange={setShowAudit}>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-card px-4 py-3 shadow-sm transition-colors hover:bg-accent/5">
            <div className="flex items-center gap-2">
              {showAudit ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <span className="text-sm font-semibold">Pages Audit</span>
              <span className="text-xs text-muted-foreground">
                {stats.pagesReviewed}/{stats.pagesTotal} reviewed
              </span>
            </div>
            <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(stats.pagesReviewed / stats.pagesTotal) * 100}%` }}
              />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-1 overflow-hidden rounded-b-lg border border-t-0 border-border/50 shadow-sm">
            <div className="divide-y divide-border/20">
              {PAGES_AUDIT.map((page) => (
                <div
                  key={page.route}
                  className="flex items-center justify-between px-4 py-2.5"
                  data-testid={`audit-page-${page.route}`}
                >
                  <div className="flex items-center gap-2.5">
                    {page.reviewed ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    <span className={cn('text-sm', page.reviewed ? 'font-medium' : 'text-muted-foreground')}>
                      {page.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{page.route}</span>
                  </div>
                  {page.ruleIds.length > 0 && (
                    <Badge variant="outline" className="h-5 px-1.5 font-mono text-[10px]">
                      {page.ruleIds.length} rules
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

// ── Rule Row Component ──────────────────────────────────

function RuleRow({ rule, expanded, onToggle }: { rule: TodoRule; expanded: boolean; onToggle: () => void }) {
  const pCfg = priorityConfig[rule.priority]
  const oCfg = ownerConfig[rule.owner]
  const dCfg = dataSourceConfig[rule.dataSource]
  const PriorityIcon = pCfg.icon

  return (
    <div
      className={cn(
        'rounded-lg border border-border/50 bg-card shadow-sm transition-colors',
        expanded && 'ring-1 ring-border',
      )}
      data-testid={`rule-${rule.id}`}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}

        <PriorityIcon className={cn('h-4 w-4 shrink-0', pCfg.className)} />

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{rule.id}</span>
          <span className="truncate text-sm font-medium">{rule.title}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant="outline" className={cn('text-[10px]', pCfg.badgeClass)}>
            {pCfg.label}
          </Badge>
          <Badge variant="outline" className={cn('text-[10px]', oCfg.badgeClass)}>
            {oCfg.label}
          </Badge>
          <Badge variant="outline" className={cn('text-[10px]', dCfg.badgeClass)}>
            {dCfg.label}
          </Badge>
          {rule.type === 'event-driven' && (
            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-500">
              <Bell className="mr-0.5 h-2.5 w-2.5" />
              Push
            </Badge>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/30 px-4 py-3">
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Trigger</p>
              <p className="font-mono text-xs text-foreground/80">{rule.trigger}</p>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Source Page</p>
              <p className="text-xs text-foreground/80">{rule.sourcePage}</p>
            </div>

            {rule.agentMessage && (
              <div>
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Agent Message</p>
                <p className="text-xs text-foreground/80">{rule.agentMessage}</p>
              </div>
            )}
            {rule.backofficeMessage && (
              <div>
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Backoffice Message</p>
                <p className="text-xs text-foreground/80">{rule.backofficeMessage}</p>
              </div>
            )}

            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Action</p>
              <p className="text-xs text-foreground/80">{rule.action}</p>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Notes</p>
              <p className="text-xs text-foreground/80">{rule.notes}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
