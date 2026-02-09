'use client'

import { useState, useMemo, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Search,
  Users,
  FileText,
  TrendingUp,
  Target,
  MoreHorizontal,
  Pencil,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EditUserDialog } from './edit-user-dialog'
import { cn } from '@/lib/utils'

interface Agent {
  id: string
  name: string
  tier: string
  phone: string
  start: string
  clients: number
  working: number
  successRate: number
  delayRate: number
  avgDaysToConvert: number | null
}

interface UserData {
  id: string
  name: string
  email: string
  role: string
  phone: string
  isActive: boolean
  createdAt: string
  clientCount: number
}

interface AgentStats {
  totalAgents: number
  initiatedApps: number
  newClientsMonth: number
  avgDaysToOpen: number | null
}

interface AgentListProps {
  agents: Agent[]
  users: UserData[]
  stats: AgentStats
  currentUserRole: string
  currentUserId: string
  exportButton: ReactNode
  createUserDialog: ReactNode
}

type TabKey = 'agents' | 'users'
type SortField = 'start' | 'clients' | 'working' | null
type SortDirection = 'asc' | 'desc'

function buildTierOptions(agents: Agent[]): string[] {
  const tiers = new Set(agents.map((a) => a.tier))
  return ['All', ...Array.from(tiers).sort()]
}

