'use client'

import { useCallback } from 'react'
import { PLATFORM_INFO, FINANCIAL_PLATFORMS, SPORTS_PLATFORMS } from '@/lib/platforms'
import { PlatformCard } from './step3-platform-card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, Phone, Mail, CheckCircle2 } from 'lucide-react'
import { DeadlineCountdown } from '@/components/deadline-countdown'
import type { PlatformEntry } from '@/types/backend-types'
import type { PlatformType } from '@/types'
import type { SerializedPhoneAssignment } from './new-client-view'

interface Step3Props {
  formData: Record<string, unknown>
  onChange: (field: string, value: unknown) => void
  activeAssignment: SerializedPhoneAssignment | null
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

export function Step3Platforms({ formData, onChange, activeAssignment }: Step3Props) {
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

      {/* Device Info Banner */}
      {activeAssignment && (
        <div className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/30 px-4 py-2.5 text-sm" data-testid="device-info-banner">
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{activeAssignment.phoneNumber}</span>
          </div>
          {(formData.assignedGmail as string) ? (
            <>
              <span className="text-muted-foreground/40">&middot;</span>
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{formData.assignedGmail as string}</span>
              </div>
            </>
          ) : null}
          <div className="ml-auto">
            {activeAssignment.status === 'RETURNED' ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/20 px-2 py-0.5 text-xs font-medium text-success">
                <CheckCircle2 className="h-3 w-3" />
                Returned
              </span>
            ) : (
              <DeadlineCountdown deadline={activeAssignment.dueBackAt} variant="badge" />
            )}
          </div>
        </div>
      )}

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
