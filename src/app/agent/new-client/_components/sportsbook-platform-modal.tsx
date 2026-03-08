'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ScreenshotThumbnail } from '@/components/upload-dropzone'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Loader2,
  CheckCircle2,
  Camera,
  AlertTriangle,
  Trash2,
  ArrowLeftRight,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PLATFORM_INFO } from '@/lib/platforms'
import { mockExtractAddressFromScreenshot } from './mock-extract-id'
import { cn } from '@/lib/utils'
import type { PlatformEntry } from '@/types/backend-types'
import type { PlatformType } from '@/types'

/* ─── Slot definitions ───────────────────────────────────────────────── */

interface ImageSlot {
  key: 'screenshot' | 'screenshotPersonalInfo' | 'screenshotDeposit'
  label: string
  description: string
}

const IMAGE_SLOTS: ImageSlot[] = [
  {
    key: 'screenshot',
    label: 'Login Credentials',
    description: 'Screenshot showing logged-in state with username visible',
  },
  {
    key: 'screenshotPersonalInfo',
    label: 'Personal Info',
    description: 'Profile page showing name, address, and personal details',
  },
  {
    key: 'screenshotDeposit',
    label: 'Ready to Deposit',
    description: 'Deposit page confirming account can accept funds',
  },
]

/* ─── Helper: count images for a sportsbook entry ───────────────────── */

export function getSportsbookImageCount(entry: PlatformEntry): number {
  let count = 0
  if (entry.screenshot) count++
  if (entry.screenshotPersonalInfo) count++
  if (entry.screenshotDeposit) count++
  return count
}

/* ─── Status helpers ─────────────────────────────────────────────────── */

function getPlatformStatus(entry: PlatformEntry): 'verified' | 'in-progress' | 'not-started' {
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

/* ─── Props ──────────────────────────────────────────────────────────── */

interface SportsbookHubModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  platforms: PlatformType[]
  entries: PlatformEntry[]
  onChange: (platform: string, updated: PlatformEntry) => void
  suggestedUsername: string
  suggestedPassword: string
  onMismatchChange?: (platform: string, mismatch: { username: boolean; password: boolean } | null) => void
  initialPlatform?: string
  benchmarkAddress1: string | null
  benchmarkAddress2: string | null
  /** Human-readable source name for benchmark address #2 (e.g. "PayPal", "EdgeBoost") */
  benchmarkAddress2Source?: string | null
  onAddressDiscovered?: (platform: string, address: string) => void
}

