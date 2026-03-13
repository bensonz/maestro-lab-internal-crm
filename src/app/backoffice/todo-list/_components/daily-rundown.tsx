'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Sunrise,
  Sun,
  Sunset,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RundownBlock } from './types'

interface DailyRundownProps {
  blocks: RundownBlock[]
}

const PHASE_META = [
  { Icon: Sunrise, color: 'text-warning' },
  { Icon: Sun, color: 'text-primary' },
  { Icon: Sunset, color: 'text-muted-foreground' },
]

export function DailyRundown({ blocks }: DailyRundownProps) {
  const [expandedBlocks, setExpandedBlocks] = useState<Record<number, boolean>>(
    { 0: true },
  )
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})

  const toggleBlock = (index: number) => {
    setExpandedBlocks((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  const toggleItem = (key: string) => {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="card-terminal min-h-[320px] p-0" data-testid="daily-rundown">
      {/* Header */}
      <div className="border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Daily Rundown
        </h3>
        <span className="font-mono text-xs text-muted-foreground">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>

      {/* Phase blocks */}
      <div className="divide-y divide-border">
        {blocks.map((block, blockIdx) => {
          const { Icon: PhaseIcon, color: phaseColor } =
            PHASE_META[blockIdx] ?? PHASE_META[1]
          const isOpen = expandedBlocks[blockIdx] ?? false
          const total = block.items.length
          const done = block.items.filter(
            (_, i) => checkedItems[`${blockIdx}-${i}`],
          ).length

          return (
            <div key={blockIdx} data-testid={`rundown-block-${blockIdx}`}>
              {/* Phase header */}
              <button
                onClick={() => toggleBlock(blockIdx)}
                className="flex w-full items-center gap-2.5 px-5 py-2.5 text-left transition-colors hover:bg-muted/30"
              >
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <PhaseIcon className={cn('h-4 w-4', phaseColor)} />
                <span className="flex-1 text-sm font-semibold text-foreground">
                  {block.label}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {done}/{total}
                </span>
                {done === total && total > 0 && (
                  <span className="text-xs text-success">Done</span>
                )}
              </button>

              {/* Items */}
              {isOpen && (
                <div className="border-t border-border/50 bg-card/30">
                  {block.items.map((item, itemIdx) => {
                    const key = `${blockIdx}-${itemIdx}`
                    const isChecked = checkedItems[key] ?? false
                    const hasCount = item.count !== undefined && item.count > 0

                    return (
                      <div
                        key={itemIdx}
                        className="flex items-center gap-2.5 px-5 py-2 transition-colors hover:bg-muted/20"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleItem(key)}
                          className="h-3.5 w-3.5 shrink-0 rounded border-muted-foreground/40 accent-primary"
                          data-testid={`rundown-check-${blockIdx}-${itemIdx}`}
                        />
                        <span
                          className={cn(
                            'min-w-0 flex-1 text-xs',
                            isChecked
                              ? 'text-muted-foreground/50 line-through'
                              : 'text-foreground',
                          )}
                        >
                          {item.label}
                        </span>
                        {hasCount && (
                          <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
                            {item.count}
                          </span>
                        )}
                        {item.link && (
                          <a
                            href={item.link}
                            className="shrink-0 text-muted-foreground/50 transition-colors hover:text-foreground"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
