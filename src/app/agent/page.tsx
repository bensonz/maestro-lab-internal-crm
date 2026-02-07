import { auth } from '@/backend/auth'
import { redirect } from 'next/navigation'
import {
  getAgentDashboardStats,
  getAgentTodaysTasks,
  getAgentClients,
} from '@/backend/data/agent'
import Link from 'next/link'
import {
  DollarSign,
  Wallet,
  TrendingUp,
  CheckCircle2,
  Clock,
  PlayCircle,
  ListTodo,
  ArrowUpRight,
  Calendar,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function AgentDashboard() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [stats, todaysTasks, allClients] = await Promise.all([
    getAgentDashboardStats(session.user.id),
    getAgentTodaysTasks(session.user.id),
    getAgentClients(session.user.id),
  ])

  const recentClients = allClients.slice(0, 6)

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* ── Client Status ── */}
      <section>
        <h3
          className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground"
          data-testid="section-client-status"
        >
          Client Status
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* In Progress */}
          <div
            className="card-terminal flex w-full items-center gap-4 border-primary/30 text-left transition-all hover:border-primary/50"
            data-testid="status-in-progress"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <PlayCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Application In Progress
              </p>
              <p className="text-3xl font-mono font-bold text-primary">
                {stats.inProgressCount}
              </p>
            </div>
          </div>

          {/* Pending Approval */}
          <div
            className="card-terminal flex w-full items-center gap-4 border-warning/30 text-left transition-all hover:border-warning/50"
            data-testid="status-pending-approval"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Approval</p>
              <p className="text-3xl font-mono font-bold text-warning">
                {stats.pendingApprovalCount}
              </p>
            </div>
          </div>

          {/* Active */}
          <div
            className="card-terminal flex w-full items-center gap-4 border-success/30 text-left transition-all hover:border-success/50"
            data-testid="status-approved"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-success/20 text-success">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-3xl font-mono font-bold text-success">
                {stats.approvedCount}
              </p>
              {stats.lastApprovedAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Last updated: {stats.lastApprovedAt}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Financial Overview ── */}
      <section>
        <h3
          className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground"
          data-testid="section-financial-overview"
        >
          Financial Overview
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Accumulated Revenue */}
          <div className="card-terminal border-success/30 bg-success-muted/30">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/20 text-success">
                <DollarSign className="h-5 w-5" />
              </div>
              {stats.earningsChange !== 0 && (
                <span
                  className={cn(
                    'text-xs font-mono font-medium',
                    stats.earningsChange > 0
                      ? 'text-success'
                      : 'text-destructive',
                  )}
                >
                  {stats.earningsChange > 0 ? '+' : ''}
                  {stats.earningsChange}%
                </span>
              )}
            </div>
            <p className="metric-label mb-1">Accumulated Revenue</p>
            <p className="metric-value">
              ${stats.earnings.toLocaleString()}
            </p>
          </div>

          {/* Pending Payout */}
          <div className="card-terminal border-warning/30 bg-warning-muted/30">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/20 text-warning">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <p className="metric-label mb-1">Pending Payout</p>
            <p className="metric-value">
              ${stats.pendingPayout.toLocaleString()}
            </p>
          </div>

          {/* Monthly Growth */}
          <div className="card-terminal border-primary/30 bg-primary/5">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <p className="metric-label mb-1">Monthly Growth</p>
            {/* TODO: wire real monthly growth data */}
            <p className="metric-value">+0%</p>
          </div>
        </div>
      </section>

      {/* ── Today's Tasks ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3
            className="text-sm font-medium uppercase tracking-wider text-muted-foreground"
            data-testid="section-todays-tasks"
          >
            Today&apos;s Tasks
          </h3>
          {todaysTasks.length > 0 && (
            <span className="text-xs font-mono text-warning">
              {todaysTasks.length} pending
            </span>
          )}
        </div>

        {todaysTasks.length === 0 ? (
          <div className="card-terminal flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">
              No tasks due today
            </p>
          </div>
        ) : (
          <div className="card-terminal space-y-3">
            {todaysTasks.map((task) => (
              <Link
                key={task.id}
                href={
                  task.clientId
                    ? `/agent/clients/${task.clientId}`
                    : '/agent/todo-list'
                }
              >
                <div
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-3 transition-all hover:bg-muted/30',
                    task.isOverdue
                      ? 'border-warning/30 bg-warning/5'
                      : 'border-border bg-muted/30',
                  )}
                  data-testid={`task-${task.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate text-sm font-medium text-foreground">
                        {task.title}
                      </h4>
                      {task.isOverdue && (
                        <span className="shrink-0 rounded bg-warning/20 px-1.5 py-0.5 font-mono text-[10px] uppercase text-warning">
                          Urgent
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {task.description}
                      </p>
                    )}
                    {task.clientName && (
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">
                        Client: {task.clientName}
                      </p>
                    )}
                  </div>
                  <ArrowUpRight className="ml-4 h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── To-Dos (Client Cards) ── */}
      {recentClients.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3
              className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground"
              data-testid="section-todos"
            >
              <ListTodo className="h-4 w-4" />
              To-Dos
            </h3>
            <span className="text-xs font-mono text-primary">
              {
                recentClients.filter(
                  (c) =>
                    c.intakeStatus === 'NEEDS_MORE_INFO' ||
                    c.intakeStatus === 'PENDING_EXTERNAL',
                ).length
              }{' '}
              urgent
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentClients.map((client) => {
              const isHighPriority =
                client.intakeStatus === 'NEEDS_MORE_INFO' ||
                client.intakeStatus === 'PENDING_EXTERNAL'
              const isApproved = client.intakeStatus === 'APPROVED'
              const isBlocked = isHighPriority
              const statusClass = isApproved
                ? 'status-approved'
                : isBlocked
                  ? 'status-blocked'
                  : 'status-pending'

              return (
                <Link key={client.id} href={`/agent/clients/${client.id}`}>
                  <div
                    className={cn(
                      'card-terminal group cursor-pointer animate-fade-in',
                      isHighPriority && 'border-l-2 border-l-destructive',
                      isApproved && 'opacity-60',
                    )}
                    data-testid={`client-card-${client.id}`}
                  >
                    {/* Name + Status Badge */}
                    <div className="mb-3 flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-medium text-foreground transition-colors group-hover:text-primary">
                          {client.name}
                        </h3>
                        {client.nextTask && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            Next: {client.nextTask}
                          </p>
                        )}
                      </div>
                      <div className={cn('status-badge', statusClass)}>
                        {isBlocked && (
                          <AlertCircle className="mr-1 h-3 w-3" />
                        )}
                        {isApproved && (
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                        )}
                        {client.status}
                      </div>
                    </div>

                    {/* Progress Bar — hide for approved clients */}
                    {!isApproved && (
                      <div className="mb-3">
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Step {client.step} of {client.totalSteps}
                          </span>
                          <span className="font-mono text-primary">
                            {client.progress}%
                          </span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${client.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Date info */}
                    <div className="space-y-1">
                      {isApproved ? (
                        <div className="flex items-center gap-1.5 text-xs text-success">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Active</span>
                        </div>
                      ) : (
                        client.lastUpdated && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
                            <Clock className="h-3 w-3" />
                            <span>Updated {client.lastUpdated}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Agent Info Footer ── */}
      <section className="border-t border-border pt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">Agent #{session.user.id.slice(-4)}</span>
          <span>&bull;</span>
          <span>Total Clients: {stats.totalClients}</span>
          <span>&bull;</span>
          <span>{stats.pendingTasks} pending tasks</span>
        </div>
      </section>
    </div>
  )
}
