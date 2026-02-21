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
} from 'lucide-react'
import {
  ApplicationReviewList,
  type ApplicationRow,
} from './application-review-list'
import { cn } from '@/lib/utils'
import { getAgentDisplayTier } from '@/lib/commission-constants'

interface Agent {
  id: string
  name: string
  tier: string
  starLevel: number
  leadershipTier: string
  phone: string
  start: string
  clients: number
  working: number
  successRate: number
  delayRate: number
  avgDaysToConvert: number | null
}

interface AgentStats {
  totalAgents: number
  initiatedApps: number
  newClientsMonth: number
  avgDaysToOpen: number | null
}

interface ApplicationStats {
  pending: number
  approved: number
  rejected: number
  total: number
}

interface AgentListProps {
  agents: Agent[]
  stats: AgentStats
  currentUserRole: string
  currentUserId: string
  applications?: ApplicationRow[]
  applicationStats?: ApplicationStats
  activeAgents?: { id: string; name: string }[]
}

type TabKey = 'agents' | 'applications'
type SortField = 'start' | 'clients' | 'working' | null
type SortDirection = 'asc' | 'desc'

function getStarLabel(agent: Agent): string {
  return getAgentDisplayTier(agent.starLevel, agent.leadershipTier)
}

function buildTierOptions(agents: Agent[]): string[] {
  const seen = new Map<number, string>()
  for (const a of agents) {
    if (!seen.has(a.starLevel)) {
      seen.set(a.starLevel, getStarLabel(a))
    }
  }
  const sorted = Array.from(seen.entries()).sort(([a], [b]) => a - b)
  return ['All', ...sorted.map(([, label]) => label)]
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
  stats,
  currentUserRole,
  currentUserId,
  applications = [],
  applicationStats,
  activeAgents = [],
}: AgentListProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTier, setSelectedTier] = useState('All')
  const [activeTab, setActiveTab] = useState<TabKey>('agents')
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesSearch =
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.phone.includes(searchQuery)
      const matchesTier =
        selectedTier === 'All' || getStarLabel(agent) === selectedTier
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
      const label = getStarLabel(agent)
      counts[label] = (counts[label] || 0) + 1
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

        {/* Tier Filter */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
            Filter by Star Level
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
            placeholder="Search agents..."
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
          />
        ) : (
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
