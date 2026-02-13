'use client'

import { useState } from 'react'
import { Users, Bell, DollarSign, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TeamSupportItem } from './types'

// Team Member Row

function TeamMemberRow({
  item,
  onNudge,
}: {
  item: TeamSupportItem
  onNudge: (memberId: string) => Promise<boolean>
}) {
  const [nudging, setNudging] = useState(false)
  const [nudged, setNudged] = useState(false)

  const handleNudge = async () => {
    setNudging(true)
    const success = await onNudge(item.id)
    setNudging(false)
    if (success) setNudged(true)
  }

  return (
    <div
      className="flex items-center gap-3 border-b border-border/20 px-4 py-3 last:border-b-0"
      data-testid={`team-support-${item.id}`}
    >
      {/* Avatar */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
        <span className="font-mono text-[10px] font-bold text-primary">
          {item.agentName
            .split(' ')
            .map((n) => n[0])
            .join('')}
        </span>
      </div>

      {/* Hint */}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{item.hint}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-success" />
            <span className="font-mono text-[10px] font-medium text-success">
              ${item.potentialEarning} potential
            </span>
          </div>
          {item.isOneStepAway && (
            <span className="font-mono text-[10px] font-medium text-warning">
              Almost there!
            </span>
          )}
        </div>
      </div>

      {/* Nudge button */}
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 px-3 text-[11px]"
        onClick={handleNudge}
        disabled={nudging || nudged}
        data-testid={`nudge-btn-${item.id}`}
      >
        {nudging ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Bell className="h-3 w-3" />
        )}
        {nudged ? 'Sent' : 'Nudge'}
      </Button>
    </div>
  )
}

// Main Component

interface TeamSupportProps {
  items: TeamSupportItem[]
  onNudge: (memberId: string) => Promise<boolean>
}

export function TeamSupport({ items, onNudge }: TeamSupportProps) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-border bg-card"
      data-testid="team-support"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-foreground" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Team Support
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Your direct team members who could use a hand
            </p>
          </div>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {items.length} member{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Members */}
      <div className="max-h-[260px] overflow-y-auto">
        {items.length > 0 ? (
          items.map((item) => (
            <TeamMemberRow key={item.id} item={item} onNudge={onNudge} />
          ))
        ) : (
          <div className="py-8 text-center">
            <Users className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">
              No team members to support
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
