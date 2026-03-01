'use client'

import { useCallback, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScreenshotThumbnail } from '@/components/upload-dropzone'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Upload,
  Loader2,
  CheckCircle2,
  Camera,
  AlertTriangle,
} from 'lucide-react'
import type { PlatformEntry } from '@/types/backend-types'

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

/* ─── Props ──────────────────────────────────────────────────────────── */

interface SportsbookModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  platform: string
  displayName: string
  entry: PlatformEntry
  onChange: (updated: PlatformEntry) => void
  suggestedUsername?: string
  suggestedPassword?: string
  onMismatchChange?: (platform: string, mismatch: { username: boolean; password: boolean } | null) => void
}

export function SportsbookModal({
  open,
  onOpenChange,
  platform,
  displayName,
  entry,
  onChange,
  suggestedUsername,
  suggestedPassword,
  onMismatchChange,
}: SportsbookModalProps) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null)

  // Count filled slots
  const filledCount = IMAGE_SLOTS.filter((slot) => !!entry[slot.key]).length
  const allFilled = filledCount === 3

  // ── Credential mismatch check ──
  const u = entry.username || ''
  const p = entry.accountId || ''
  const su = suggestedUsername || ''
  const sp = suggestedPassword || ''
  const userMismatch = !!(u && su && u !== su)
  const passMismatch = !!(p && sp && p !== sp)
  const hasMismatch = userMismatch || passMismatch

  // ── Handlers ──

  function handleChange(field: keyof PlatformEntry, value: string) {
    const updated = { ...entry, [field]: value }
    onChange(updated)

    // Check mismatch on credential changes
    if (field === 'username' || field === 'accountId') {
      const newU = field === 'username' ? value : entry.username || ''
      const newP = field === 'accountId' ? value : entry.accountId || ''
      const um = !!(newU && su && newU !== su)
      const pm = !!(newP && sp && newP !== sp)
      const m = (um || pm) ? { username: um, password: pm } : null
      onMismatchChange?.(platform, m ?? { username: false, password: false })
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
          const updated: PlatformEntry = { ...entry, [slotKey]: data.url }
          // If deposit slot, set depositDetected
          if (slotKey === 'screenshotDeposit') {
            updated.depositDetected = true
          }
          onChange(updated)
        }
      } catch {
        // silent
      } finally {
        setUploadingSlot(null)
      }
    },
    [entry, onChange],
  )

  const handleDeleteSlot = useCallback(
    (slotKey: string) => {
      const updated: PlatformEntry = { ...entry, [slotKey]: '' }
      if (slotKey === 'screenshotDeposit') {
        updated.depositDetected = false
      }
      if (slotKey === 'screenshot') {
        // Clear mismatch when login screenshot deleted
        onMismatchChange?.(platform, null)
      }
      onChange(updated)
    },
    [entry, onChange, onMismatchChange, platform],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid={`sportsbook-modal-${platform}`}>
        <DialogTitle className="flex items-center gap-3 text-sm font-medium">
          <span>{displayName}</span>
          <Badge
            variant="outline"
            className={`h-5 px-1.5 font-mono text-[10px] ${
              allFilled
                ? 'border-success/40 bg-success/10 text-success'
                : 'border-primary/30 bg-primary/10 text-primary'
            }`}
          >
            {filledCount}/3 images
          </Badge>
          {entry.depositDetected && (
            <Badge
              variant="outline"
              className="h-5 gap-1 border-success/40 bg-success/10 px-1.5 text-[10px] text-success"
            >
              <CheckCircle2 className="h-2.5 w-2.5" />
              Deposit Ready
            </Badge>
          )}
        </DialogTitle>

        <div className="space-y-4">
          {/* ── 3 Image Upload Slots ── */}
          <div className="grid gap-3">
            {IMAGE_SLOTS.map((slot) => {
              const src = entry[slot.key] as string | undefined
              const isUploading = uploadingSlot === slot.key

              return (
                <div
                  key={slot.key}
                  className="flex items-start gap-3 rounded-md border border-border/50 p-2.5"
                  data-testid={`slot-${slot.key}`}
                >
                  {/* Thumbnail or upload zone */}
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
                          ref={(el) => { inputRefs.current[slot.key] = el }}
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
                          onClick={() => inputRefs.current[slot.key]?.click()}
                          disabled={isUploading}
                          className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-border/60 bg-muted/20 transition-colors hover:border-primary/50 hover:bg-muted/40 disabled:opacity-50"
                          data-testid={`upload-${slot.key}`}
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

                  {/* Label + description */}
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{slot.label}</p>
                      {src && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {slot.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Credentials ── */}
          <div className="space-y-2 border-t border-border/40 pt-3">
            <p className="text-xs font-medium text-muted-foreground">
              Login Credentials
            </p>
            <div className="flex items-center gap-2">
              <Input
                id={`modal-${platform}-username`}
                placeholder={suggestedUsername || 'Username'}
                value={entry.username || ''}
                onChange={(e) => handleChange('username', e.target.value)}
                className="h-8 flex-1 text-sm"
                data-testid={`modal-username-${platform}`}
              />
              <div className="relative flex-1">
                {suggestedPassword && (
                  <button
                    type="button"
                    onClick={() => handleChange('accountId', suggestedPassword)}
                    className="absolute -top-3.5 right-0 text-[10px] text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                    tabIndex={-1}
                  >
                    {suggestedPassword}
                  </button>
                )}
                <Input
                  id={`modal-${platform}-password`}
                  placeholder="Password"
                  value={entry.accountId || ''}
                  onChange={(e) => handleChange('accountId', e.target.value)}
                  className="h-8 text-sm"
                  data-testid={`modal-password-${platform}`}
                />
              </div>
            </div>

            {/* Mismatch warning */}
            {hasMismatch && (
              <p className="flex items-center gap-1 text-xs text-destructive" data-testid={`modal-mismatch-${platform}`}>
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {[userMismatch && 'username', passMismatch && 'password']
                  .filter(Boolean)
                  .join(' & ')}{' '}
                {userMismatch && passMismatch ? 'do' : 'does'} not match suggestion
              </p>
            )}
          </div>

          {/* ── Done Button ── */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              data-testid={`modal-done-${platform}`}
            >
              Done
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Helper: count images for a sportsbook entry ───────────────────── */

export function getSportsbookImageCount(entry: PlatformEntry): number {
  let count = 0
  if (entry.screenshot) count++
  if (entry.screenshotPersonalInfo) count++
  if (entry.screenshotDeposit) count++
  return count
}