export function SportsbookHubModal({
  open,
  onOpenChange,
  platforms,
  entries,
  onChange,
  suggestedUsername,
  suggestedPassword,
  onMismatchChange,
  initialPlatform,
  benchmarkAddress1,
  benchmarkAddress2,
  benchmarkAddress2Source,
  onAddressDiscovered,
}: SportsbookHubModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>(
    initialPlatform || platforms[0],
  )
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null)
  const [differentAddress, setDifferentAddress] = useState('')
  const [showSaved, setShowSaved] = useState(false)

  // Reset selection when modal opens with a new initial platform
  useEffect(() => {
    if (open && initialPlatform) {
      setSelectedPlatform(initialPlatform)
      setDifferentAddress('')
    }
  }, [open, initialPlatform])

  // Get entry for the selected platform
  const getEntry = useCallback(
    (platform: string): PlatformEntry => {
      return (
        entries.find((e) => e.platform === platform) || {
          platform,
          username: '',
          accountId: '',
          screenshot: '',
          status: '',
        }
      )
    },
    [entries],
  )

  const selectedEntry = getEntry(selectedPlatform)

  // ── Credential mismatch check ──
  const u = selectedEntry.username || ''
  const p = selectedEntry.accountId || ''
  const su = suggestedUsername || ''
  const sp = suggestedPassword || ''
  const userMismatch = !!(u && su && u !== su)
  const passMismatch = !!(p && sp && p !== sp)
  const hasMismatch = userMismatch || passMismatch

  // ── Handlers ──

  function handleChange(field: keyof PlatformEntry, value: unknown) {
    const updated = { ...selectedEntry, [field]: value }
    onChange(selectedPlatform, updated)

    if (field === 'username' || field === 'accountId') {
      const newU = field === 'username' ? (value as string) : selectedEntry.username || ''
      const newP = field === 'accountId' ? (value as string) : selectedEntry.accountId || ''
      const um = !!(newU && su && newU !== su)
      const pm = !!(newP && sp && newP !== sp)
      const m = um || pm ? { username: um, password: pm } : null
      onMismatchChange?.(selectedPlatform, m ?? { username: false, password: false })
    }
  }

  const handleUpload = useCallback(
    async (slotKey: string, file: File) => {
      const body = new FormData()
      body.append('file', file)
      setUploadingSlot(slotKey)
      try {
        const res = await fetch('/api/upload/public', { method: 'POST', body })
        const data = await res.json()
        if (res.ok) {
          const updated: PlatformEntry = { ...selectedEntry, [slotKey]: data.url }
          if (slotKey === 'screenshotDeposit') {
            updated.depositDetected = true
          }
          // Address OCR for Personal Info screenshots
          if (slotKey === 'screenshotPersonalInfo') {
            try {
              const addrResult = await mockExtractAddressFromScreenshot(
                file,
                selectedPlatform as PlatformType,
              )
              if (addrResult.detectedAddress) {
                updated.detectedAddress = addrResult.detectedAddress
                // Check if address differs from benchmarks
                const matchesBenchmark1 = benchmarkAddress1
                  ? addrResult.detectedAddress.toLowerCase().includes(benchmarkAddress1.toLowerCase())
                  : false
                const matchesBenchmark2 = benchmarkAddress2
                  ? addrResult.detectedAddress.toLowerCase().includes(benchmarkAddress2.toLowerCase())
                  : false
                if (!matchesBenchmark1 && !matchesBenchmark2) {
                  updated.addressMatchesBenchmark = false
                }
                onAddressDiscovered?.(selectedPlatform, addrResult.detectedAddress)
              }
            } catch {
              // Address detection failed — continue without it
            }
          }
          onChange(selectedPlatform, updated)
        }
      } catch {
        // silent
      } finally {
        setUploadingSlot(null)
      }
    },
    [selectedEntry, onChange, selectedPlatform, benchmarkAddress1, benchmarkAddress2, onAddressDiscovered],
  )

  const handleDeleteSlot = useCallback(
    (slotKey: string) => {
      const updated: PlatformEntry = { ...selectedEntry, [slotKey]: '' }
      if (slotKey === 'screenshotDeposit') {
        updated.depositDetected = false
        updated.depositPageVerified = false
      }
      if (slotKey === 'screenshot') {
        onMismatchChange?.(selectedPlatform, null)
      }
      onChange(selectedPlatform, updated)
    },
    [selectedEntry, onChange, onMismatchChange, selectedPlatform],
  )

  const handleAddressMismatch = useCallback(() => {
    if (differentAddress.trim() && onAddressDiscovered) {
      onAddressDiscovered(selectedPlatform, differentAddress.trim())
      setDifferentAddress('')
    }
  }, [differentAddress, onAddressDiscovered, selectedPlatform])

  // ── Clear all images for current platform ──
  const handleClearPlatform = useCallback(() => {
    const updated: PlatformEntry = {
      ...selectedEntry,
      screenshot: '',
      screenshotPersonalInfo: '',
      screenshotDeposit: '',
      screenshots: [],
      depositDetected: false,
      depositPageVerified: false,
      detectedAddress: undefined,
    }
    onMismatchChange?.(selectedPlatform, null)
    onChange(selectedPlatform, updated)
  }, [selectedEntry, selectedPlatform, onChange, onMismatchChange])

  // ── Move image between slots (same platform) ──
  const handleMoveSlot = useCallback(
    (fromSlot: string, toSlot: string) => {
      const fromUrl = selectedEntry[fromSlot as keyof PlatformEntry] as string
      const toUrl = (selectedEntry[toSlot as keyof PlatformEntry] as string) || ''
      const updated = { ...selectedEntry, [fromSlot]: toUrl, [toSlot]: fromUrl }
      // Handle deposit-specific flags
      if (fromSlot === 'screenshotDeposit' && !toUrl) {
        updated.depositDetected = false
        updated.depositPageVerified = false
      }
      if (toSlot === 'screenshotDeposit' && fromUrl) {
        updated.depositDetected = true
      }
      onChange(selectedPlatform, updated)
    },
    [selectedEntry, onChange, selectedPlatform],
  )

  // ── Move image to a different platform ──
  const handleMovePlatform = useCallback(
    (slotKey: string, targetPlatform: string) => {
      const url = selectedEntry[slotKey as keyof PlatformEntry] as string
      if (!url) return
      // Clear from current platform
      const clearedCurrent: PlatformEntry = { ...selectedEntry, [slotKey]: '' }
      if (slotKey === 'screenshotDeposit') {
        clearedCurrent.depositDetected = false
        clearedCurrent.depositPageVerified = false
      }
      if (slotKey === 'screenshot') {
        onMismatchChange?.(selectedPlatform, null)
      }
      onChange(selectedPlatform, clearedCurrent)
      // Add to target platform
      const targetEntry = entries.find((e) => e.platform === targetPlatform) || {
        platform: targetPlatform,
        username: '',
        accountId: '',
        screenshot: '',
        status: '',
      }
      const updatedTarget: PlatformEntry = { ...targetEntry, [slotKey]: url }
      if (slotKey === 'screenshotDeposit' && url) {
        updatedTarget.depositDetected = true
      }
      onChange(targetPlatform, updatedTarget)
    },
    [selectedEntry, entries, onChange, selectedPlatform, onMismatchChange],
  )

  const displayName = PLATFORM_INFO[selectedPlatform as PlatformType]?.name ?? selectedPlatform

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!max-w-[900px] w-[85vw] p-0 gap-0 overflow-hidden"
        data-testid="sportsbook-hub-modal"
      >
        <DialogTitle className="sr-only">Sportsbook Platforms</DialogTitle>

        <div className="grid grid-cols-[300px_1fr] h-[min(85vh,720px)]">
          {/* ═══ Left Panel: Platform List ═══ */}
          <div className="border-r border-border/50 bg-muted/20 flex flex-col">
            <div className="border-b border-border/40 px-4 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sportsbook Platforms
              </h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-0.5">
                {platforms.map((platform) => {
                  const entry = getEntry(platform)
                  const info = PLATFORM_INFO[platform]
                  const status = getPlatformStatus(entry)
                  const isActive = platform === selectedPlatform

                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => {
                        setSelectedPlatform(platform)
                        setDifferentAddress('')
                      }}
                      className={cn(
                        'flex w-full items-start gap-2.5 rounded-md px-3 py-2.5 text-left transition-colors',
                        isActive
                          ? 'bg-primary/10 ring-1 ring-primary/30'
                          : 'hover:bg-muted/40',
                      )}
                      data-testid={`hub-platform-${platform}`}
                    >
                      {/* Status dot */}
                      <div
                        className={cn(
                          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                          status === 'verified' && 'bg-success',
                          status === 'in-progress' && 'bg-amber-500',
                          status === 'not-started' && 'bg-muted-foreground/30',
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{info.name}</p>
                        <div className="mt-0.5 space-y-0.5">
                          <p className="text-[10px] text-muted-foreground truncate font-mono">
                            {entry.username || suggestedUsername || '---'}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate font-mono">
                            {entry.accountId || suggestedPassword || '---'}
                          </p>
                        </div>
                      </div>
                      {/* Image count */}
                      <Badge
                        variant="outline"
                        className={cn(
                          'shrink-0 h-5 px-1.5 font-mono text-[10px]',
                          getSportsbookImageCount(entry) === 3
                            ? 'border-success/40 bg-success/10 text-success'
                            : 'text-muted-foreground',
                        )}
                      >
                        {getSportsbookImageCount(entry)}/3
                      </Badge>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          {/* ═══ Right Panel: Selected Platform Detail ═══ */}
          <div className="flex flex-col h-full min-h-0 overflow-hidden">
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-5 space-y-5">
              {/* Header */}
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold">{displayName}</h2>
                <Badge
                  variant="outline"
                  className={cn(
                    'h-5 px-1.5 font-mono text-[10px]',
                    getSportsbookImageCount(selectedEntry) === 3
                      ? 'border-success/40 bg-success/10 text-success'
                      : 'border-primary/30 bg-primary/10 text-primary',
                  )}
                >
                  {getSportsbookImageCount(selectedEntry)}/3 images
                </Badge>
                {selectedEntry.depositPageVerified && selectedEntry.screenshotDeposit && (
                  <Badge
                    variant="outline"
                    className="h-5 gap-1 border-success/40 bg-success/10 px-1.5 text-[10px] text-success"
                  >
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Verified
                  </Badge>
                )}
                {getSportsbookImageCount(selectedEntry) > 0 && (
                  <button
                    type="button"
                    onClick={handleClearPlatform}
                    className="ml-auto flex items-center gap-1 rounded-md border border-destructive/30 px-2 py-1 text-[10px] font-medium text-destructive transition-colors hover:bg-destructive/10"
                    data-testid={`hub-clear-${selectedPlatform}`}
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear images
                  </button>
                )}
              </div>

              {/* ── 3 Image Upload Slots ── */}
              <div className="grid gap-3">
                {IMAGE_SLOTS.map((slot) => {
                  const src = selectedEntry[slot.key] as string | undefined
                  const isUploading = uploadingSlot === slot.key

                  return (
                    <div
                      key={slot.key}
                      className="flex items-start gap-3 rounded-md border border-border/50 p-2.5"
                      data-testid={`slot-${slot.key}-${selectedPlatform}`}
                    >
                      <div className="shrink-0">
                        {src ? (
                          <ScreenshotThumbnail
                            src={src}
                            onDelete={() => handleDeleteSlot(slot.key)}
                            size="md"
                          />
                        ) : (
                          <>
                            <input
                              ref={(el) => {
                                inputRefs.current[`${selectedPlatform}-${slot.key}`] = el
                              }}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleUpload(slot.key, file)
                                e.target.value = ''
                              }}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                inputRefs.current[`${selectedPlatform}-${slot.key}`]?.click()
                              }
                              disabled={isUploading}
                              className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-border/60 bg-muted/20 transition-colors hover:border-primary/50 hover:bg-muted/40 disabled:opacity-50"
                              data-testid={`upload-${slot.key}-${selectedPlatform}`}
                            >
                              {isUploading ? (
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              ) : (
                                <Camera className="h-5 w-5 text-muted-foreground" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pt-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{slot.label}</p>
                          {src && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {slot.description}
                        </p>
                        {src && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <Select onValueChange={(target) => handleMoveSlot(slot.key, target)}>
                              <SelectTrigger className="h-6 w-auto gap-1 px-2 text-[10px]" size="sm">
                                <ArrowLeftRight className="h-3 w-3" />
                                <SelectValue placeholder="Move to slot" />
                              </SelectTrigger>
                              <SelectContent>
                                {IMAGE_SLOTS.filter((s) => s.key !== slot.key).map((s) => (
                                  <SelectItem key={s.key} value={s.key} className="text-xs">
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select onValueChange={(target) => handleMovePlatform(slot.key, target)}>
                              <SelectTrigger className="h-6 w-auto gap-1 px-2 text-[10px]" size="sm">
                                <ArrowLeftRight className="h-3 w-3" />
                                <SelectValue placeholder="Move to platform" />
                              </SelectTrigger>
                              <SelectContent>
                                {platforms.filter((p) => p !== selectedPlatform).map((p) => (
                                  <SelectItem key={p} value={p} className="text-xs">
                                    {PLATFORM_INFO[p].name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* ── Credentials ── */}
              <div className="space-y-3 rounded-md border border-border/50 bg-muted/10 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Login Credentials</p>
                  {selectedEntry.username && selectedEntry.accountId && !hasMismatch && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  )}
                  {hasMismatch && (
                    <span className="flex items-center gap-1 text-[10px] text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      Mismatch
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-medium text-muted-foreground">Username</span>
                      {suggestedUsername && !selectedEntry.username && (
                        <button
                          type="button"
                          onClick={() => handleChange('username', suggestedUsername)}
                          className="text-[10px] text-primary hover:text-primary/80 transition-colors"
                          tabIndex={-1}
                        >
                          Fill suggested
                        </button>
                      )}
                    </div>
                    <Input
                      placeholder={suggestedUsername || 'Username'}
                      value={selectedEntry.username || ''}
                      onChange={(e) => handleChange('username', e.target.value)}
                      className="h-9 font-mono text-sm"
                      data-testid={`hub-username-${selectedPlatform}`}
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-medium text-muted-foreground">Password</span>
                      {suggestedPassword && !selectedEntry.accountId && (
                        <button
                          type="button"
                          onClick={() => handleChange('accountId', suggestedPassword)}
                          className="text-[10px] text-primary hover:text-primary/80 transition-colors"
                          tabIndex={-1}
                        >
                          Fill suggested
                        </button>
                      )}
                    </div>
                    <Input
                      placeholder="Password"
                      value={selectedEntry.accountId || ''}
                      onChange={(e) => handleChange('accountId', e.target.value)}
                      className="h-9 font-mono text-sm"
                      data-testid={`hub-password-${selectedPlatform}`}
                    />
                  </div>
                </div>
              </div>

              {/* ── Verification Checkboxes ── */}
              <div className="border-t border-border/40 pt-4">
                {/* Deposit — single row */}
                <label
                  htmlFor={`deposit-verified-${selectedPlatform}`}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2 py-2 cursor-pointer transition-colors hover:bg-muted/30',
                    !selectedEntry.screenshotDeposit && 'opacity-50',
                  )}
                >
                  <Checkbox
                    id={`deposit-verified-${selectedPlatform}`}
                    checked={!!selectedEntry.depositPageVerified}
                    onCheckedChange={(checked) =>
                      handleChange('depositPageVerified', !!checked)
                    }
                    disabled={!selectedEntry.screenshotDeposit}
                    data-testid={`hub-deposit-checkbox-${selectedPlatform}`}
                  />
                  <span className="text-sm">Deposit page verified</span>
                </label>

                {/* Address — single row + inline detail */}
                <label
                  htmlFor={`address-match-${selectedPlatform}`}
                  className="flex items-center gap-2.5 rounded-md px-2 py-2 cursor-pointer transition-colors hover:bg-muted/30"
                >
                  <Checkbox
                    id={`address-match-${selectedPlatform}`}
                    checked={selectedEntry.addressMatchesBenchmark ?? true}
                    onCheckedChange={(checked) => {
                      handleChange('addressMatchesBenchmark', !!checked)
                      if (checked) setDifferentAddress('')
                    }}
                    data-testid={`hub-address-checkbox-${selectedPlatform}`}
                  />
                  <span className="text-sm flex-1">Address verified</span>
                  {/* Inline context when unchecked */}
                  {selectedEntry.addressMatchesBenchmark === false && (() => {
                    const detected = selectedEntry.detectedAddress
                    const matchesBm1 = detected && benchmarkAddress1 && detected.toLowerCase().includes(benchmarkAddress1.toLowerCase())
                    const matchesBm2 = detected && benchmarkAddress2 && detected.toLowerCase().includes(benchmarkAddress2.toLowerCase())
                    if (matchesBm2 && benchmarkAddress2Source) {
                      return <span className="text-xs text-muted-foreground">Same as {benchmarkAddress2Source}</span>
                    }
                    if (matchesBm1) {
                      return <span className="text-xs text-muted-foreground">Same as ID address</span>
                    }
                    if (detected) {
                      return <span className="text-xs text-amber-600 dark:text-amber-400 truncate max-w-[250px]" title={detected}>{detected}</span>
                    }
                    return null
                  })()}
                </label>

                {/* Manual address entry — only if unchecked AND no detected address */}
                {selectedEntry.addressMatchesBenchmark === false && !selectedEntry.detectedAddress && (
                  <div className="flex items-center gap-2 px-2 pb-1 ml-7">
                    <Input
                      placeholder="Enter detected address..."
                      value={differentAddress}
                      onChange={(e) => { e.stopPropagation(); setDifferentAddress(e.target.value) }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-8 text-sm flex-1"
                      data-testid={`hub-diff-address-${selectedPlatform}`}
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); handleAddressMismatch() }}
                      disabled={!differentAddress.trim()}
                      className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
                      data-testid={`hub-record-address-${selectedPlatform}`}
                    >
                      Record
                    </button>
                  </div>
                )}
              </div>

            </div>
          </ScrollArea>

          {/* ── Save / Done Buttons — fixed footer ── */}
          <div className="flex shrink-0 items-center justify-between border-t border-border/40 px-5 py-3">
            {showSaved ? (
              <span className="flex items-center gap-1 text-xs text-success animate-in fade-in">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Saved
              </span>
            ) : <div />}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSaved(true)
                  setTimeout(() => setShowSaved(false), 1500)
                }}
                className="rounded-md border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                data-testid={`hub-save-${selectedPlatform}`}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                data-testid="hub-modal-done"
              >
                Done
              </button>
            </div>
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
