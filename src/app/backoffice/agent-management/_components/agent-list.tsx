'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Search,
  Users,
  FileText,
  TrendingUp,
  Target,
  LayoutList,
  Network,
  X,
} from 'lucide-react'
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card'
import { Separator } from '@/components/ui/separator'
import {
  ApplicationReviewList,
  type ApplicationRow,
} from './application-review-list'
import { AgentTreeView } from './agent-tree-view'
import { cn } from '@/lib/utils'
import { getAgentDisplayTier, STAR_THRESHOLDS, LEADERSHIP_TIERS } from '@/lib/commission-constants'

interface Agent {
  id: string
  name: string
  tier: string
  starLevel: number
  leadershipTier: string
  phone: string
  start: string
  createdAt?: string
  clients: number
  working: number
  successRate: number
  delayRate: number
  avgDaysToConvert: number | null
  supervisorId: string | null
  zelle: string
  address: string
  totalEarned: number
  thisMonthEarned: number
  newClientsThisMonth: number
}

interface AgentStats {
  totalAgents: number
  totalTeams: number
  newClientsMonth: number
  avgDaysToOpen: number | null
}

interface ApplicationStats {
  pending: number
  approved: number
  rejected: number
  total: number
}

interface ApplicationTimelineEntry {
  id: string
  date: string
  time: string
  event: string
  type: 'info' | 'success' | 'warning'
  actor: string | null
  applicationId: string | null
  action: string | null
}

interface AgentListProps {
  agents: Agent[]
  stats: AgentStats
  currentUserRole: string
  currentUserId: string
  applications?: ApplicationRow[]
  applicationStats?: ApplicationStats
  activeAgents?: { id: string; name: string }[]
  initialViewMode?: 'table' | 'tree'
  applicationTimeline?: ApplicationTimelineEntry[]
}

type TabKey = 'agents' | 'applications'
type ViewMode = 'table' | 'tree'
type SortField = 'start' | 'clients' | 'working' | null
type SortDirection = 'asc' | 'desc'

function getStarLabel(agent: Agent): string {
  return getAgentDisplayTier(agent.starLevel, agent.leadershipTier)
}

const LEADERSHIP_RANK: Record<string, number> = { NONE: 0, ED: 1, SED: 2, MD: 3, CMO: 4 }

/** Numeric rank for sorting: higher = higher rank. Rookie=0, 1★=1, ..., 4★=4, ED=5, SED=6, MD=7, CMO=8 */
function getAgentRank(agent: Agent): number {
  return agent.starLevel + (LEADERSHIP_RANK[agent.leadershipTier] || 0)
}

