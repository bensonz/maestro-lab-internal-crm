'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, Clock, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RundownBlock } from './types'

interface DailyRundownProps {
  blocks: RundownBlock[]
}

export function DailyRundown({ blocks }: DailyRundownProps) {
  const [expandedBlocks, setExpandedBlocks] = useState<Record<number, boolean>>(
    { 0: true, 1: true, 2: true },
  )
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})

  const toggleBlock = (index: number) => {
    setExpandedBlocks((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  const toggleItem = (key: string) => {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <Card data-testid="daily-rundown">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Daily Rundown</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {blocks.map((block, blockIdx) => (
          <div
            key={blockIdx}
            className="rounded-md border"
            data-testid={`rundown-block-${blockIdx}`}
          >
            <button
              onClick={() => toggleBlock(blockIdx)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50"
            >
              {expandedBlocks[blockIdx] ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">{block.label}</span>
              <Badge
                variant="secondary"
                className="ml-auto text-[10px] font-normal"
              >
                {block.phase}
              </Badge>
            </button>

            {expandedBlocks[blockIdx] && (
              <div className="border-t divide-y">
                {block.items.map((item, itemIdx) => {
                  const key = `${blockIdx}-${itemIdx}`
                  const isChecked = checkedItems[key] ?? false

                  return (
                    <div
                      key={itemIdx}
                      className="flex items-center gap-3 px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleItem(key)}
                        className="h-4 w-4 rounded border-muted-foreground/50"
                        data-testid={`rundown-check-${blockIdx}-${itemIdx}`}
                      />
                      <div className="min-w-0 flex-1">
                        <span
                          className={cn(
                            'text-sm',
                            isChecked && 'text-muted-foreground line-through',
                          )}
                        >
                          {item.label}
                        </span>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                      </div>
                      {item.count !== undefined && item.count > 0 && (
                        <Badge
                          variant={item.count > 0 ? 'default' : 'secondary'}
                          className="text-[10px]"
                        >
                          {item.count}
                        </Badge>
                      )}
                      {item.link && (
                        <a
                          href={item.link}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
