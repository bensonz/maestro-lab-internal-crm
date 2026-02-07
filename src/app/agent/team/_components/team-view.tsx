'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, UserCheck, CheckCircle2, TrendingUp, Star } from 'lucide-react'
import type {
  HierarchyAgent,
  HierarchyNode as HierarchyNodeType,
} from '@/backend/data/hierarchy'
import { HierarchyNode } from './hierarchy-node'
import { cn } from '@/lib/utils'

interface TeamViewProps {
  hierarchy: {
    agent: HierarchyAgent
    supervisorChain: HierarchyAgent[]
    subordinateTree: HierarchyNodeType
    teamSize: number
  }
  rollup: {
    totalAgents: number
    activeAgents: number
    totalClients: number
    approvedClients: number
    teamSuccessRate: number
    tierBreakdown: Record<string, number>
  }
  currentUserId: string
}

const statCards = [
  {
    key: 'teamSize',
    label: 'Team Size',
    icon: Users,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    key: 'activeAgents',
    label: 'Active Agents',
    icon: UserCheck,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    key: 'approvedClients',
    label: 'Approved Clients',
    icon: CheckCircle2,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    key: 'teamSuccessRate',
    label: 'Team Success',
    icon: TrendingUp,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
] as const

function formatStat(key: string, rollup: TeamViewProps['rollup']): string {
  if (key === 'teamSuccessRate') {
    return rollup.teamSuccessRate > 0
      ? `${Math.round(rollup.teamSuccessRate * 100)}%`
      : '--'
  }
  return String(rollup[key as keyof typeof rollup] ?? 0)
}

function starLabel(starLevel: number, tier: string): string {
  if (starLevel === 0) return tier
  return `${starLevel}★`
}

const tierOrder = ['rookie', '1-star', '2-star', '3-star', '4-star']

export function TeamView({ hierarchy, rollup, currentUserId }: TeamViewProps) {
  const reversedChain = [...hierarchy.supervisorChain].reverse()

  return (
    <div className="space-y-4 p-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">My Team</h1>
        <p className="text-xs text-muted-foreground">
          Supervisor chain, subordinates & team performance
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map(({ key, label, icon: Icon, color, bg }) => (
          <Card key={key} className="border-border/50">
            <CardContent className="flex items-center gap-3 p-3">
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full',
                  bg,
                )}
              >
                <Icon className={cn('h-4 w-4', color)} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
                <p
                  className="text-lg font-bold"
                  data-testid={`stat-${key}`}
                >
                  {formatStat(key, rollup)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Supervisor Chain */}
      {hierarchy.supervisorChain.length > 0 && (
        <Card className="border-border/50" data-testid="supervisor-chain">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <span className="text-muted-foreground">&#9650;</span>
              Supervisor Chain
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pb-3">
            {reversedChain.map((sup, i) => (
              <div
                key={sup.id}
                className="flex items-center gap-2 text-sm"
                style={{ paddingLeft: `${i * 20}px` }}
                data-testid={`supervisor-${sup.id}`}
              >
                <span className="text-muted-foreground/40">
                  {i === reversedChain.length - 1 ? '└' : '├'}
                </span>
                <Badge
                  variant={sup.starLevel > 0 ? 'default' : 'secondary'}
                  className="gap-0.5 text-[10px]"
                >
                  {sup.starLevel > 0 && <Star className="h-2.5 w-2.5" />}
                  {starLabel(sup.starLevel, sup.tier)}
                </Badge>
                <span className="text-foreground">{sup.name}</span>
                {i === reversedChain.length - 1 && (
                  <span className="text-[10px] text-muted-foreground">
                    ← your supervisor
                  </span>
                )}
              </div>
            ))}
            {/* Current agent at the bottom */}
            <div
              className="flex items-center gap-2 text-sm font-medium text-primary"
              style={{
                paddingLeft: `${reversedChain.length * 20}px`,
              }}
            >
              <span className="text-muted-foreground/40">└</span>
              <Badge
                variant={
                  hierarchy.agent.starLevel > 0 ? 'default' : 'secondary'
                }
                className="gap-0.5 text-[10px]"
              >
                {hierarchy.agent.starLevel > 0 && (
                  <Star className="h-2.5 w-2.5" />
                )}
                {starLabel(hierarchy.agent.starLevel, hierarchy.agent.tier)}
              </Badge>
              {hierarchy.agent.name}
              <span className="text-[10px] text-muted-foreground">(you)</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subordinate Tree */}
      <Card className="border-border/50" data-testid="subordinate-tree">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <span className="text-muted-foreground">&#9660;</span>
            My Subordinates
            {hierarchy.teamSize > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {hierarchy.teamSize}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          {hierarchy.subordinateTree.subordinates.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No subordinates yet
            </p>
          ) : (
            hierarchy.subordinateTree.subordinates.map((sub) => (
              <HierarchyNode
                key={sub.id}
                node={sub}
                currentUserId={currentUserId}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Tier Breakdown */}
      {Object.keys(rollup.tierBreakdown).length > 0 && (
        <Card className="border-border/50" data-testid="tier-breakdown">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Tier Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex flex-wrap gap-2">
              {tierOrder
                .filter((t) => rollup.tierBreakdown[t])
                .map((tier) => (
                  <Badge
                    key={tier}
                    variant="outline"
                    className="gap-1.5 px-3 py-1 text-xs"
                  >
                    {tier}
                    <span className="font-bold">
                      {rollup.tierBreakdown[tier]}
                    </span>
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
