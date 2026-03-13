'use client'

import { useState } from 'react'
import {
  PhoneCall,
  AlertTriangle,
  Clock,
  Mail,
  CreditCard,
  Building2,
  Shield,
  Star,
  Inbox,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { ActionHubTodo } from './types'

type TodoGroup = 'all' | 'debit' | 'bank' | 'platform' | 'other'

// Category → group mapping
const CATEGORY_GROUPS: Record<string, TodoGroup> = {
  'Collect Debit Card Information': 'debit',
  'Re-Open Bank Account / Schedule with Client': 'bank',
  'Contact Bank': 'bank',
  'Contact PayPal': 'bank',
  'Platforms Verification': 'platform',
  'Account Verification — Send to Client': 'platform',
  'VIP Account — Reply Required': 'other',
  'Confirm Fund Deposit': 'other',
  'Confirm Fund Withdrawal': 'other',
}

const GROUP_CONFIG: Record<TodoGroup, { label: string; icon: typeof PhoneCall }> = {
  all: { label: 'All', icon: PhoneCall },
  debit: { label: 'Debit Cards', icon: CreditCard },
  bank: { label: 'Bank / PayPal', icon: Building2 },
  platform: { label: 'Platforms', icon: Shield },
  other: { label: 'VIP & Funds', icon: Star },
}

interface AgentContactPanelProps {
  todos: ActionHubTodo[]
}

export function AgentContactPanel({ todos }: AgentContactPanelProps) {
  const [group, setGroup] = useState<TodoGroup>('all')

  const overdue = todos.filter((t) => t.overdue)
  const filtered = group === 'all'
    ? todos
    : todos.filter((t) => (CATEGORY_GROUPS[t.issueCategory] ?? 'other') === group)

  const filteredOverdue = filtered.filter((t) => t.overdue)
  const filteredUpcoming = filtered.filter((t) => !t.overdue)

  // Group counts for tabs
  const groupCounts: Record<TodoGroup, number> = {
    all: todos.length,
    debit: todos.filter((t) => (CATEGORY_GROUPS[t.issueCategory] ?? 'other') === 'debit').length,
    bank: todos.filter((t) => (CATEGORY_GROUPS[t.issueCategory] ?? 'other') === 'bank').length,
    platform: todos.filter((t) => (CATEGORY_GROUPS[t.issueCategory] ?? 'other') === 'platform').length,
    other: todos.filter((t) => (CATEGORY_GROUPS[t.issueCategory] ?? 'other') === 'other').length,
  }

  const groups: TodoGroup[] = ['all', 'debit', 'bank', 'platform', 'other']

  return (
    <div id="agent-contact" className="card-terminal flex min-h-[280px] flex-col p-0" data-testid="agent-contact-panel">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-3">
        <PhoneCall className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Agent Contact & Follow-ups
        </h3>
        {todos.length > 0 && (
          <span
            className={cn(
              'rounded px-2 py-0.5 font-mono text-xs font-semibold',
              overdue.length > 0
                ? 'bg-destructive/20 text-destructive'
                : 'bg-primary/20 text-primary',
            )}
          >
            {todos.length}
          </span>
        )}
        {overdue.length > 0 && (
          <span className="ml-auto text-xs text-destructive">
            {overdue.length} overdue
          </span>
        )}
      </div>

      {/* Group tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border/50 px-5 py-2">
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => setGroup(g)}
            className={cn(
              'shrink-0 rounded px-3 py-1.5 text-xs font-medium transition-colors',
              group === g
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            data-testid={`contact-tab-${g}`}
          >
            {GROUP_CONFIG[g].label}
            {groupCounts[g] > 0 && (
              <span className="ml-1.5 font-mono text-primary">{groupCounts[g]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center px-5 py-8">
            <div className="text-center">
              <Inbox className="mx-auto h-6 w-6 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                {group === 'all' ? 'No pending follow-ups' : `No ${GROUP_CONFIG[group].label.toLowerCase()} items`}
              </p>
            </div>
          </div>
        ) : (
          <div className="max-h-[300px] divide-y divide-border/30 overflow-y-auto">
            {filteredOverdue.map((todo) => (
              <ContactRow key={todo.id} todo={todo} />
            ))}
            {filteredUpcoming.map((todo) => (
              <ContactRow key={todo.id} todo={todo} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ContactRow({ todo }: { todo: ActionHubTodo }) {
  const groupKey = CATEGORY_GROUPS[todo.issueCategory] ?? 'other'
  const GroupIcon = GROUP_CONFIG[groupKey].icon

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/20',
        todo.overdue && 'bg-destructive/5',
      )}
      data-testid={`contact-row-${todo.id}`}
    >
      {todo.overdue ? (
        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
      ) : (
        <GroupIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {todo.issueCategory}
          </span>
          {todo.source === 'EMAIL_AUTO' && (
            <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {todo.clientName} — {todo.agentName}
        </p>
      </div>
      <span
        className={cn(
          'shrink-0 rounded px-2 py-1 font-mono text-xs font-semibold',
          todo.overdue
            ? 'bg-destructive/20 text-destructive'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {todo.overdue
          ? `${Math.abs(todo.daysUntilDue)}d overdue`
          : format(new Date(todo.dueDate), 'MMM d')}
      </span>
    </div>
  )
}
