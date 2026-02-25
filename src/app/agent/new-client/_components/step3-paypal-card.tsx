'use client'

import { useCallback, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { ScreenshotThumbnail } from '@/components/upload-dropzone'
import { Upload, Loader2, ScanLine, AlertTriangle, Info } from 'lucide-react'
import { mockExtractFromPaypal } from './mock-extract-id'
import type { PlatformEntry } from '@/types/backend-types'

interface PayPalCardProps {
  entry: PlatformEntry
  onChange: (updated: PlatformEntry) => void
  paypalPreviouslyUsed: boolean | null | undefined
}

export function PayPalCard({ entry, onChange, paypalPreviouslyUsed }: PayPalCardProps) {
  const credInputRef = useRef<HTMLInputElement>(null)
  const balInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingCred, setIsUploadingCred] = useState(false)
  const [isUploadingBal, setIsUploadingBal] = useState(false)
  const [isDetectingBal, setIsDetectingBal] = useState(false)

  const handleCredUpload = useCallback(
    async (file: File) => {
      const body = new FormData()
      body.append('file', file)
      setIsUploadingCred(true)
      try {
        const res = await fetch('/api/upload/public', { method: 'POST', body })
        const data = await res.json()
        if (res.ok) {
          onChange({ ...entry, screenshot: data.path })
        }
      } catch {
        // silent
      } finally {
        setIsUploadingCred(false)
      }
    },
    [entry, onChange],
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

  const isExisting = paypalPreviouslyUsed === true

  return (
    <div className="rounded-md border p-2.5 space-y-2" data-testid="platform-card-PAYPAL">
      <p className="text-sm">PayPal</p>

      {/* Conditional banner */}
      {isExisting ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
            <p className="font-medium">Use existing PayPal account</p>
            <p>Remove old phone &amp; email first — then add company phone number and new email before taking screenshots.</p>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2 flex items-start gap-2">
          <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-700 dark:text-blue-400 space-y-0.5">
            <p className="font-medium">Create new PayPal account</p>
            <p>Register using company email and phone number.</p>
          </div>
        </div>
      )}

      {/* Email + Password */}
      <div className="flex items-center gap-2">
        <Input
          placeholder={isExisting ? 'Existing email' : 'Email'}
          value={entry.username || ''}
          onChange={(e) => onChange({ ...entry, username: e.target.value })}
          className="h-8 text-sm"
          data-testid="platform-username-PAYPAL"
        />
        <Input
          placeholder="Password"
          value={entry.accountId || ''}
          onChange={(e) => onChange({ ...entry, accountId: e.target.value })}
          className="h-8 text-sm"
          data-testid="platform-account-id-PAYPAL"
        />
      </div>

      {/* Two screenshot slots */}
      <div className="flex items-start gap-3">
        {/* Slot 1: Login credentials */}
        <div className="flex flex-col items-start gap-1">
          <span className="text-[10px] text-muted-foreground">Login creds</span>
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
              onDelete={() => onChange({ ...entry, screenshot: '' })}
              size="sm"
            />
          ) : (
            <button
              type="button"
              onClick={() => credInputRef.current?.click()}
              disabled={isUploadingCred}
              className="flex h-8 items-center gap-1.5 rounded-md border border-dashed border-border/60 px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
              data-testid="platform-screenshot-PAYPAL"
            >
              {isUploadingCred ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>

        {/* Slot 2: Balance page */}
        <div className="flex flex-col items-start gap-1">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            Balance page
            {isDetectingBal && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
            {entry.paypalBalanceDetected && !isDetectingBal && (
              <ScanLine className="h-3 w-3 text-primary" />
            )}
          </span>
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
        </div>
      </div>
    </div>
  )
}
