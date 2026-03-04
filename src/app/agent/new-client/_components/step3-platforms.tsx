'use client'

import { useCallback, useRef, useMemo, useState } from 'react'
import { PLATFORM_INFO, FINANCIAL_PLATFORMS, STEP3_SPORTS_PLATFORMS } from '@/lib/platforms'
import { PlatformCard } from './step3-platform-card'
import { PayPalCard } from './step3-paypal-card'
import { BulkUploadZone } from './bulk-upload-zone'
import { SportsbookHubModal, getSportsbookImageCount } from './sportsbook-platform-modal'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, Phone, Mail, CheckCircle2, Trash2 } from 'lucide-react'
import { DeadlineCountdown } from '@/components/deadline-countdown'
import { cn } from '@/lib/utils'
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

// ── Sportsbook status helper ────────────────────────────────────────────────

function getSportsbookStatus(entry: PlatformEntry): 'verified' | 'in-progress' | 'not-started' {
  const imgCount = getSportsbookImageCount(entry)
  const hasCreds = !!(entry.username && entry.accountId)
  const isVerified =
    imgCount === 3 &&
    hasCreds &&
    entry.depositPageVerified &&
    entry.addressMatchesBenchmark !== false
  if (isVerified) return 'verified'
  if (imgCount > 0 || hasCreds) return 'in-progress'
  return 'not-started'
}

