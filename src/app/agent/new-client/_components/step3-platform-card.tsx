'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScreenshotThumbnail } from '@/components/upload-dropzone'
import { Checkbox } from '@/components/ui/checkbox'
import { Upload, Loader2, ScanLine, AlertTriangle, MapPin, Check, X, CheckCircle2 } from 'lucide-react'
import { mockExtractFromBank, mockExtractFromBankAccount, mockExtractAddressFromScreenshot } from './mock-extract-id'
import { addressesMatch } from '@/lib/address-utils'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { SportsbookModal, getSportsbookImageCount } from './sportsbook-platform-modal'
import { isSportsPlatform } from '@/lib/platforms'
import type { PlatformType } from '@/types'
import type { PlatformEntry } from '@/types/backend-types'

const BANK_OPTIONS = [
  { value: 'chase', label: 'Chase' },
  { value: 'citi', label: 'Citi' },
  { value: 'bofa', label: 'BofA' },
] as const

/** Normalize legacy single screenshot field to screenshots array */
export function normalizeScreenshots(entry: PlatformEntry): string[] {
  const arr = entry.screenshots ?? []
  // If old screenshot field has a value not in the array, prepend it
  if (entry.screenshot && !arr.includes(entry.screenshot)) {
    return [entry.screenshot, ...arr]
  }
  return arr.length > 0 ? arr : entry.screenshot ? [entry.screenshot] : []
}

interface PlatformCardProps {
  platform: string
  displayName: string
  entry: PlatformEntry
  onChange: (updated: PlatformEntry) => void
  suggestedUsername?: string
  suggestedPassword?: string
  onMismatchChange?: (platform: string, mismatch: { username: boolean; password: boolean } | null) => void
  /** New address detected via OCR — show conditional confirmation row */
  detectedNewAddress?: string | null
  onAddressConfirm?: (platform: string, address: string) => void
  onAddressDismiss?: (platform: string) => void
  /** Recorded address from Step 1 (ID document) for address comparison */
  recordedAddress?: string | null
}

