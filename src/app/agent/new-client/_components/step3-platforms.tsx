'use client'

import { useCallback } from 'react'
import { PLATFORM_INFO, FINANCIAL_PLATFORMS, SPORTS_PLATFORMS } from '@/lib/platforms'
import { PlatformCard } from './step3-platform-card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import type { PlatformEntry } from '@/types/backend-types'
import type { PlatformType } from '@/types'

interface Step3Props {
  formData: Record<string, unknown>
  onChange: (field: string, value: unknown) => void
}

function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Collapsible>
      <div className="card-terminal w-full overflow-hidden !p-0" data-testid={`section-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <CollapsibleTrigger className="flex w-full items-center justify-between border-b border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-card-hover group" data-testid="section-trigger">
          <span>{title}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 p-4">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function getEntryForPlatform(
  platformData: PlatformEntry[],
  platform: string,
): PlatformEntry {
  const existing = platformData.find((e) => e.platform === platform)
  return existing ?? { platform, username: '', accountId: '', screenshot: '', status: '' }
}

export function Step3Platforms({ formData, onChange }: Step3Props) {
  const platformData = (formData.platformData as PlatformEntry[]) || []

  const handlePlatformChange = useCallback(
    (updated: PlatformEntry) => {
      const current = (formData.platformData as PlatformEntry[]) || []
      const idx = current.findIndex((e) => e.platform === updated.platform)
      const next = [...current]
      if (idx >= 0) {
        next[idx] = updated
      } else {
        next.push(updated)
      }
      onChange('platformData', next)
    },
    [formData.platformData, onChange],
  )

  return (
    <div className="space-y-4" data-testid="step3-platforms">

      {/* Financial Platforms */}
      <SectionCard title="Financial Platforms">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FINANCIAL_PLATFORMS.map((platform) => {
            const info = PLATFORM_INFO[platform as PlatformType]
            return (
              <PlatformCard
                key={platform}
                platform={platform}
                displayName={info.name}
                category="financial"
                entry={getEntryForPlatform(platformData, platform)}
                onChange={handlePlatformChange}
              />
            )
          })}
        </div>
      </SectionCard>

      {/* Sports Platforms */}
      <SectionCard title="Sportsbook Platforms">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SPORTS_PLATFORMS.map((platform) => {
            const info = PLATFORM_INFO[platform as PlatformType]
            return (
              <PlatformCard
                key={platform}
                platform={platform}
                displayName={info.name}
                category="sports"
                entry={getEntryForPlatform(platformData, platform)}
                onChange={handlePlatformChange}
              />
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}
