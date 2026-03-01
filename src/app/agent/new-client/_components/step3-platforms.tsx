'use client'

import { useCallback, useRef } from 'react'
import { PLATFORM_INFO, FINANCIAL_PLATFORMS, SPORTS_PLATFORMS } from '@/lib/platforms'
import { PlatformCard } from './step3-platform-card'
import { PayPalCard } from './step3-paypal-card'
import { BulkUploadZone } from './bulk-upload-zone'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, Phone, Mail, CheckCircle2 } from 'lucide-react'
import { DeadlineCountdown } from '@/components/deadline-countdown'
import type { PlatformEntry, DiscoveredAddress } from '@/types/backend-types'
import type { PlatformType } from '@/types'
import type { SerializedPhoneAssignment } from './new-client-view'

interface Step3Props {
  formData: Record<string, unknown>
  onChange: (field: string, value: unknown) => void
  onRiskFlagsChange: (flags: Record<string, unknown>) => void
  activeAssignment: SerializedPhoneAssignment | null
  /** Discovered addresses from progressive OCR */
  discoveredAddresses?: DiscoveredAddress[]
  /** Callback when a new address is detected from screenshot OCR */
  onAddressDetected?: (platform: string, address: string) => void
  /** Per-platform detected new addresses (set by parent when OCR finds a new address) */
  pendingAddresses?: Record<string, string>
  onAddressConfirm?: (platform: string, address: string) => void
  onAddressDismiss?: (platform: string) => void
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

import type { GeneratedCredentials } from './client-form'

// ── Entry helpers ───────────────────────────────────────────────────────────

function getEntryForPlatform(
  platformData: PlatformEntry[],
  platform: string,
  pinPair?: { pin4: string; pin6: string },
  defaultUsername?: string,
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
  const base: PlatformEntry = {
    platform,
    username: defaultUsername || '',
    accountId: '',
    screenshot: '',
    status: '',
  }
  if (platform === 'BANK' && pinPair) {
    base.pin = pinPair.pin4
    base.pinSuggested = pinPair.pin4
    base.pinSuggested6 = pinPair.pin6
  }
  return base
}

export function Step3Platforms({
  formData,
  onChange,
  onRiskFlagsChange,
  activeAssignment,
  discoveredAddresses,
  onAddressDetected,
  pendingAddresses,
  onAddressConfirm,
  onAddressDismiss,
}: Step3Props) {
  const platformData = (formData.platformData as PlatformEntry[]) || []

  // Track per-platform credential mismatches for risk panel
  const mismatchesRef = useRef<Record<string, { username: boolean; password: boolean }>>({})

  const handleMismatchChange = useCallback(
    (platform: string, mismatch: { username: boolean; password: boolean } | null) => {
      if (mismatch) {
        // Always store — even { username: false, password: false } means "checked, all matched"
        mismatchesRef.current = { ...mismatchesRef.current, [platform]: mismatch }
      } else {
        // null = screenshot deleted, remove from tracking
        const next = { ...mismatchesRef.current }
        delete next[platform]
        mismatchesRef.current = next
      }
      onRiskFlagsChange({ credentialMismatches: { ...mismatchesRef.current } })
    },
    [onRiskFlagsChange],
  )

  // ── Read persisted credentials (generated at form level in client-form.tsx) ──
  const creds = (formData.generatedCredentials ?? {}) as GeneratedCredentials
  const storedPwds = creds.platformPasswords ?? {}
  const passwords = {
    sportsbook: storedPwds.sportsbook ?? '',
    BETMGM:     storedPwds.BETMGM     ?? '',
    PAYPAL:     storedPwds.PAYPAL     ?? '',
    EDGEBOOST:  storedPwds.EDGEBOOST  ?? '',
    BANK:       storedPwds.BANK       ?? '',
  }
  const pinPair = {
    pin4: creds.bankPin4 ?? '',
    pin6: creds.bankPin6 ?? '',
  }

  // Username rules:
  //   Bank — use gmail prefix (online banking rejects email format)
  //   All others — use full company gmail
  const assignedGmail = (formData.assignedGmail as string) || ''
  const gmailPrefix = assignedGmail ? assignedGmail.replace(/@gmail\.com$/i, '') : ''

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

  // Handle bulk upload distribution: sort screenshots into platform entries
  const handleBulkScreenshotsSorted = useCallback(
    (sorted: Map<PlatformType, string[]>) => {
      const current = (formData.platformData as PlatformEntry[]) || []
      const next = [...current]

      for (const [platform, paths] of sorted.entries()) {
        const idx = next.findIndex((e) => e.platform === platform)
        if (idx >= 0) {
          // Merge new screenshots with existing
          const existing = next[idx].screenshots ?? []
          const merged = [...existing, ...paths.filter((p) => !existing.includes(p))]
          next[idx] = {
            ...next[idx],
            screenshot: next[idx].screenshot || merged[0] || '',
            screenshots: merged,
          }
        } else {
          // Create new platform entry
          next.push({
            platform,
            username: assignedGmail,
            accountId: '',
            screenshot: paths[0] || '',
            status: '',
            screenshots: paths,
          })
        }
      }

      onChange('platformData', next)
    },
    [formData.platformData, onChange, assignedGmail],
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
            {assignedGmail ? (
              <>
                <span className="text-muted-foreground/40">&middot;</span>
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{assignedGmail}</span>
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
          {/* Left column: PayPal + EdgeBoost */}
          <div className="flex flex-1 flex-col gap-2">
            {FINANCIAL_PLATFORMS.filter((p) => p !== 'BANK').map((platform) => {
              if (platform === 'PAYPAL') {
                return (
                  <PayPalCard
                    key="PAYPAL"
                    entry={getEntryForPlatform(platformData, 'PAYPAL', undefined, assignedGmail)}
                    onChange={handlePlatformChange}
                    paypalPreviouslyUsed={formData.paypalPreviouslyUsed as boolean | null | undefined}
                    paypalSsnLinked={formData.paypalSsnLinked as boolean | null | undefined}
                    assignedGmail={assignedGmail}
                    suggestedPassword={passwords.PAYPAL}
                    onMismatchChange={handleMismatchChange}
                    recordedAddress={(formData.address as string) || null}
                    detectedNewAddress={pendingAddresses?.['PAYPAL'] ?? null}
                    onAddressConfirm={onAddressConfirm}
                    onAddressDismiss={onAddressDismiss}
                  />
                )
              }
              const info = PLATFORM_INFO[platform as PlatformType]
              return (
                <PlatformCard
                  key={platform}
                  platform={platform}
                  displayName={info.name}
                  entry={getEntryForPlatform(platformData, platform, undefined, assignedGmail)}
                  onChange={handlePlatformChange}
                  suggestedUsername={assignedGmail}
                  suggestedPassword={passwords.EDGEBOOST}
                  onMismatchChange={handleMismatchChange}
                  detectedNewAddress={pendingAddresses?.[platform] ?? null}
                  onAddressConfirm={onAddressConfirm}
                  onAddressDismiss={onAddressDismiss}
                  recordedAddress={(formData.address as string) || null}
                />
              )
            })}
          </div>
          {/* Right column: Bank */}
          <div className="flex-1">
            <PlatformCard
              platform="BANK"
              displayName={PLATFORM_INFO['BANK' as PlatformType].name}
              entry={getEntryForPlatform(platformData, 'BANK', pinPair, gmailPrefix)}
              onChange={handlePlatformChange}
              suggestedUsername={gmailPrefix}
              suggestedPassword={passwords.BANK}
              onMismatchChange={handleMismatchChange}
              detectedNewAddress={pendingAddresses?.['BANK'] ?? null}
              onAddressConfirm={onAddressConfirm}
              onAddressDismiss={onAddressDismiss}
            />
          </div>
        </div>
      </SectionCard>

      {/* Sports Platforms */}
      <SectionCard title="Sportsbook Platforms">
        {/* Bulk Upload Zone — drop 20-30 screenshots at once */}
        <BulkUploadZone
          platforms={SPORTS_PLATFORMS as PlatformType[]}
          onScreenshotsSorted={handleBulkScreenshotsSorted}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SPORTS_PLATFORMS.map((platform) => {
            const info = PLATFORM_INFO[platform as PlatformType]
            // BetMGM gets its own unique password; the other 7 share one password
            const suggestedPassword = platform === 'BETMGM' ? passwords.BETMGM : passwords.sportsbook
            return (
              <PlatformCard
                key={platform}
                platform={platform}
                displayName={info.name}
                entry={getEntryForPlatform(platformData, platform, undefined, assignedGmail)}
                onChange={handlePlatformChange}
                suggestedUsername={assignedGmail}
                suggestedPassword={suggestedPassword}
                onMismatchChange={handleMismatchChange}
                detectedNewAddress={pendingAddresses?.[platform] ?? null}
                onAddressConfirm={onAddressConfirm}
                onAddressDismiss={onAddressDismiss}
              />
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}
