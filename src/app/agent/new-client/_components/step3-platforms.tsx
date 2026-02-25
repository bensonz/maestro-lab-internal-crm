'use client'

import { useCallback, useMemo } from 'react'
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
  onRiskFlagsChange: (flags: Record<string, unknown>) => void
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

function generatePinPair(): { pin4: string; pin6: string } {
  const base = String(Math.floor(1000 + Math.random() * 9000))
  const suffix = String(Math.floor(10 + Math.random() * 90))
  return { pin4: base, pin6: base + suffix }
}

function getEntryForPlatform(
  platformData: PlatformEntry[],
  platform: string,
  pinPair?: { pin4: string; pin6: string },
): PlatformEntry {
  const existing = platformData.find((e) => e.platform === platform)
  if (existing) {
    // Backfill suggested PINs for existing bank entries missing them
    if (platform === 'BANK' && pinPair && !existing.pinSuggested) {
      existing.pinSuggested = pinPair.pin4
      existing.pinSuggested6 = pinPair.pin6
      if (!existing.pin) existing.pin = pinPair.pin4
    }
    return existing
  }
  const base: PlatformEntry = { platform, username: '', accountId: '', screenshot: '', status: '' }
  if (platform === 'BANK' && pinPair) {
    base.pin = pinPair.pin4
    base.pinSuggested = pinPair.pin4
    base.pinSuggested6 = pinPair.pin6
  }
  return base
}

export function Step3Platforms({ formData, onChange, onRiskFlagsChange, activeAssignment }: Step3Props) {
  const platformData = (formData.platformData as PlatformEntry[]) || []
  // Stable suggested PIN pair — generated once per mount, used only if no existing bank entry
  const pinPair = useMemo(() => generatePinPair(), []) // eslint-disable-line react-hooks/exhaustive-deps

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

      if (updated.platform === 'BANK') {
        const pin = updated.pin ?? ''
        const sug4 = updated.pinSuggested ?? ''
        const sug6 = updated.pinSuggested6 ?? ''
        onRiskFlagsChange({ bankPinOverride: pin !== '' && sug4 !== '' && pin !== sug4 && pin !== sug6 })
        const autoDetected = updated.bankAutoDetected
        onRiskFlagsChange({ bankNameOverride: !!autoDetected && !!updated.bank && updated.bank !== autoDetected })
        const bankTouched = !!(updated.screenshot || updated.username || updated.bank)
        onRiskFlagsChange({ bankPhoneEmailNotConfirmed: bankTouched && !updated.bankPhoneEmailConfirmed })
      }
    },
    [formData.platformData, onChange, onRiskFlagsChange],
  )

  return (
    <div className="space-y-4" data-testid="step3-platforms">

      {/* Device Info Banner */}
      {activeAssignment && (
        <div className="rounded-md border border-border/60 bg-muted/30 px-4 py-2.5 text-sm space-y-1" data-testid="device-info-banner">
          <div className="flex items-center gap-3">
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
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Client MUST use company-issued phone and email for all registrations</p>
        </div>
      )}

      {/* Financial Platforms */}
      <SectionCard title="Financial Platforms">
        <div className="flex flex-col gap-2 sm:flex-row">
          {/* Left column */}
          <div className="flex flex-1 flex-col gap-2">
            {FINANCIAL_PLATFORMS.filter((p) => p !== 'BANK').map((platform) => {
              const info = PLATFORM_INFO[platform as PlatformType]
              return (
                <PlatformCard
                  key={platform}
                  platform={platform}
                  displayName={info.name}
                  entry={getEntryForPlatform(platformData, platform)}
                  onChange={handlePlatformChange}
                />
              )
            })}
          </div>
          {/* Right column */}
          <div className="flex-1">
            <PlatformCard
              platform="BANK"
              displayName={PLATFORM_INFO['BANK' as PlatformType].name}
              entry={getEntryForPlatform(platformData, 'BANK', pinPair)}
              onChange={handlePlatformChange}
            />
          </div>
        </div>
      </SectionCard>

      {/* Sports Platforms */}
      <SectionCard title="Sportsbook Platforms">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SPORTS_PLATFORMS.map((platform) => {
            const info = PLATFORM_INFO[platform as PlatformType]
            return (
              <PlatformCard
                key={platform}
                platform={platform}
                displayName={info.name}

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