const ROLE_BADGE_STYLES: Record<string, string> = {
  AGENT: 'bg-primary/20 text-primary border-primary/30',
  BACKOFFICE: 'bg-warning/20 text-warning border-warning/30',
  ADMIN: 'bg-chart-5/20 text-chart-5 border-chart-5/30',
  FINANCE: 'bg-chart-3/20 text-chart-3 border-chart-3/30',
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function getSuccessRateColor(rate: number) {
  if (rate >= 85) return 'text-success'
  if (rate >= 70) return 'text-warning'
  return 'text-destructive'
}

function getDelayRateColor(rate: number) {
  if (rate <= 10) return 'text-success'
  if (rate <= 20) return 'text-warning'
  return 'text-destructive'
}

export function AgentList({
  agents,
  users,
  stats,
  currentUserRole,
  currentUserId,
  exportButton,
  createUserDialog,
}: AgentListProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTier, setSelectedTier] = useState('All')
  const [activeTab, setActiveTab] = useState<TabKey>('agents')
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesSearch =
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.phone.includes(searchQuery)
      const matchesTier =
        selectedTier === 'All' || agent.tier === selectedTier
      return matchesSearch && matchesTier
    })
  }, [agents, searchQuery, selectedTier])

  const sortedAgents = useMemo(() => {
    if (!sortField) return filteredAgents
    return [...filteredAgents].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'start':
          cmp = a.start.localeCompare(b.start)
          break
        case 'clients':
          cmp = a.clients - b.clients
          break
        case 'working':
          cmp = a.working - b.working
          break
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })
  }, [filteredAgents, sortField, sortDirection])

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const avgSuccessRate = useMemo(() => {
    if (filteredAgents.length === 0) return 0
    return Math.round(
      filteredAgents.reduce((sum, a) => sum + a.successRate, 0) /
        filteredAgents.length,
    )
  }, [filteredAgents])

  const avgDelayRate = useMemo(() => {
    if (filteredAgents.length === 0) return 0
    return Math.round(
      filteredAgents.reduce((sum, a) => sum + a.delayRate, 0) /
        filteredAgents.length,
    )
  }, [filteredAgents])

  // Tier options and counts
  const tierOptions = useMemo(() => buildTierOptions(agents), [agents])
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = { All: agents.length }
    for (const agent of agents) {
      counts[agent.tier] = (counts[agent.tier] || 0) + 1
    }
    return counts
  }, [agents])

  return (
    <div className="flex h-full animate-fade-in">
      {/* Left sidebar */}
      <div className="w-64 min-w-64 space-y-4 border-r border-border bg-sidebar p-4">
        <h1 className="text-xl font-semibold text-foreground">
          Agent Management
        </h1>

        {/* Summary Metrics */}
        <div className="space-y-2">
          <Card className="card-terminal">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Total Agents
                  </p>
                  <p className="mt-0.5 text-xl font-mono font-semibold">
                    {stats.totalAgents}
                  </p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-terminal">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Initiated Applications
                  </p>
                  <p className="mt-0.5 text-xl font-mono font-semibold">
                    {stats.initiatedApps}
                  </p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/20">
                  <FileText className="h-4 w-4 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-terminal">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    New Clients (Month)
                  </p>
                  <p className="mt-0.5 text-xl font-mono font-semibold">
                    {stats.newClientsMonth}
                  </p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/20">
                  <TrendingUp className="h-4 w-4 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-terminal">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Avg. Days to Open
                  </p>
                  <p className="mt-0.5 text-xl font-mono font-semibold">
                    {stats.avgDaysToOpen !== null ? stats.avgDaysToOpen : '—'}
                  </p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                  <Target className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {exportButton}
          {createUserDialog}
        </div>

        {/* Tier Filter */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
            Filter by Tier
          </p>
          <div className="flex flex-wrap gap-1">
            {tierOptions.map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={cn(
                  'rounded px-2 py-1 text-xs font-medium transition-colors',
                  selectedTier === tier
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {tier}
                <span className="ml-1 opacity-70">
                  ({tierCounts[tier] || 0})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: agent directory */}
      <div className="flex-1 space-y-4 overflow-auto p-6">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={
              activeTab === 'agents' ? 'Search agents...' : 'Search users...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="agent-search-input"
          />
        </div>

        {/* Tab Toggle */}
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('agents')}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors',
              activeTab === 'agents'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
            data-testid="tab-agents"
          >
            Agent Directory ({agents.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors',
              activeTab === 'users'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
            data-testid="tab-users"
          >
            All Users ({users.length})
          </button>
        </div>

        {activeTab === 'agents' ? (
          <Card className="card-terminal">
            <CardHeader className="border-b border-border px-4 py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Agent Directory ({filteredAgents.length})
                </CardTitle>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">
                    Avg Success:{' '}
                    <span
                      className={cn(
                        'font-mono font-medium',
                        avgSuccessRate >= 80 ? 'text-success' : 'text-warning',
                      )}
                    >
                      {avgSuccessRate}%
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    Avg Delay:{' '}
                    <span
                      className={cn(
                        'font-mono font-medium',
                        avgDelayRate <= 15
                          ? 'text-success'
                          : 'text-destructive',
                      )}
                    >
                      {avgDelayRate}%
                    </span>
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {sortedAgents.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  {agents.length === 0
                    ? 'No agents registered'
                    : 'No agents match your search'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          Agent
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          Phone
                        </th>
                        <th
                          className={cn(
                            'cursor-pointer px-3 py-2 text-left font-medium transition-colors',
                            sortField === 'start'
                              ? 'text-primary'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                          onClick={() => handleSort('start')}
                        >
                          Start
                        </th>
                        <th
                          className={cn(
                            'cursor-pointer px-3 py-2 text-right font-medium transition-colors',
                            sortField === 'clients'
                              ? 'text-primary'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                          onClick={() => handleSort('clients')}
                        >
                          Clients
                        </th>
                        <th
                          className={cn(
                            'cursor-pointer px-3 py-2 text-right font-medium transition-colors',
                            sortField === 'working'
                              ? 'text-primary'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                          onClick={() => handleSort('working')}
                        >
                          Working
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                          Avg Convert
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                          Success
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                          Delay
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAgents.map((agent) => (
                        <tr
                          key={agent.id}
                          onClick={() =>
                            router.push(
                              `/backoffice/agent-management/${agent.id}`,
                            )
                          }
                          className="cursor-pointer border-b border-border transition-colors hover:bg-muted/30"
                          data-testid={`agent-row-${agent.id}`}
                        >
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="relative shrink-0">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
                                  <span className="text-[10px] font-medium text-primary">
                                    {getInitials(agent.name)}
                                  </span>
                                </div>
                              </div>
                              <span className="truncate font-medium">
                                {agent.name}
                              </span>
                              <span className="shrink-0 text-xs text-warning">
                                {agent.tier}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                            {agent.phone || '—'}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {agent.start}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs">
                            {agent.clients}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs">
                            {agent.working}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                            {agent.avgDaysToConvert !== null
                              ? `${agent.avgDaysToConvert}d`
                              : '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs">
                            <span
                              className={getSuccessRateColor(agent.successRate)}
                            >
                              {agent.successRate}%
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs">
                            <span
                              className={getDelayRateColor(agent.delayRate)}
                            >
                              {agent.delayRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Users Tab */
          <Card className="card-terminal">
            <CardHeader className="border-b border-border px-4 py-3">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                All Users ({filteredUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredUsers.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  {users.length === 0
                    ? 'No users registered'
                    : 'No users match your search'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          Name
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          Email
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          Role
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          Phone
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          Clients
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          Joined
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground sr-only">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className={cn(
                            'border-b border-border transition-colors hover:bg-muted/30',
                            !user.isActive && 'opacity-50',
                          )}
                          data-testid={`user-row-${user.id}`}
                        >
                          <td className="px-3 py-2 font-medium">
                            {user.name}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {user.email}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              className={`text-xs ${ROLE_BADGE_STYLES[user.role] || 'bg-muted text-muted-foreground'}`}
                              data-testid={`user-role-badge-${user.id}`}
                            >
                              {user.role}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              className={`text-xs ${
                                user.isActive
                                  ? 'bg-success/20 text-success border-success/30'
                                  : 'bg-destructive/20 text-destructive border-destructive/30'
                              }`}
                              data-testid={`user-status-badge-${user.id}`}
                            >
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {user.phone || '—'}
                          </td>
                          <td className="px-3 py-2 font-mono">
                            {user.clientCount}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {user.createdAt}
                          </td>
                          <td className="px-3 py-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  data-testid={`user-actions-${user.id}`}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setEditingUser(user)}
                                  data-testid={`user-edit-${user.id}`}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit User Dialog */}
      {editingUser && (
        <EditUserDialog
          user={editingUser}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
          open={!!editingUser}
          onOpenChange={(open) => {
            if (!open) setEditingUser(null)
          }}
        />
      )}
    </div>
  )
}
