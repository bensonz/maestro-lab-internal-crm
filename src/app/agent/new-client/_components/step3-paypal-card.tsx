'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ScreenshotThumbnail } from '@/components/upload-dropzone'
import { Upload, Loader2, AlertTriangle, MapPin, Check, X, CheckCircle2, ScanLine } from 'lucide-react'
import { mockExtractFromPaypal, mockExtractAddressFromScreenshot } from './mock-extract-id'
import { addressesMatch } from '@/lib/address-utils'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import type { PlatformEntry } from '@/types/backend-types'

interface PayPalCardProps {
  entry: PlatformEntry
  onChange: (updated: PlatformEntry) => void
  paypalPreviouslyUsed: boolean | null | undefined
  paypalSsnLinked: boolean | null | undefined
  assignedGmail?: string
  suggestedPassword?: string
  onMismatchChange?: (platform: string, mismatch: { username: boolean; password: boolean } | null) => void
  /** Recorded address from Step 1 (ID document) */
  recordedAddress?: string | null
  /** New address detected via OCR on address proof screenshot */
  detectedNewAddress?: string | null
  onAddressConfirm?: (platform: string, address: string) => void
  onAddressDismiss?: (platform: string) => void
}

export function PayPalCard({
  entry,
  onChange,
  paypalPreviouslyUsed,
  paypalSsnLinked,
  assignedGmail,
  suggestedPassword,
  onMismatchChange,
  recordedAddress,
  detectedNewAddress,
  onAddressConfirm,
  onAddressDismiss,
}: PayPalCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [credMismatch, setCredMismatch] = useState<{ username: boolean; password: boolean } | null>(null)

  // Address detection dialog state
  const [addressDialogOpen, setAddressDialogOpen] = useState(false)
  const [detectedAddr, setDetectedAddr] = useState('')
  const [addrMatchesRecorded, setAddrMatchesRecorded] = useState<boolean | null>(null)
  const [isDetectingAddr, setIsDetectingAddr] = useState(false)

  const isExisting = paypalPreviouslyUsed === true && paypalSsnLinked === true

  // 3 named slots: screenshot (login creds), screenshot2 (balance page), screenshots[0] (address proof)
  const slot1 = entry.screenshot || null   // Login creds
  const slot2 = entry.screenshot2 || null  // Balance page
  const slot3 = (entry.screenshots ?? [])[0] || null  // Address proof
  const filledCount = [slot1, slot2, slot3].filter(Boolean).length

  // ── Live credential mismatch detection ──
  const prevMismatchKeyRef = useRef('')
  useEffect(() => {
    const u = entry.username || ''
    const p = entry.accountId || ''
    const su = assignedGmail || ''
    const sp = suggestedPassword || ''

    const userMismatch = !!(u && su && u !== su)
    const passMismatch = !!(p && sp && p !== sp)
    const key = `${userMismatch}-${passMismatch}`
    if (key === prevMismatchKeyRef.current) return
    prevMismatchKeyRef.current = key

    const m = (userMismatch || passMismatch) ? { username: userMismatch, password: passMismatch } : null
    setCredMismatch(m)
    onMismatchChange?.('PAYPAL', m ?? { username: false, password: false })
  }, [entry.username, entry.accountId, assignedGmail, suggestedPassword]) // eslint-disable-line react-hooks/exhaustive-deps

  // Upload handler — fills the next empty slot(s) in order
  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return
      setIsUploading(true)

      // Determine which slots are currently empty
      const updated = { ...entry }
      let currentSlot1 = updated.screenshot || ''
      let currentSlot2 = updated.screenshot2 || ''
      let currentSlot3 = (updated.screenshots ?? [])[0] || ''
      let addressProofFile: File | null = null

      for (const file of files) {
        try {
          const body = new FormData()
          body.append('file', file)
          const res = await fetch('/api/upload/public', { method: 'POST', body })
          const data = await res.json()
          if (!res.ok) continue

          const url = data.url as string

          // Fill into the first empty slot
          if (!currentSlot1) {
            currentSlot1 = url
            updated.screenshot = url
          } else if (!currentSlot2) {
            currentSlot2 = url
            updated.screenshot2 = url
            // Run balance detection on slot 2
            try {
              const result = await mockExtractFromPaypal(file)
              updated.paypalBalanceDetected = result.balanceWordDetected
            } catch { /* silent */ }
          } else if (!currentSlot3) {
            currentSlot3 = url
            updated.screenshots = [url]
            addressProofFile = file
          }
          // If all 3 slots full, extra files are ignored
        } catch {
          // silent
        }
      }

      onChange(updated)
      setIsUploading(false)

      // If address proof was just uploaded, run address OCR and show dialog
      if (addressProofFile) {
        setIsDetectingAddr(true)
        setAddressDialogOpen(true)
        try {
          const result = await mockExtractAddressFromScreenshot(addressProofFile, 'PAYPAL')
          if (result.detectedAddress) {
            setDetectedAddr(result.detectedAddress)
            // Compare against recorded address from Step 1
            if (recordedAddress) {
              setAddrMatchesRecorded(addressesMatch(result.detectedAddress, recordedAddress))
            } else {
              setAddrMatchesRecorded(null) // no recorded address to compare
            }
          } else {
            setDetectedAddr('')
            setAddrMatchesRecorded(null)
          }
        } catch {
          setDetectedAddr('')
          setAddrMatchesRecorded(null)
        } finally {
          setIsDetectingAddr(false)
        }
      }
    },
    [entry, onChange, recordedAddress],
  )

  const handleDeleteSlot = useCallback(
    (slot: 1 | 2 | 3) => {
      const updated = { ...entry }
      if (slot === 1) {
        updated.screenshot = ''
        setCredMismatch(null)
        onMismatchChange?.('PAYPAL', null)
      } else if (slot === 2) {
        updated.screenshot2 = ''
        updated.paypalBalanceDetected = false
      } else {
        updated.screenshots = []
        // Clear stored address detection
        updated.detectedAddress = undefined
        setDetectedAddr('')
        setAddrMatchesRecorded(null)
      }
      onChange(updated)
    },
    [entry, onChange, onMismatchChange],
  )

  // Address dialog actions
  const handleAddressConfirm = useCallback(() => {
    // Store the detected address on the entry
    onChange({ ...entry, detectedAddress: detectedAddr })
    // If it's a NEW address (doesn't match recorded), notify parent
    if (!addrMatchesRecorded && detectedAddr) {
      onAddressConfirm?.('PAYPAL', detectedAddr)
    }
    setAddressDialogOpen(false)
  }, [entry, onChange, detectedAddr, addrMatchesRecorded, onAddressConfirm])

  const handleAddressDismiss = useCallback(() => {
    setAddressDialogOpen(false)
    setDetectedAddr('')
    setAddrMatchesRecorded(null)
    onAddressDismiss?.('PAYPAL')
  }, [onAddressDismiss])

  // Determine the address status for the inline indicator
  const hasConfirmedAddress = !!entry.detectedAddress

  return (
    <div className="rounded-md border p-2.5 space-y-2" data-testid="platform-card-PAYPAL">
      {/* Name removed — shown in parent status header */}

      {/* Inline amber instruction */}
      <p className="text-xs text-amber-700 dark:text-amber-400">
        {isExisting
          ? 'Existing account: SSN had been linked'
          : 'New account: register using company email and phone number'}
      </p>

      {/* Confirmation checkbox */}
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <Checkbox
          checked={entry.bankPhoneEmailConfirmed === true}
          onCheckedChange={(checked) => {
            onChange({ ...entry, bankPhoneEmailConfirmed: checked === true })
          }}
          data-testid="paypal-phone-email-confirmed"
        />
        <span className="text-muted-foreground">
          {isExisting
            ? 'Deleted old phone and email, replaced with assigned phone and email'
            : 'Client completed face & ID scan, and balance is visible on home page'}
        </span>
      </label>

      {/* Upload area: single button + only filled slot thumbnails with labels */}
      <div className="flex items-center gap-3">
        {/* Upload button — accepts up to 3 files at once */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || []).slice(0, 3 - filledCount)
            if (files.length > 0) handleFilesSelected(files)
            e.target.value = ''
          }}
          className="hidden"
        />
        {filledCount < 3 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-dashed border-border/60 px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
            data-testid="platform-screenshot-PAYPAL"
          >
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
          </button>
        )}

        {/* Slot labels as reminders — always show, thumbnails replace labels when uploaded */}
        {slot1 ? (
          <div className="flex items-center gap-1.5">
            <ScreenshotThumbnail
              src={slot1}
              onDelete={() => handleDeleteSlot(1)}
              size="sm"
            />
            <span className="text-[10px] text-muted-foreground">Login creds</span>
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground/50">Login creds</span>
        )}

        {slot2 ? (
          <div className="flex items-center gap-1.5">
            <ScreenshotThumbnail
              src={slot2}
              onDelete={() => handleDeleteSlot(2)}
              size="sm"
            />
            <span className="text-[10px] text-muted-foreground">Balance page</span>
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground/50">Balance page</span>
        )}

        {slot3 ? (
          <div className="flex items-center gap-1.5">
            <ScreenshotThumbnail
              src={slot3}
              onDelete={() => handleDeleteSlot(3)}
              size="sm"
            />
            <span className="text-[10px] text-muted-foreground">Address proof</span>
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground/50">Address proof</span>
        )}
      </div>

      {/* Detection feedback — balance */}
      {entry.paypalBalanceDetected && (
        <p className="flex items-center gap-1.5 text-xs text-success" data-testid="paypal-balance-detected">
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          Balance visible — account home page confirmed
        </p>
      )}

      {/* Detection feedback — address confirmed or editable field on mismatch */}
      {hasConfirmedAddress && (
        <>
          {recordedAddress && addressesMatch(entry.detectedAddress!, recordedAddress) ? (
            <p className="flex items-center gap-1.5 text-xs text-success" data-testid="paypal-address-confirmed">
              <MapPin className="h-3 w-3 shrink-0" />
              Address matches ID record
            </p>
          ) : (
            <div className="flex items-center gap-2 rounded-md border-l-2 border-amber-500 bg-amber-500/5 px-2.5 py-1.5" data-testid="paypal-address-field">
              <MapPin className="h-3 w-3 shrink-0 text-amber-600" />
              <span className="text-[10px] text-amber-700 dark:text-amber-400 shrink-0">PayPal address:</span>
              <Input
                value={entry.detectedAddress ?? ''}
                onChange={(e) => onChange({ ...entry, detectedAddress: e.target.value })}
                className="h-6 flex-1 text-xs border-amber-500/30"
                data-testid="paypal-address-edit-input"
              />
            </div>
          )}
        </>
      )}

      {/* Mismatch warning for login creds */}
      {credMismatch && (
        <p className="flex items-center gap-1 text-xs text-destructive" data-testid="paypal-cred-mismatch">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {[credMismatch.username && 'email', credMismatch.password && 'password']
            .filter(Boolean)
            .join(' & ')}{' '}
          {credMismatch.username && credMismatch.password ? 'do' : 'does'} not match suggestion
        </p>
      )}

      {/* Email + Password */}
      <div className="flex items-center gap-2 pt-1">
        <Input
          placeholder={isExisting ? 'Existing email' : (assignedGmail || 'Email')}
          value={entry.username || ''}
          onChange={(e) => onChange({ ...entry, username: e.target.value })}
          className="h-8 flex-1 text-sm"
          data-testid="platform-username-PAYPAL"
        />
        <div className="relative flex-1">
          {!isExisting && suggestedPassword && (
            <button
              type="button"
              onClick={() => onChange({ ...entry, accountId: suggestedPassword })}
              className="absolute -top-3.5 right-0 text-[10px] text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
              tabIndex={-1}
            >
              {suggestedPassword}
            </button>
          )}
          <Input
            placeholder="Password"
            value={entry.accountId || ''}
            onChange={(e) => onChange({ ...entry, accountId: e.target.value })}
            className="h-8 w-full text-sm"
            data-testid="platform-account-id-PAYPAL"
          />
        </div>
      </div>

      {/* ── Address Detection Dialog ── */}
      <Dialog open={addressDialogOpen} onOpenChange={(open) => { if (!open) handleAddressDismiss() }}>
        <DialogContent className="max-w-md" data-testid="paypal-address-dialog">
          <DialogTitle className="text-sm font-medium">PayPal Address Detection</DialogTitle>

          {isDetectingAddr ? (
            <div className="flex items-center gap-2 py-6 justify-center">
              <ScanLine className="h-5 w-5 animate-pulse text-primary" />
              <span className="text-sm text-muted-foreground">Scanning address proof...</span>
            </div>
          ) : detectedAddr ? (
            <div className="space-y-3">
              {/* Detected address — editable */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Detected Address</label>
                <Input
                  value={detectedAddr}
                  onChange={(e) => {
                    setDetectedAddr(e.target.value)
                    // Re-check match when edited
                    if (recordedAddress) {
                      setAddrMatchesRecorded(addressesMatch(e.target.value, recordedAddress))
                    }
                  }}
                  className="h-8 text-sm"
                  data-testid="paypal-address-input"
                />
              </div>

              {/* Recorded address comparison */}
              {recordedAddress && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Recorded Address (from ID)</label>
                  <p className="rounded-md border border-border/40 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
                    {recordedAddress}
                  </p>
                </div>
              )}

              {/* Match status */}
              {addrMatchesRecorded === true && (
                <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2" data-testid="address-match-status">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-xs font-medium text-success">Address matches recorded ID address</span>
                </div>
              )}
              {addrMatchesRecorded === false && (
                <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2" data-testid="address-match-status">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    New address — differs from ID
                  </span>
                </div>
              )}
              {addrMatchesRecorded === null && !recordedAddress && (
                <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2" data-testid="address-match-status">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">No ID address on file to compare</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAddressDismiss}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
                  data-testid="paypal-address-dialog-dismiss"
                >
                  <X className="h-3 w-3" />
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={handleAddressConfirm}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors"
                  data-testid="paypal-address-dialog-confirm"
                >
                  <Check className="h-3 w-3" />
                  {addrMatchesRecorded ? 'Confirm Match' : 'Record Address'}
                </button>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">No address detected from screenshot</p>
              <button
                type="button"
                onClick={() => setAddressDialogOpen(false)}
                className="mt-3 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