export function PlatformCard({
  platform,
  displayName,
  entry,
  onChange,
  suggestedUsername,
  suggestedPassword,
  onMismatchChange,
  detectedNewAddress,
  onAddressConfirm,
  onAddressDismiss,
  recordedAddress,
}: PlatformCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [mismatch, setMismatch] = useState<{ username: boolean; password: boolean } | null>(null)
  const [editableAddress, setEditableAddress] = useState<string>('')

  // Bank account detection dialog state
  const [bankDialogOpen, setBankDialogOpen] = useState(false)
  const [isDetectingAcct, setIsDetectingAcct] = useState(false)
  const [detectedRouting, setDetectedRouting] = useState('')
  const [detectedAcctNum, setDetectedAcctNum] = useState('')

  // EdgeBoost address detection dialog state
  const [edgeAddrDialogOpen, setEdgeAddrDialogOpen] = useState(false)
  const [isDetectingEdgeAddr, setIsDetectingEdgeAddr] = useState(false)
  const [detectedEdgeAddr, setDetectedEdgeAddr] = useState('')
  const [edgeAddrMatchesRecorded, setEdgeAddrMatchesRecorded] = useState<boolean | null>(null)

  // Sync editable address when a new address is detected
  if (detectedNewAddress && editableAddress === '' && detectedNewAddress !== editableAddress) {
    setEditableAddress(detectedNewAddress)
  }

  // ── Live credential mismatch detection ──
  const prevMismatchKeyRef = useRef('')
  useEffect(() => {
    const u = entry.username || ''
    const p = entry.accountId || ''
    const su = suggestedUsername || ''
    const sp = suggestedPassword || ''

    const userMismatch = !!(u && su && u !== su)
    const passMismatch = !!(p && sp && p !== sp)
    const key = `${userMismatch}-${passMismatch}`
    if (key === prevMismatchKeyRef.current) return
    prevMismatchKeyRef.current = key

    const m = (userMismatch || passMismatch) ? { username: userMismatch, password: passMismatch } : null
    setMismatch(m)
    onMismatchChange?.(platform, m ?? { username: false, password: false })
  }, [entry.username, entry.accountId, suggestedUsername, suggestedPassword]) // eslint-disable-line react-hooks/exhaustive-deps

  const screenshots = normalizeScreenshots(entry)

  function handleChange(field: keyof PlatformEntry, value: string) {
    onChange({ ...entry, [field]: value })
  }

  // ── Bank: Single upload handler — fills slots in order (login creds → acct/routing) ──
  const handleBankFilesSelected = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return
      setIsUploading(true)

      const updated = { ...entry }
      let currentSlot1 = updated.screenshot || ''
      let currentSlot2 = updated.screenshot2 || ''
      let acctFile: File | null = null

      for (const file of files) {
        try {
          const body = new FormData()
          body.append('file', file)
          const res = await fetch('/api/upload/public', { method: 'POST', body })
          const data = await res.json()
          if (!res.ok) continue

          const url = data.url as string

          if (!currentSlot1) {
            currentSlot1 = url
            updated.screenshot = url
            // Run bank login creds OCR on slot 1
            setIsDetecting(true)
            try {
              const result = await mockExtractFromBank(file)
              updated.bank = result.bankName
              updated.bankAutoDetected = result.bankName
              if (!updated.username) updated.username = result.username
              if (!updated.accountId) updated.accountId = result.password
            } finally {
              setIsDetecting(false)
            }
          } else if (!currentSlot2) {
            currentSlot2 = url
            updated.screenshot2 = url
            acctFile = file
          }
        } catch {
          // silent
        }
      }

      onChange(updated)
      setIsUploading(false)

      // If account/routing screenshot was just uploaded, run OCR and show dialog
      if (acctFile) {
        setIsDetectingAcct(true)
        setBankDialogOpen(true)
        try {
          const result = await mockExtractFromBankAccount(acctFile)
          setDetectedRouting(result.routingNumber)
          setDetectedAcctNum(result.accountNumber)
        } catch {
          setDetectedRouting('')
          setDetectedAcctNum('')
        } finally {
          setIsDetectingAcct(false)
        }
      }
    },
    [entry, onChange],
  )

  // ── Non-bank: Generic upload handler ──
  const handleUpload = useCallback(
    async (file: File) => {
      const body = new FormData()
      body.append('file', file)
      setIsUploading(true)
      try {
        const res = await fetch('/api/upload/public', { method: 'POST', body })
        const data = await res.json()
        if (res.ok) {
          const currentScreenshots = normalizeScreenshots(entry)
          const newScreenshots = [...currentScreenshots, data.url]
          const updated = {
            ...entry,
            screenshot: entry.screenshot || data.url,
            screenshots: newScreenshots,
          }
          onChange(updated)
        }
      } catch {
        // silent
      } finally {
        setIsUploading(false)
      }
    },
    [entry, onChange],
  )

  // ── EdgeBoost: Single bulk upload handler — fills 2 slots (login creds → address) ──
  const handleEdgeBoostFilesSelected = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return
      setIsUploading(true)

      const updated = { ...entry }
      let currentSlot1 = updated.screenshot || ''
      let currentSlot2 = updated.screenshot2 || ''
      let addressFile: File | null = null

      for (const file of files) {
        try {
          const body = new FormData()
          body.append('file', file)
          const res = await fetch('/api/upload/public', { method: 'POST', body })
          const data = await res.json()
          if (!res.ok) continue

          const url = data.url as string

          if (!currentSlot1) {
            currentSlot1 = url
            updated.screenshot = url
          } else if (!currentSlot2) {
            currentSlot2 = url
            updated.screenshot2 = url
            addressFile = file
          }
        } catch {
          // silent
        }
      }

      onChange(updated)
      setIsUploading(false)

      // If address screenshot was just uploaded, run address OCR and show dialog
      if (addressFile) {
        setIsDetectingEdgeAddr(true)
        setEdgeAddrDialogOpen(true)
        try {
          const result = await mockExtractAddressFromScreenshot(addressFile, 'EDGEBOOST')
          if (result.detectedAddress) {
            setDetectedEdgeAddr(result.detectedAddress)
            if (recordedAddress) {
              setEdgeAddrMatchesRecorded(addressesMatch(result.detectedAddress, recordedAddress))
            } else {
              setEdgeAddrMatchesRecorded(null)
            }
          } else {
            setDetectedEdgeAddr('')
            setEdgeAddrMatchesRecorded(null)
          }
        } catch {
          setDetectedEdgeAddr('')
          setEdgeAddrMatchesRecorded(null)
        } finally {
          setIsDetectingEdgeAddr(false)
        }
      }
    },
    [entry, onChange, recordedAddress],
  )

  // EdgeBoost address dialog actions
  const handleEdgeAddrConfirm = useCallback(() => {
    onChange({ ...entry, detectedAddress: detectedEdgeAddr })
    if (!edgeAddrMatchesRecorded && detectedEdgeAddr) {
      onAddressConfirm?.(platform, detectedEdgeAddr)
    }
    setEdgeAddrDialogOpen(false)
  }, [entry, onChange, detectedEdgeAddr, edgeAddrMatchesRecorded, onAddressConfirm, platform])

  const handleEdgeAddrDismiss = useCallback(() => {
    setEdgeAddrDialogOpen(false)
    setDetectedEdgeAddr('')
    setEdgeAddrMatchesRecorded(null)
    onAddressDismiss?.(platform)
  }, [onAddressDismiss, platform])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleUpload(file)
      e.target.value = ''
    },
    [handleUpload],
  )

  const handleDeleteScreenshot = useCallback((index?: number) => {
    if (index !== undefined) {
      const currentScreenshots = normalizeScreenshots(entry)
      const newScreenshots = currentScreenshots.filter((_, i) => i !== index)
      const updated = {
        ...entry,
        screenshot: newScreenshots[0] || '',
        screenshots: newScreenshots,
      }
      if (index === 0) {
        setMismatch(null)
        onMismatchChange?.(platform, null)
        if (platform === 'BANK') {
          updated.bank = ''
          updated.bankAutoDetected = ''
        }
      }
      onChange(updated)
    } else {
      setMismatch(null)
      onMismatchChange?.(platform, null)
      const updated = { ...entry, screenshot: '', screenshots: [] }
      if (platform === 'BANK') {
        updated.bank = ''
        updated.bankAutoDetected = ''
      }
      onChange(updated)
    }
  }, [entry, onChange, platform, onMismatchChange])

  // Bank dialog actions
  const handleBankAcctConfirm = useCallback(() => {
    onChange({ ...entry, routingNumber: detectedRouting, bankAccountNumber: detectedAcctNum })
    setBankDialogOpen(false)
  }, [entry, onChange, detectedRouting, detectedAcctNum])

  const handleBankAcctDismiss = useCallback(() => {
    setBankDialogOpen(false)
    setDetectedRouting('')
    setDetectedAcctNum('')
  }, [])

  const isBank = platform === 'BANK'
  const isEdgeBoost = platform === 'EDGEBOOST'
  const bankOverridden = isBank && !!entry.bankAutoDetected && !!entry.bank && entry.bank !== entry.bankAutoDetected

  // Bank slot tracking
  const bankSlot1 = entry.screenshot || null  // Login creds
  const bankSlot2 = entry.screenshot2 || null // Acct & routing #
  const bankFilledCount = [bankSlot1, bankSlot2].filter(Boolean).length

  return (
    <div
      className="rounded-md border p-2.5 space-y-2"
      data-testid={`platform-card-${platform}`}
    >
      <p className="text-sm">
        {displayName}
        {!isEdgeBoost && !isBank && !isSportsPlatform(platform as PlatformType) && screenshots.length > 0 && (
          <span className="ml-1.5 text-muted-foreground"> — {screenshots.length} upload{screenshots.length !== 1 ? 's' : ''}</span>
        )}
        {isBank && bankFilledCount > 0 && (
          <span className="ml-1.5 text-muted-foreground"> — {bankFilledCount} upload{bankFilledCount !== 1 ? 's' : ''}</span>
        )}
      </p>

      {isBank && (
        <>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Bring: SSN, Address Proof, ID
          </p>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox
              checked={entry.bankPhoneEmailConfirmed === true}
              onCheckedChange={(checked) => {
                onChange({ ...entry, bankPhoneEmailConfirmed: checked === true })
              }}
              data-testid="bank-phone-email-confirmed"
            />
            <span className="text-muted-foreground">Confirmed: client used company phone &amp; email</span>
          </label>
        </>
      )}

      {isBank ? (
        <>
          {/* Row 1: Bank dropdown + single upload + thumbnails (no empty squares) */}
          <div className="flex items-center gap-2">
            <div className="relative shrink-0 w-28">
              <Select
                value={entry.bank || ''}
                onValueChange={(value) => handleChange('bank', value)}
              >
                <SelectTrigger
                  className={`h-8 text-sm ${bankOverridden ? 'border-amber-500/60' : ''}`}
                  data-testid={`platform-bank-${platform}`}
                >
                  <SelectValue placeholder="Bank" />
                </SelectTrigger>
                <SelectContent>
                  {BANK_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isDetecting && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                </span>
              )}
              {entry.bankAutoDetected && !isDetecting && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <ScanLine className="h-2.5 w-2.5" />
                </span>
              )}
            </div>

            {/* Single upload button — accepts up to 2 files */}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []).slice(0, 2 - bankFilledCount)
                if (files.length > 0) handleBankFilesSelected(files)
                e.target.value = ''
              }}
              className="hidden"
            />
            {bankFilledCount < 2 && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
                className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-dashed border-border/60 px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
                data-testid={`platform-screenshot-${platform}`}
              >
                {isUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
              </button>
            )}

            {/* Slot labels as reminders — always show, thumbnails replace labels when uploaded */}
            {bankSlot1 ? (
              <div className="flex items-center gap-1.5">
                <ScreenshotThumbnail
                  src={bankSlot1}
                  onDelete={() => {
                    setMismatch(null)
                    onMismatchChange?.(platform, null)
                    onChange({ ...entry, screenshot: '', bank: '', bankAutoDetected: '' })
                  }}
                  size="sm"
                />
                <span className="text-[10px] text-muted-foreground">Login creds</span>
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground/50">Login creds</span>
            )}

            {bankSlot2 ? (
              <div className="flex items-center gap-1.5">
                <ScreenshotThumbnail
                  src={bankSlot2}
                  onDelete={() => {
                    onChange({ ...entry, screenshot2: '', routingNumber: '', bankAccountNumber: '' })
                    setDetectedRouting('')
                    setDetectedAcctNum('')
                  }}
                  size="sm"
                />
                <span className="text-[10px] text-muted-foreground">Acct &amp; routing #</span>
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground/50">Acct &amp; routing #</span>
            )}
          </div>

          {/* Detection feedback — routing/account confirmed */}
          {entry.routingNumber && entry.bankAccountNumber && (
            <p className="flex items-center gap-1.5 text-xs text-success" data-testid="bank-acct-confirmed">
              <CheckCircle2 className="h-3 w-3 shrink-0" />
              Routing: {entry.routingNumber} · Account: {'•'.repeat(Math.max(0, (entry.bankAccountNumber?.length ?? 0) - 4))}{entry.bankAccountNumber?.slice(-4)}
            </p>
          )}

          {/* Row 2: Username + Password + PIN */}
          <div className="flex items-center gap-2 mt-3">
            <Input
              id={`${platform}-username`}
              placeholder={suggestedUsername || 'Username'}
              value={entry.username || ''}
              onChange={(e) => handleChange('username', e.target.value)}
              className="h-8 flex-1 text-sm"
              data-testid={`platform-username-${platform}`}
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
                id={`${platform}-accountId`}
                placeholder="Password"
                value={entry.accountId || ''}
                onChange={(e) => handleChange('accountId', e.target.value)}
                className="h-8 text-sm"
                data-testid={`platform-account-id-${platform}`}
              />
            </div>
            <div className="relative shrink-0">
              {entry.pinSuggested && (
                <p className="absolute -top-3.5 left-0 text-[10px] text-muted-foreground whitespace-nowrap">
                  PIN: {entry.pinSuggested} / {entry.pinSuggested6}
                </p>
              )}
              <Input
                id={`${platform}-pin`}
                placeholder="PIN"
                value={entry.pin || ''}
                onChange={(e) => handleChange('pin', e.target.value)}
                className="h-8 w-24 text-sm"
                maxLength={6}
                data-testid={`platform-pin-${platform}`}
              />
            </div>
          </div>

          {/* Row 3: Routing Number + Account Number */}
          <div className="flex items-center gap-2">
            <Input
              id={`${platform}-routingNumber`}
              placeholder="Routing number"
              value={entry.routingNumber || ''}
              onChange={(e) => onChange({ ...entry, routingNumber: e.target.value })}
              className="h-8 flex-1 text-sm"
              maxLength={9}
              data-testid={`platform-routing-${platform}`}
            />
            <Input
              id={`${platform}-bankAccountNumber`}
              placeholder="Account number"
              value={entry.bankAccountNumber || ''}
              onChange={(e) => onChange({ ...entry, bankAccountNumber: e.target.value })}
              className="h-8 flex-1 text-sm"
              data-testid={`platform-account-number-${platform}`}
            />
          </div>

          {/* ── Bank Account Detection Dialog ── */}
          <Dialog open={bankDialogOpen} onOpenChange={(open) => { if (!open) handleBankAcctDismiss() }}>
            <DialogContent className="max-w-md" data-testid="bank-account-dialog">
              <DialogTitle className="text-sm font-medium">Bank Account Detection</DialogTitle>

              {isDetectingAcct ? (
                <div className="flex items-center gap-2 py-6 justify-center">
                  <ScanLine className="h-5 w-5 animate-pulse text-primary" />
                  <span className="text-sm text-muted-foreground">Scanning routing &amp; account numbers...</span>
                </div>
              ) : (detectedRouting || detectedAcctNum) ? (
                <div className="space-y-3">
                  {/* Detected routing number — editable */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Routing Number</label>
                    <Input
                      value={detectedRouting}
                      onChange={(e) => setDetectedRouting(e.target.value)}
                      className="h-8 text-sm"
                      maxLength={9}
                      data-testid="bank-routing-input"
                    />
                  </div>

                  {/* Detected account number — editable */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Account Number</label>
                    <Input
                      value={detectedAcctNum}
                      onChange={(e) => setDetectedAcctNum(e.target.value)}
                      className="h-8 text-sm"
                      data-testid="bank-account-input"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleBankAcctDismiss}
                      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
                      data-testid="bank-dialog-dismiss"
                    >
                      <X className="h-3 w-3" />
                      Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={handleBankAcctConfirm}
                      className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors"
                      data-testid="bank-dialog-confirm"
                    >
                      <Check className="h-3 w-3" />
                      Confirm
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">No routing or account numbers detected</p>
                  <button
                    type="button"
                    onClick={() => setBankDialogOpen(false)}
                    className="mt-3 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      ) : isEdgeBoost ? (
        <>
          {/* Single upload row + thumbnails — no empty squares */}
          <div className="flex items-center gap-3">
            {/* Single upload button — accepts up to 2 files */}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => {
                const edgeSlot1 = entry.screenshot || ''
                const edgeSlot2 = entry.screenshot2 || ''
                const filled = [edgeSlot1, edgeSlot2].filter(Boolean).length
                const files = Array.from(e.target.files || []).slice(0, 2 - filled)
                if (files.length > 0) handleEdgeBoostFilesSelected(files)
                e.target.value = ''
              }}
              className="hidden"
            />
            {[entry.screenshot, entry.screenshot2].filter(Boolean).length < 2 && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
                className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-dashed border-border/60 px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
                data-testid={`platform-screenshot-${platform}`}
              >
                {isUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
              </button>
            )}

            {/* Slot labels as reminders — always show, thumbnails replace labels when uploaded */}
            {entry.screenshot ? (
              <div className="flex items-center gap-1.5">
                <ScreenshotThumbnail
                  src={entry.screenshot}
                  onDelete={() => {
                    setMismatch(null)
                    onMismatchChange?.(platform, null)
                    onChange({ ...entry, screenshot: '' })
                  }}
                  size="sm"
                />
                <span className="text-[10px] text-muted-foreground">Login creds</span>
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground/50">Login creds</span>
            )}

            {entry.screenshot2 ? (
              <div className="flex items-center gap-1.5">
                <ScreenshotThumbnail
                  src={entry.screenshot2}
                  onDelete={() => {
                    onChange({ ...entry, screenshot2: '', detectedAddress: undefined })
                    setDetectedEdgeAddr('')
                    setEdgeAddrMatchesRecorded(null)
                  }}
                  size="sm"
                />
                <span className="text-[10px] text-muted-foreground">Address</span>
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground/50">Address</span>
            )}
          </div>

          {/* Address detection feedback — inline editable when mismatch */}
          {entry.detectedAddress && (
            <>
              {recordedAddress && addressesMatch(entry.detectedAddress, recordedAddress) ? (
                <p className="flex items-center gap-1.5 text-xs text-success" data-testid="edgeboost-address-confirmed">
                  <MapPin className="h-3 w-3 shrink-0" />
                  Address matches ID record
                </p>
              ) : (
                <div className="flex items-center gap-2 rounded-md border-l-2 border-amber-500 bg-amber-500/5 px-2.5 py-1.5" data-testid="edgeboost-address-field">
                  <MapPin className="h-3 w-3 shrink-0 text-amber-600" />
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 shrink-0">EdgeBoost address:</span>
                  <Input
                    value={entry.detectedAddress}
                    onChange={(e) => onChange({ ...entry, detectedAddress: e.target.value })}
                    className="h-6 flex-1 text-xs border-amber-500/30"
                    data-testid="edgeboost-address-input"
                  />
                </div>
              )}
            </>
          )}

          {/* Row 2: User ID + Password */}
          <div className="flex items-center gap-2">
            <Input
              id={`${platform}-username`}
              placeholder={suggestedUsername || 'User ID'}
              value={entry.username || ''}
              onChange={(e) => handleChange('username', e.target.value)}
              className="h-8 flex-1 text-sm"
              data-testid={`platform-username-${platform}`}
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
                id={`${platform}-accountId`}
                placeholder="Password"
                value={entry.accountId || ''}
                onChange={(e) => handleChange('accountId', e.target.value)}
                className="h-8 text-sm"
                data-testid={`platform-account-id-${platform}`}
              />
            </div>
          </div>

          {/* EdgeBoost Address Detection Dialog */}
          <Dialog open={edgeAddrDialogOpen} onOpenChange={(open) => { if (!open) handleEdgeAddrDismiss() }}>
            <DialogContent className="max-w-md" data-testid="edgeboost-address-dialog">
              <DialogTitle className="text-sm font-medium">EdgeBoost Address Detection</DialogTitle>

              {isDetectingEdgeAddr ? (
                <div className="flex items-center gap-2 py-6 justify-center">
                  <ScanLine className="h-5 w-5 animate-pulse text-primary" />
                  <span className="text-sm text-muted-foreground">Scanning address...</span>
                </div>
              ) : detectedEdgeAddr ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Detected Address</label>
                    <Input
                      value={detectedEdgeAddr}
                      onChange={(e) => {
                        setDetectedEdgeAddr(e.target.value)
                        if (recordedAddress) {
                          setEdgeAddrMatchesRecorded(addressesMatch(e.target.value, recordedAddress))
                        }
                      }}
                      className="h-8 text-sm"
                      data-testid="edgeboost-addr-input"
                    />
                  </div>

                  {recordedAddress && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Recorded Address (from ID)</label>
                      <p className="rounded-md border border-border/40 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
                        {recordedAddress}
                      </p>
                    </div>
                  )}

                  {edgeAddrMatchesRecorded === true && (
                    <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2" data-testid="edge-address-match-status">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-xs font-medium text-success">Address matches recorded ID address</span>
                    </div>
                  )}
                  {edgeAddrMatchesRecorded === false && (
                    <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2" data-testid="edge-address-match-status">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                        New address — differs from ID
                      </span>
                    </div>
                  )}
                  {edgeAddrMatchesRecorded === null && !recordedAddress && (
                    <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2" data-testid="edge-address-match-status">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">No ID address on file to compare</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleEdgeAddrDismiss}
                      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
                      data-testid="edge-addr-dialog-dismiss"
                    >
                      <X className="h-3 w-3" />
                      Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={handleEdgeAddrConfirm}
                      className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors"
                      data-testid="edge-addr-dialog-confirm"
                    >
                      <Check className="h-3 w-3" />
                      {edgeAddrMatchesRecorded ? 'Confirm Match' : 'Record Address'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">No address detected from screenshot</p>
                  <button
                    type="button"
                    onClick={() => setEdgeAddrDialogOpen(false)}
                    className="mt-3 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      ) : isSportsPlatform(platform as PlatformType) ? (
        <SportsbookCompactCard
          platform={platform}
          displayName={displayName}
          entry={entry}
          onChange={onChange}
          suggestedUsername={suggestedUsername}
          suggestedPassword={suggestedPassword}
          onMismatchChange={onMismatchChange}
        />
      ) : (
        <div className="flex items-center gap-2 mt-3">
          <Input
            id={`${platform}-username`}
            placeholder={suggestedUsername || 'Username'}
            value={entry.username || ''}
            onChange={(e) => handleChange('username', e.target.value)}
            className="h-8 flex-1 text-sm"
            data-testid={`platform-username-${platform}`}
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
              id={`${platform}-accountId`}
              placeholder="Password"
              value={entry.accountId || ''}
              onChange={(e) => handleChange('accountId', e.target.value)}
              className="h-8 text-sm"
              data-testid={`platform-account-id-${platform}`}
            />
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          {entry.screenshot ? (
            <ScreenshotThumbnail
              src={entry.screenshot}
              onDelete={handleDeleteScreenshot}
              size="sm"
            />
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-dashed border-border/60 px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
              data-testid={`platform-screenshot-${platform}`}
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Mismatch warning — skip for sportsbooks (handled in modal) */}
      {mismatch && !isSportsPlatform(platform as PlatformType) && (
        <p className="flex items-center gap-1 text-xs text-destructive" data-testid={`platform-mismatch-${platform}`}>
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {[mismatch.username && 'username', mismatch.password && 'password']
            .filter(Boolean)
            .join(' & ')}{' '}
          {mismatch.username && mismatch.password ? 'do' : 'does'} not match suggestion
        </p>
      )}

      {/* Multi-screenshot thumbnail row — skip for sportsbooks (handled in modal) */}
      {!isBank && !isEdgeBoost && !isSportsPlatform(platform as PlatformType) && screenshots.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5" data-testid={`platform-thumbnails-${platform}`}>
          {screenshots.map((src, idx) => (
            <ScreenshotThumbnail
              key={`${src}-${idx}`}
              src={src}
              onDelete={() => handleDeleteScreenshot(idx)}
              size="sm"
            />
          ))}
        </div>
      )}

      {/* Conditional address detection row */}
      {detectedNewAddress && (
        <div
          className="flex items-center gap-2 rounded-md border-l-2 border-amber-500 bg-amber-500/5 px-2.5 py-1.5"
          data-testid={`platform-address-detected-${platform}`}
        >
          <MapPin className="h-3 w-3 shrink-0 text-amber-600" />
          <input
            type="text"
            value={editableAddress}
            onChange={(e) => setEditableAddress(e.target.value)}
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
            placeholder="Detected address..."
          />
          <button
            type="button"
            onClick={() => onAddressConfirm?.(platform, editableAddress)}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-success/20 text-success hover:bg-success/30 transition-colors"
            title="Confirm address"
            data-testid={`address-confirm-${platform}`}
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => { setEditableAddress(''); onAddressDismiss?.(platform) }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
            title="Dismiss"
            data-testid={`address-dismiss-${platform}`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── Sportsbook Compact Card ─────────────────────────────────────── */

interface SportsbookCompactCardProps {
  platform: string
  displayName: string
  entry: PlatformEntry
  onChange: (updated: PlatformEntry) => void
  suggestedUsername?: string
  suggestedPassword?: string
  onMismatchChange?: (platform: string, mismatch: { username: boolean; password: boolean } | null) => void
}

function SportsbookCompactCard({
  platform,
  displayName,
  entry,
  onChange,
  suggestedUsername,
  suggestedPassword,
  onMismatchChange,
}: SportsbookCompactCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const imageCount = getSportsbookImageCount(entry)
  const allImages = imageCount === 3

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-muted/40"
        data-testid={`sportsbook-open-${platform}`}
      >
        {/* Image count badge */}
        <Badge
          variant="outline"
          className={`h-5 shrink-0 px-1.5 font-mono text-[10px] ${
            allImages
              ? 'border-success/40 bg-success/10 text-success'
              : imageCount > 0
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground'
          }`}
        >
          {imageCount}/3
        </Badge>

        {/* Deposit ready badge */}
        {entry.depositDetected && (
          <Badge
            variant="outline"
            className="h-5 shrink-0 gap-1 border-success/40 bg-success/10 px-1.5 text-[10px] text-success"
          >
            <CheckCircle2 className="h-2.5 w-2.5" />
            Deposit
          </Badge>
        )}

        {/* Username preview */}
        {entry.username && (
          <span className="truncate text-xs text-muted-foreground">
            {entry.username}
          </span>
        )}

        {/* Open indicator */}
        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/60">
          Open &rarr;
        </span>
      </button>

      <SportsbookModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        platform={platform}
        displayName={displayName}
        entry={entry}
        onChange={onChange}
        suggestedUsername={suggestedUsername}
        suggestedPassword={suggestedPassword}
        onMismatchChange={onMismatchChange}
      />
    </>
  )
}