function getFinancialStatus(entry: PlatformEntry): 'verified' | 'in-progress' | 'not-started' {
  const hasScreenshot = !!entry.screenshot
  const hasCreds = !!(entry.username || entry.accountId)
  if (hasScreenshot && hasCreds) return 'verified'
  if (hasScreenshot || hasCreds) return 'in-progress'
  return 'not-started'
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

  // ── Hub modal state ──
  const [hubModalOpen, setHubModalOpen] = useState(false)
  const [hubInitialPlatform, setHubInitialPlatform] = useState<string>(STEP3_SPORTS_PLATFORMS[0])

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

  // ── Hub modal: update a sportsbook entry by platform key ──
  const handleHubPlatformChange = useCallback(
    (platform: string, updated: PlatformEntry) => {
      const current = (formData.platformData as PlatformEntry[]) || []
      const idx = current.findIndex((e) => e.platform === platform)
      const next = [...current]
      if (idx >= 0) {
        next[idx] = updated
      } else {
        next.push({ ...updated, platform })
      }
      onChange('platformData', next)
    },
    [formData.platformData, onChange],
  )

  // Handle bulk upload distribution: sort screenshots into platform entries
  // Auto-fills the 3 named slots (login, personal info, deposit) from uploaded images
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
          const updated = {
            ...next[idx],
            screenshots: merged,
          }
          // Auto-fill named slots only if they are empty
          if (!updated.screenshot && merged[0]) updated.screenshot = merged[0]
          if (!updated.screenshotPersonalInfo && merged[1]) updated.screenshotPersonalInfo = merged[1]
          if (!updated.screenshotDeposit && merged[2]) {
            updated.screenshotDeposit = merged[2]
            updated.depositDetected = true
          }
          next[idx] = updated
        } else {
          // Create new platform entry with smart slot assignment
          next.push({
            platform,
            username: assignedGmail,
            accountId: '',
            screenshot: paths[0] || '',
            screenshotPersonalInfo: paths[1] || '',
            screenshotDeposit: paths[2] || '',
            depositDetected: !!(paths[2]),
            status: '',
            screenshots: paths,
          })
        }
      }

      onChange('platformData', next)
    },
    [formData.platformData, onChange, assignedGmail],
  )

  // ── Auto-popup hub modal after bulk upload ──
  const handleUploadComplete = useCallback(
    (firstPlatform: PlatformType | null) => {
      if (firstPlatform) {
        setHubInitialPlatform(firstPlatform)
        setHubModalOpen(true)
      }
    },
    [],
  )

  // ── Clear all sportsbook images ──
  const handleClearAllSportsbookImages = useCallback(() => {
    const current = (formData.platformData as PlatformEntry[]) || []
    const next = current.map((e) => {
      if (!(STEP3_SPORTS_PLATFORMS as string[]).includes(e.platform)) return e
      return {
        ...e,
        screenshot: '',
        screenshotPersonalInfo: '',
        screenshotDeposit: '',
        screenshots: [],
        depositDetected: false,
        depositPageVerified: false,
        detectedAddress: undefined,
      }
    })
    onChange('platformData', next)
  }, [formData.platformData, onChange])

  // ── Derive benchmark address #2 from financial platform addresses ──
  const benchmark2Info = useMemo(() => {
    for (const p of ['EDGEBOOST', 'PAYPAL', 'BANK']) {
      const entry = platformData.find((e) => e.platform === p)
      if (entry?.detectedAddress) {
        return { address: entry.detectedAddress, source: PLATFORM_INFO[p as PlatformType]?.name ?? p }
      }
    }
    // Also check discovered addresses from financial platforms
    if (discoveredAddresses?.length) {
      const sourceMap: Record<string, string> = { EDGEBOOST: 'EdgeBoost', PAYPAL: 'PayPal', BANK: 'Online Banking', EdgeBoost: 'EdgeBoost', PayPal: 'PayPal', 'Online Banking': 'Online Banking' }
      const financialAddr = discoveredAddresses.find((d) =>
        Object.keys(sourceMap).includes(d.source),
      )
      if (financialAddr) return { address: financialAddr.address, source: sourceMap[financialAddr.source] ?? financialAddr.source }
    }
    return null
  }, [platformData, discoveredAddresses])
  const benchmarkAddress2 = benchmark2Info?.address ?? null

  // Pre-compute bank entry for status indicator
  const bankEntry = getEntryForPlatform(platformData, 'BANK', pinPair, gmailPrefix)
  const bankStatus = getFinancialStatus(bankEntry)

  // Check if any sportsbook has images (for clear all button visibility)
  const hasSportsbookImages = STEP3_SPORTS_PLATFORMS.some((p) => {
    const entry = platformData.find((e) => e.platform === p)
    return entry && getSportsbookImageCount(entry) > 0
  })

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
              const entry = getEntryForPlatform(platformData, platform, undefined, assignedGmail)
              const status = getFinancialStatus(entry)
              const info = PLATFORM_INFO[platform as PlatformType]
              return (
                <div
                  key={platform}
                  className={cn(
                    'rounded-lg overflow-hidden border-l-[3px]',
                    status === 'verified' && 'border-l-success',
                    status === 'in-progress' && 'border-l-amber-500',
                    status === 'not-started' && 'border-l-border',
                  )}
                >
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/20 border-b border-border/30">
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full',
                        status === 'verified' && 'bg-success',
                        status === 'in-progress' && 'bg-amber-500',
                        status === 'not-started' && 'bg-muted-foreground/30',
                      )}
                    />
                    <span className="text-xs font-medium">{info.name}</span>
                    <span
                      className={cn(
                        'ml-auto text-[10px] font-medium',
                        status === 'verified' && 'text-success',
                        status === 'in-progress' && 'text-amber-600 dark:text-amber-400',
                        status === 'not-started' && 'text-muted-foreground/60',
                      )}
                    >
                      {status === 'verified' ? 'Verified' : status === 'in-progress' ? 'In Progress' : 'Not Started'}
                    </span>
                  </div>
                  {platform === 'PAYPAL' ? (
                    <PayPalCard
                      entry={entry}
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
                  ) : (
                    <PlatformCard
                      platform={platform}
                      displayName={info.name}
                      entry={entry}
                      onChange={handlePlatformChange}
                      suggestedUsername={assignedGmail}
                      suggestedPassword={passwords.EDGEBOOST}
                      onMismatchChange={handleMismatchChange}
                      detectedNewAddress={pendingAddresses?.[platform] ?? null}
                      onAddressConfirm={onAddressConfirm}
                      onAddressDismiss={onAddressDismiss}
                      recordedAddress={(formData.address as string) || null}
                    />
                  )}
                </div>
              )
            })}
          </div>
          {/* Right column: Bank */}
          <div className="flex-1">
            <div
              className={cn(
                'rounded-lg overflow-hidden border-l-[3px]',
                bankStatus === 'verified' && 'border-l-success',
                bankStatus === 'in-progress' && 'border-l-amber-500',
                bankStatus === 'not-started' && 'border-l-border',
              )}
            >
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/20 border-b border-border/30">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    bankStatus === 'verified' && 'bg-success',
                    bankStatus === 'in-progress' && 'bg-amber-500',
                    bankStatus === 'not-started' && 'bg-muted-foreground/30',
                  )}
                />
                <span className="text-xs font-medium">{PLATFORM_INFO['BANK' as PlatformType].name}</span>
                <span
                  className={cn(
                    'ml-auto text-[10px] font-medium',
                    bankStatus === 'verified' && 'text-success',
                    bankStatus === 'in-progress' && 'text-amber-600 dark:text-amber-400',
                    bankStatus === 'not-started' && 'text-muted-foreground/60',
                  )}
                >
                  {bankStatus === 'verified' ? 'Verified' : bankStatus === 'in-progress' ? 'In Progress' : 'Not Started'}
                </span>
              </div>
              <PlatformCard
                platform="BANK"
                displayName={PLATFORM_INFO['BANK' as PlatformType].name}
                entry={bankEntry}
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
        </div>
      </SectionCard>

      {/* Sportsbook Platforms */}
      <SectionCard title="Sportsbook Platforms">
        {/* Bulk Upload Zone — drop screenshots at once */}
        <BulkUploadZone
          platforms={STEP3_SPORTS_PLATFORMS as PlatformType[]}
          onScreenshotsSorted={handleBulkScreenshotsSorted}
          onUploadComplete={handleUploadComplete}
          existingEntries={platformData}
        />

        {hasSportsbookImages && (
          <div className="flex justify-end -mt-2">
            <button
              type="button"
              onClick={handleClearAllSportsbookImages}
              className="flex items-center gap-1 text-[10px] font-medium text-destructive/70 hover:text-destructive transition-colors"
              data-testid="clear-all-sportsbook-images"
            >
              <Trash2 className="h-3 w-3" />
              Clear all images
            </button>
          </div>
        )}

        {/* Simplified sportsbook status cards */}
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {STEP3_SPORTS_PLATFORMS.map((platform) => {
            const info = PLATFORM_INFO[platform as PlatformType]
            const entry = getEntryForPlatform(platformData, platform, undefined, assignedGmail)
            const status = getSportsbookStatus(entry)
            const imgCount = getSportsbookImageCount(entry)

            return (
              <button
                key={platform}
                type="button"
                onClick={() => {
                  setHubInitialPlatform(platform)
                  setHubModalOpen(true)
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md border px-3 py-2.5 text-left transition-colors hover:bg-muted/40',
                  status === 'verified' && 'border-success/30 bg-success/5',
                  status === 'in-progress' && 'border-amber-500/30 bg-amber-500/5',
                  status === 'not-started' && 'border-border/50',
                )}
                data-testid={`sportsbook-card-${platform}`}
              >
                {/* Status dot */}
                <div
                  className={cn(
                    'h-2.5 w-2.5 shrink-0 rounded-full',
                    status === 'verified' && 'bg-success',
                    status === 'in-progress' && 'bg-amber-500',
                    status === 'not-started' && 'bg-muted-foreground/30',
                  )}
                />
                <span className="text-sm font-medium flex-1">{info.name}</span>
                {/* Image count badge */}
                {imgCount > 0 && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'h-5 px-1.5 font-mono text-[10px]',
                      imgCount === 3
                        ? 'border-success/40 bg-success/10 text-success'
                        : 'text-muted-foreground',
                    )}
                  >
                    {imgCount}/3
                  </Badge>
                )}
                <span
                  className={cn(
                    'text-[10px] font-medium',
                    status === 'verified' && 'text-success',
                    status === 'in-progress' && 'text-amber-600 dark:text-amber-400',
                    status === 'not-started' && 'text-muted-foreground/60',
                  )}
                >
                  {status === 'verified'
                    ? 'Verified'
                    : status === 'in-progress'
                      ? 'In Progress'
                      : 'Not Started'}
                </span>
              </button>
            )
          })}
        </div>
      </SectionCard>

      {/* ── Sportsbook Hub Modal ── */}
      <SportsbookHubModal
        open={hubModalOpen}
        onOpenChange={setHubModalOpen}
        platforms={STEP3_SPORTS_PLATFORMS as PlatformType[]}
        entries={platformData}
        onChange={handleHubPlatformChange}
        suggestedUsername={assignedGmail}
        suggestedPassword={passwords.sportsbook}
        onMismatchChange={handleMismatchChange}
        initialPlatform={hubInitialPlatform}
        benchmarkAddress1={(formData.address as string) || null}
        benchmarkAddress2={benchmarkAddress2}
        benchmarkAddress2Source={benchmark2Info?.source ?? null}
        onAddressDiscovered={onAddressDetected}
      />
    </div>
  )
}
