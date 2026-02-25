'use client'

import { useCallback, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScreenshotThumbnail } from '@/components/upload-dropzone'
import { Checkbox } from '@/components/ui/checkbox'
import { Upload, Loader2, ScanLine } from 'lucide-react'
import { mockExtractFromBank } from './mock-extract-id'
import type { PlatformEntry } from '@/types/backend-types'

const BANK_OPTIONS = [
  { value: 'chase', label: 'Chase' },
  { value: 'citi', label: 'Citi' },
  { value: 'bofa', label: 'BofA' },
] as const

interface PlatformCardProps {
  platform: string
  displayName: string
  entry: PlatformEntry
  onChange: (updated: PlatformEntry) => void
}

export function PlatformCard({
  platform,
  displayName,
  entry,
  onChange,
}: PlatformCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)

  function handleChange(field: keyof PlatformEntry, value: string) {
    onChange({ ...entry, [field]: value })
  }

  const handleUpload = useCallback(
    async (file: File) => {
      const body = new FormData()
      body.append('file', file)
      setIsUploading(true)
      try {
        const res = await fetch('/api/upload/public', { method: 'POST', body })
        const data = await res.json()
        if (res.ok) {
          const updated = { ...entry, screenshot: data.path }

          // Auto-detect bank details from screenshot
          if (platform === 'BANK') {
            setIsDetecting(true)
            try {
              const result = await mockExtractFromBank(file)
              updated.bank = result.bankName
              updated.bankAutoDetected = result.bankName
              updated.username = result.username
              updated.accountId = result.password
            } finally {
              setIsDetecting(false)
            }
          }

          onChange(updated)
        }
      } catch {
        // upload failed silently
      } finally {
        setIsUploading(false)
      }
    },
    [entry, onChange, platform],
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleUpload(file)
      e.target.value = ''
    },
    [handleUpload],
  )

  const handleDeleteScreenshot = useCallback(() => {
    const updated = { ...entry, screenshot: '' }
    if (platform === 'BANK') {
      updated.bank = ''
      updated.bankAutoDetected = ''
    }
    onChange(updated)
  }, [entry, onChange, platform])

  const isBank = platform === 'BANK'
  const bankOverridden = isBank && !!entry.bankAutoDetected && !!entry.bank && entry.bank !== entry.bankAutoDetected

  return (
    <div
      className="rounded-md border p-2.5 space-y-2"
      data-testid={`platform-card-${platform}`}
    >
      <p className="text-sm">{displayName}</p>

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
          {/* Row 1: Bank dropdown + Screenshot */}
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
          {/* Row 2: Username + Password + PIN */}
          <div className="flex items-center gap-2">
            <Input
              id={`${platform}-username`}
              placeholder="Username"
              value={entry.username || ''}
              onChange={(e) => handleChange('username', e.target.value)}
              className="h-8 text-sm"
              data-testid={`platform-username-${platform}`}
            />
            <Input
              id={`${platform}-accountId`}
              placeholder="Password"
              value={entry.accountId || ''}
              onChange={(e) => handleChange('accountId', e.target.value)}
              className="h-8 text-sm"
              data-testid={`platform-account-id-${platform}`}
            />
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
        </>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            id={`${platform}-username`}
            placeholder="Username"
            value={entry.username || ''}
            onChange={(e) => handleChange('username', e.target.value)}
            className="h-8 text-sm"
            data-testid={`platform-username-${platform}`}
          />
          <Input
            id={`${platform}-accountId`}
            placeholder="Password"
            value={entry.accountId || ''}
            onChange={(e) => handleChange('accountId', e.target.value)}
            className="h-8 text-sm"
            data-testid={`platform-account-id-${platform}`}
          />
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
    </div>
  )
}