/** Always show all 9 levels in the filter: Rookie → 1★ → 2★ → 3★ → 4★ → ED → SED → MD → CMO */
function buildTierOptions(): string[] {
  const starLabels = STAR_THRESHOLDS.map((t) => t.label)
  const leadershipLabels = LEADERSHIP_TIERS.map((t) => t.label)
  return ['All', ...starLabels, ...leadershipLabels]
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

/** Extract 2-letter US state abbreviation from an address string */
function extractState(address: string): string | null {
  const match = address.match(/\b([A-Z]{2})\b(?:\s*\d{5})?/)
  return match?.[1] ?? null
}

export function AgentList({
  agents,
  stats,
  currentUserRole,
  currentUserId,
  applications = [],
  applicationStats,
  activeAgents = [],
  initialViewMode = 'table',
  applicationTimeline = [],
}: AgentListProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTier, setSelectedTier] = useState('All')
  const [activeTab, setActiveTab] = useState<TabKey>('agents')
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode)
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [newAgentFilter, setNewAgentFilter] = useState(false)
  const [teamFilterId, setTeamFilterId] = useState<string | null>(null)

  // Collect an agent + all descendants from the flat list
  const getTeamIds = useMemo(() => {
    // Build children map once
    const childrenMap = new Map<string, string[]>()
    for (const agent of agents) {
      if (agent.supervisorId) {
        const siblings = childrenMap.get(agent.supervisorId) || []
        siblings.push(agent.id)
        childrenMap.set(agent.supervisorId, siblings)
      }
    }
    return (rootId: string): Set<string> => {
      const ids = new Set<string>([rootId])
      const queue = [rootId]
      while (queue.length > 0) {
        const current = queue.pop()!
        const children = childrenMap.get(current) || []
        for (const childId of children) {
          ids.add(childId)
          queue.push(childId)
        }
      }
      return ids
    }
  }, [agents])

  const teamFilterName = useMemo(() => {
    if (!teamFilterId) return null
    return agents.find((a) => a.id === teamFilterId)?.name ?? null
  }, [agents, teamFilterId])

  // Check if an agent was created this month
  const isNewThisMonth = (agent: Agent): boolean => {
    if (!agent.createdAt) return false
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    return new Date(agent.createdAt) >= startOfMonth
  }

  const filteredAgents = useMemo(() => {
    const teamIds = teamFilterId ? getTeamIds(teamFilterId) : null
    return agents.filter((agent) => {
      const matchesSearch =
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.phone.includes(searchQuery)
      const matchesTier =
        selectedTier === 'All' || getStarLabel(agent) === selectedTier
      const matchesNewAgent = !newAgentFilter || isNewThisMonth(agent)
      const matchesTeam = !teamIds || teamIds.has(agent.id)
      return matchesSearch && matchesTier && matchesNewAgent && matchesTeam
    })
  }, [agents, searchQuery, selectedTier, newAgentFilter, teamFilterId, getTeamIds])

  const sortedAgents = useMemo(() => {
    if (!sortField) {
      // Default: highest rank first, alphabetical tiebreaker
      return [...filteredAgents].sort((a, b) => getAgentRank(b) - getAgentRank(a) || a.name.localeCompare(b.name))
    }
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
  const tierOptions = useMemo(() => buildTierOptions(), [])
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = { All: agents.length }
    for (const agent of agents) {
      const label = getStarLabel(agent)
      counts[label] = (counts[label] || 0) + 1
    }
    return counts
  }, [agents])

  const viewQueryParam = viewMode === 'tree' ? '?view=tree' : ''

  return (
    <div className="flex h-full animate-fade-in">
      {/* Left sidebar */}
      <div className="w-64 min-w-64 space-y-4 border-r border-border bg-sidebar p-4">
        <h1 className="text-xl font-semibold text-foreground">
          Agent Management
        </h1>

        {/* Summary Metrics — clickable cards act as view switchers / filters */}
        <div className="space-y-2">
          <Card
            className={cn(
              'card-terminal cursor-pointer transition-all',
              viewMode === 'table' && !newAgentFilter
                ? 'ring-1 ring-primary'
                : 'hover:ring-1 hover:ring-muted-foreground/30',
            )}
            onClick={() => {
              setViewMode('table')
              setNewAgentFilter(false)
              setActiveTab('agents')
            }}
            data-testid="stat-total-agents"
          >
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

          <Card
            className={cn(
              'card-terminal cursor-pointer transition-all',
              viewMode === 'tree' && !newAgentFilter
                ? 'ring-1 ring-success'
                : 'hover:ring-1 hover:ring-muted-foreground/30',
            )}
            onClick={() => {
              setViewMode('tree')
              setNewAgentFilter(false)
              setActiveTab('agents')
            }}
            data-testid="stat-total-teams"
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Total Teams
                  </p>
                  <p className="mt-0.5 text-xl font-mono font-semibold">
                    {stats.totalTeams}
                  </p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/20">
                  <FileText className="h-4 w-4 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={cn(
              'card-terminal cursor-pointer transition-all',
              newAgentFilter
                ? 'ring-1 ring-warning'
                : 'hover:ring-1 hover:ring-muted-foreground/30',
            )}
            onClick={() => {
              setNewAgentFilter((prev) => !prev)
              setActiveTab('agents')
            }}
            data-testid="stat-new-agents"
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    New Agents (Month)
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

        {/* Tier Filter */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
            Filter by Level
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
        {/* Search + View Mode Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="agent-search-input"
            />
          </div>
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded transition-colors',
                viewMode === 'table'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              title="Table view"
              data-testid="view-mode-table"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded transition-colors',
                viewMode === 'tree'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              title="Tree view"
              data-testid="view-mode-tree"
            >
              <Network className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Team filter active indicator */}
        {teamFilterId && teamFilterName && (
          <div className="flex items-center gap-2" data-testid="team-filter-active">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Users className="h-3 w-3" />
              {teamFilterName}&apos;s Team
              <button
                onClick={() => setTeamFilterId(null)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                data-testid="team-filter-clear"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}

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
            onClick={() => setActiveTab('applications')}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors relative',
              activeTab === 'applications'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
            data-testid="tab-applications"
          >
            Pending Applications
            {(applicationStats?.pending ?? 0) > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning/20 px-1.5 text-[10px] font-bold text-warning">
                {applicationStats?.pending}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'applications' ? (
          <ApplicationReviewList
            applications={applications}
            agents={activeAgents}
            timeline={applicationTimeline}
          />
        ) : (
          <Card className="card-terminal">
            <CardHeader className="border-b border-border px-4 py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Agent Directory ({filteredAgents.length})
                </CardTitle>
                {viewMode === 'table' && (
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
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {viewMode === 'tree' ? (
                <AgentTreeView
                  agents={filteredAgents}
                  allAgents={agents}
                  hasActiveFilter={searchQuery !== '' || selectedTier !== 'All' || newAgentFilter || !!teamFilterId}
                  onFilterTeam={(id) => setTeamFilterId((prev) => prev === id ? null : id)}
                  teamFilterId={teamFilterId}
                />
              ) : sortedAgents.length === 0 ? (
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
                              `/backoffice/agent-management/${agent.id}${viewQueryParam}`,
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
                              <HoverCard openDelay={300}>
                                <HoverCardTrigger asChild>
                                  <span
                                    className="truncate font-medium cursor-default"
                                    onClick={(e) => e.stopPropagation()}
                                    data-testid={`agent-name-hover-trigger-${agent.id}`}
                                  >
                                    {agent.name}
                                  </span>
                                </HoverCardTrigger>
                                <HoverCardContent align="start" className="w-56 p-3" data-testid={`agent-name-hover-${agent.id}`}>
                                  <div className="space-y-2 text-xs">
                                    <div>
                                      <span className="text-muted-foreground">Zelle:</span>{' '}
                                      <span className="font-mono">{agent.zelle || '\u2014'}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">State:</span>{' '}
                                      <span className="font-mono font-medium">{extractState(agent.address) || '\u2014'}</span>
                                    </div>
                                    <Separator />
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                      <div>
                                        <p className="font-mono font-semibold text-success">
                                          ${(agent.totalEarned / 1000).toFixed(1)}K
                                        </p>
                                        <p className="text-[9px] text-muted-foreground">Total Earned</p>
                                      </div>
                                      <div>
                                        <p className="font-mono font-semibold">
                                          ${agent.thisMonthEarned.toLocaleString()}
                                        </p>
                                        <p className="text-[9px] text-muted-foreground">This Month</p>
                                      </div>
                                      <div>
                                        <p className="font-mono font-semibold">
                                          {agent.newClientsThisMonth}
                                        </p>
                                        <p className="text-[9px] text-muted-foreground">New Clients</p>
                                      </div>
                                    </div>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                              <span className="shrink-0 text-xs text-warning">
                                {getStarLabel(agent)}
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
        )}
      </div>
    </div>
  )
}
