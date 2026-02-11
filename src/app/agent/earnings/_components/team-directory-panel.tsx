'use client'

import { useState } from 'react'
import { Star, Users, TrendingUp, CheckCircle2, Circle, Crown } from 'lucide-react'
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
  const upline = supervisorChain.length > 0 ? supervisorChain[0] : null
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

          {/* Upline */}
          {upline && (
            <>
              <div className="space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Upline
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">
                    {upline.name}
                  </span>
                  {upline.starLevel > 0 ? (
                    <StarDisplay count={upline.starLevel} />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Rookie
                    </span>
                  )}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-warning" />
              Promotion Path
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
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

            {/* Milestones */}
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Career Milestones
              </p>
              {STAR_THRESHOLDS.map((tier) => {
                const reached = agent.starLevel >= tier.level
                const isCurrent = agent.starLevel === tier.level
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
                      {tier.level > 0 && (
                        <span className="ml-2 text-success">{tier.sliceBonus}/client</span>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Level 5+ Leadership */}
              <div className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-warning" />
                  <span>5+ Leadership</span>
                </div>
                <span className="text-xs font-mono text-warning">P&L Revenue Share</span>
              </div>
            </div>

            {/* Next Level Requirements */}
            {agent.starLevel < 4 && (
              <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
                <p className="text-xs text-muted-foreground">Next Level Requirements</p>
                <p className="mt-1 text-sm">
                  Reach <span className="font-semibold text-primary">{STAR_THRESHOLDS[Math.min(agent.starLevel + 1, 4)].min} approved clients</span> to become a{' '}
                  <span className="font-semibold">{STAR_THRESHOLDS[Math.min(agent.starLevel + 1, 4)].label}</span>
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
