'use client'

import { useCallback } from 'react'
import { PLATFORM_INFO, FINANCIAL_PLATFORMS, SPORTS_PLATFORMS } from '@/lib/platforms'
import { PlatformCard } from './step3-platform-card'
import type { PlatformEntry } from '@/types/backend-types'
import type { PlatformType } from '@/types'

interface Step3Props {
  formData: Record<string, unknown>
  onChange: (field: string, value: unknown) => void
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
    <div className="space-y-5" data-testid="step3-platforms">
      <h2 className="text-lg font-semibold">Step 3: Platform Registration</h2>

      {/* Financial Platforms */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Financial Platforms
        </h3>
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
      </div>

      {/* Sports Platforms */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Sportsbook Platforms
        </h3>
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
      </div>
    </div>
  )
}
