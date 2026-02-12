'use client'

import { useState } from 'react'
import { Star, Users, TrendingUp, CheckCircle2, Circle, Crown, Gem, Trophy, Rocket } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { STAR_THRESHOLDS } from '@/lib/commission-constants'
import type { HierarchyAgent, HierarchyNode } from '@/backend/data/hierarchy'

interface TeamDirectoryPanelProps {
  hierarchy: {
    agent: HierarchyAgent
    supervisorChain: HierarchyAgent[]
    subordinateTree: HierarchyNode
    teamSize: number
  }
}

function StarDisplay({
  count,
  size = 'sm',
}: {
  count: number
  size?: 'sm' | 'md'
}) {
  const starSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'
  return (
    <div className="flex items-center gap-0.5">
      {Array(count)
        .fill(0)
        .map((_, i) => (
          <Star
            key={i}
            className={cn(starSize, 'fill-warning text-warning')}
          />
        ))}
    </div>
  )
}

function countAtDepth(node: HierarchyNode, depth: number): number {
  if (depth === 0) return node.subordinates.length
  return node.subordinates.reduce(
    (sum, sub) => sum + countAtDepth(sub, depth - 1),
    0,
  )
}

export function TeamDirectoryPanel({ hierarchy }: TeamDirectoryPanelProps) {
  const { agent, supervisorChain, subordinateTree } = hierarchy
  const directTeam = subordinateTree.subordinates
  const level2Count = countAtDepth(subordinateTree, 1)
  const level3Count = countAtDepth(subordinateTree, 2)
  const [showPromotionPath, setShowPromotionPath] = useState(false)

  return (
    <div className="flex h-full w-56 min-w-56 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="border-b border-sidebar-border p-4">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          Team Directory
        </h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-3">
          {/* My Position */}
          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              My Position
            </p>
            <div className="flex items-center gap-2">
              {agent.starLevel > 0 ? (
                <>
                  <StarDisplay count={agent.starLevel} size="md" />
                  <span className="text-sm font-medium text-foreground">
                    {agent.starLevel}-Star
                  </span>
                </>
              ) : (
                <span className="text-sm font-medium text-foreground">
                  Rookie
                </span>
              )}
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Upline Chain */}
          {supervisorChain.length > 0 && (
            <>
              <div className="space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Upline ({supervisorChain.length})
                </p>
                <div className="space-y-1">
                  {supervisorChain.map((sup, idx) => (
                    <div
                      key={sup.id}
                      className="flex items-center justify-between rounded bg-muted/20 px-2 py-1"
                      style={{ marginLeft: idx * 8 }}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className={cn(
                            'h-1.5 w-1.5 shrink-0 rounded-full',
                            idx === 0 ? 'bg-primary' : 'bg-muted-foreground/40',
                          )}
                        />
                        <span className="truncate text-sm text-foreground">
                          {sup.name}
                        </span>
                      </div>
                      {sup.starLevel > 0 ? (
                        <StarDisplay count={sup.starLevel} />
                      ) : (
                        <span className="text-[10px] text-muted-foreground">
                          Rookie
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="bg-border/50" />
            </>
          )}

          {/* Direct Team */}
          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Direct Team ({directTeam.length})
            </p>
            <div className="space-y-1.5">
              {directTeam.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-1">
                  No direct reports
                </p>
              ) : (
                directTeam.map((member, idx) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded bg-muted/20 px-2 py-1"
                    data-testid={`team-member-${idx}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          member.isActive
                            ? 'bg-success'
                            : 'bg-muted-foreground/40',
                        )}
                      />
                      <span
                        className={cn(
                          'text-sm',
                          member.isActive
                            ? 'text-foreground'
                            : 'text-muted-foreground',
                        )}
                      >
                        {member.name}
                      </span>
                    </div>
                    {member.starLevel > 0 ? (
                      <StarDisplay count={member.starLevel} />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        Rookie
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Extended Team */}
          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Extended Team
            </p>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between rounded bg-muted/10 px-2 py-1">
                <span className="text-muted-foreground">Level 2</span>
                <span className="font-mono text-foreground">
                  {level2Count} members
                </span>
              </div>
              <div className="flex items-center justify-between rounded bg-muted/10 px-2 py-1">
                <span className="text-muted-foreground">Level 3</span>
                <span className="font-mono text-foreground">
                  {level3Count} members
                </span>
              </div>
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Promotion Path CTA */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowPromotionPath(true)}
              className="w-full rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm font-semibold text-warning transition-all hover:bg-warning/20 hover:border-warning/60"
              data-testid="promotion-path-btn"
            >
              View Promotion Path &rarr;
            </button>
          </div>
        </div>
      </ScrollArea>

      {/* Promotion Path Modal */}
      <Dialog open={showPromotionPath} onOpenChange={setShowPromotionPath}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-warning" />
              Your Promotion Path
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Current Position */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs text-muted-foreground">Current Position</p>
              <div className="mt-1 flex items-center gap-2">
                {agent.starLevel > 0 ? (
                  <>
                    <div className="flex gap-0.5">
                      {Array(agent.starLevel).fill(0).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                      ))}
                    </div>
                    <span className="text-sm font-semibold">{agent.starLevel}-Star Agent</span>
                  </>
                ) : (
                  <span className="text-sm font-semibold">Rookie</span>
                )}
              </div>
            </div>

            {/* Star Level Milestones */}
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Star Levels
              </p>
              {STAR_THRESHOLDS.map((tier) => {
                const reached = agent.starLevel >= tier.level
                const isCurrent = agent.starLevel === tier.level
                const perClient = 200 + tier.level * 50
                return (
                  <div
                    key={tier.level}
                    className={cn(
                      'flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all',
                      isCurrent
                        ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/20'
                        : reached
                          ? 'border-success/30 bg-success/5 text-success'
                          : 'border-border/50 bg-muted/10 text-muted-foreground',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {reached ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground/40" />
                      )}
                      <span className={cn(isCurrent && 'font-semibold text-foreground')}>
                        {tier.label}
                      </span>
                    </div>
                    <div className="text-right text-xs">
                      <span className="font-mono">{tier.min}+ clients</span>
                      <span className={cn(
                        'ml-2 font-semibold',
                        reached ? 'text-success' : 'text-muted-foreground',
                      )}>
                        ${perClient}/client
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Leadership Tiers Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-warning/40 to-transparent" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-warning">
                Leadership Tiers
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-warning/40 to-transparent" />
            </div>

            {/* Leadership Tiers */}
            <div className="space-y-3">
              {/* Executive Director */}
              <div className="rounded-xl border border-warning/40 bg-gradient-to-r from-warning/10 via-warning/5 to-transparent p-3.5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-warning" />
                      <span className="text-sm font-bold text-warning">
                        Executive Director
                      </span>
                    </div>
                    <div className="mt-1 flex gap-0.5">
                      {Array(5).fill(0).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-warning/60 text-warning/60" />
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xl font-black text-warning">$10,000</p>
                    <p className="text-[10px] text-muted-foreground">promotion bonus</p>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span>5% team revenue (quarterly)</span>
                  <span className="text-border">|</span>
                  <span>30+ team members</span>
                  <span className="text-border">|</span>
                  <span>2 four-star agents</span>
                  <span className="text-border">|</span>
                  <span>15+ clients/year</span>
                </div>
              </div>

              {/* Senior Executive Director */}
              <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-3.5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Gem className="h-4 w-4 text-amber-400" />
                      <span className="text-sm font-bold text-amber-400">
                        Senior Executive Director
                      </span>
                    </div>
                    <div className="mt-1 flex gap-0.5">
                      {Array(6).fill(0).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-amber-400/60 text-amber-400/60" />
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xl font-black text-amber-400">$30,000</p>
                    <p className="text-[10px] text-muted-foreground">promotion bonus</p>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span>10% team revenue (quarterly)</span>
                  <span className="text-border">|</span>
                  <span>20+ clients/year</span>
                  <span className="text-border">|</span>
                  <span>2 EDs</span>
                </div>
              </div>

              {/* Managing Director */}
              <div className="rounded-xl border border-orange-400/40 bg-gradient-to-r from-orange-400/10 via-orange-400/5 to-transparent p-3.5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-orange-400" />
                      <span className="text-sm font-bold text-orange-400">
                        Managing Director
                      </span>
                    </div>
                    <div className="mt-1 flex gap-0.5">
                      {Array(7).fill(0).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-orange-400/60 text-orange-400/60" />
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xl font-black text-orange-400">$100,000</p>
                    <p className="text-[10px] text-muted-foreground">promotion bonus</p>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span>15% team revenue (quarterly)</span>
                  <span className="text-border">|</span>
                  <span>25+ clients/year</span>
                  <span className="text-border">|</span>
                  <span>2 SEDs</span>
                </div>
              </div>

              {/* CMO */}
              <div className="rounded-xl border border-rose-400/50 bg-gradient-to-br from-rose-500/15 via-orange-400/10 to-amber-400/5 p-4 ring-1 ring-rose-400/20">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Rocket className="h-4.5 w-4.5 text-rose-400" />
                      <span className="text-sm font-black tracking-wide text-rose-400">
                        Chief Marketing Officer
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      The pinnacle of leadership
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-2xl font-black text-rose-400">$250,000</p>
                    <p className="text-[10px] text-muted-foreground">promotion bonus</p>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span>20% team revenue (quarterly)</span>
                  <span className="text-border">|</span>
                  <span>30+ clients/year</span>
                  <span className="text-border">|</span>
                  <span>3 MDs</span>
                </div>
              </div>
            </div>

            {/* Next Level Requirements */}
            {agent.starLevel < 4 && (
              <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
                <p className="text-xs text-muted-foreground">Your Next Step</p>
                <p className="mt-1 text-sm">
                  Close <span className="font-semibold text-primary">{STAR_THRESHOLDS[Math.min(agent.starLevel + 1, 4)].min} clients</span> to become a{' '}
                  <span className="font-semibold">{STAR_THRESHOLDS[Math.min(agent.starLevel + 1, 4)].label}</span> and earn{' '}
                  <span className="font-semibold text-success">
                    ${200 + (agent.starLevel + 1) * 50}/client
                  </span>
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
