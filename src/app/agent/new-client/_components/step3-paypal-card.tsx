'use client'

import { useCallback, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ScreenshotThumbnail } from '@/components/upload-dropzone'
import { Upload, Loader2, ScanLine, AlertTriangle } from 'lucide-react'
import { mockExtractFromPaypal, mockExtractFromPlatform } from './mock-extract-id'
import type { PlatformEntry } from '@/types/backend-types'

interface PayPalCardProps {
  entry: PlatformEntry
  onChange: (updated: PlatformEntry) => void
  paypalPreviouslyUsed: boolean | null | undefined
  paypalSsnLinked: boolean | null | undefined
  assignedGmail?: string
  suggestedPassword?: string
  onMismatchChange?: (platform: string, mismatch: { username: boolean; password: boolean } | null) => void
}

export function PayPalCard({
  entry,
  onChange,
  paypalPreviouslyUsed,
  paypalSsnLinked,
  assignedGmail,
  suggestedPassword,
  onMismatchChange,
}: PayPalCardProps) {
  const credInputRef = useRef<HTMLInputElement>(null)
  const balInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingCred, setIsUploadingCred] = useState(false)
  const [isUploadingBal, setIsUploadingBal] = useState(false)
  const [isDetectingBal, setIsDetectingBal] = useState(false)
  const [isDetectingCred, setIsDetectingCred] = useState(false)
  const [credMismatch, setCredMismatch] = useState<{ username: boolean; password: boolean } | null>(null)

  const isExisting = paypalPreviouslyUsed === true && paypalSsnLinked === true

  const handleCredUpload = useCallback(
    async (file: File) => {
      const body = new FormData()
      body.append('file', file)
      setIsUploadingCred(true)
      try {
        const res = await fetch('/api/upload/public', { method: 'POST', body })
        const data = await res.json()
        if (res.ok) {
          const updated = { ...entry, screenshot: data.path }

          // OCR: check credentials against suggested values
          if (assignedGmail || suggestedPassword) {
            setIsDetectingCred(true)
            try {
              const result = await mockExtractFromPlatform(
                file,
                assignedGmail ?? '',
                suggestedPassword ?? '',
              )
              const userMismatch = !!assignedGmail && result.detectedUsername !== assignedGmail
              const passMismatch = !!suggestedPassword && result.detectedPassword !== suggestedPassword
              const m = { username: userMismatch, password: passMismatch }
              setCredMismatch(userMismatch || passMismatch ? m : null)
              onMismatchChange?.('PAYPAL', m)
            } finally {
              setIsDetectingCred(false)
            }
          }

          onChange(updated)
        }
      } catch {
        // silent
      } finally {
        setIsUploadingCred(false)
      }
    },
    [entry, onChange, assignedGmail, suggestedPassword],
  )

  const handleBalUpload = useCallback(
    async (file: File) => {
      const body = new FormData()
      body.append('file', file)
      setIsUploadingBal(true)
      try {
        const res = await fetch('/api/upload/public', { method: 'POST', body })
        const data = await res.json()
        if (res.ok) {
          const updated = { ...entry, screenshot2: data.path }
          setIsDetectingBal(true)
          try {
            const result = await mockExtractFromPaypal(file)
            updated.paypalBalanceDetected = result.balanceWordDetected
          } finally {
            setIsDetectingBal(false)
          }
          onChange(updated)
        }
      } catch {
        // silent
      } finally {
        setIsUploadingBal(false)
      }
    },
    [entry, onChange],
  )

  return (
    <div className="rounded-md border p-2.5 space-y-2" data-testid="platform-card-PAYPAL">
      <p className="text-sm">PayPal</p>

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

      {/* Screenshot slots */}
      <div className="flex items-center gap-3">
        {/* Slot 1: Login credentials */}
        <div className="flex items-center gap-1.5">
          <input
            ref={credInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleCredUpload(f)
              e.target.value = ''
            }}
            className="hidden"
          />
          {entry.screenshot ? (
            <ScreenshotThumbnail
              src={entry.screenshot}
              onDelete={() => { setCredMismatch(null); onMismatchChange?.('PAYPAL', null); onChange({ ...entry, screenshot: '' }) }}
              size="sm"
            />
          ) : (
            <button
              type="button"
              onClick={() => credInputRef.current?.click()}
              disabled={isUploadingCred || isDetectingCred}
              className="flex h-8 items-center gap-1.5 rounded-md border border-dashed border-border/60 px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
              data-testid="platform-screenshot-PAYPAL"
            >
              {isUploadingCred || isDetectingCred ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          <span className="text-[10px] text-muted-foreground">Login creds</span>
        </div>

        {/* Slot 2: Balance page */}
        <div className="flex items-center gap-1.5">
          <input
            ref={balInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleBalUpload(f)
              e.target.value = ''
            }}
            className="hidden"
          />
          {entry.screenshot2 ? (
            <ScreenshotThumbnail
              src={entry.screenshot2}
              onDelete={() => onChange({ ...entry, screenshot2: '', paypalBalanceDetected: false })}
              size="sm"
            />
          ) : (
            <button
              type="button"
              onClick={() => balInputRef.current?.click()}
              disabled={isUploadingBal || isDetectingBal}
              className="flex h-8 items-center gap-1.5 rounded-md border border-dashed border-border/60 px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
              data-testid="platform-screenshot2-PAYPAL"
            >
              {isUploadingBal || isDetectingBal ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            Balance page
            {isDetectingBal && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
            {entry.paypalBalanceDetected && !isDetectingBal && (
              <ScanLine className="h-3 w-3 text-primary" />
            )}
          </span>
        </div>
      </div>

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
    </div>
  )
}
