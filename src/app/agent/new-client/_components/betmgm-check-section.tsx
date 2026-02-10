'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Upload, ImageIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface BetmgmCheckSectionProps {
  onStatusChange: (status: 'success' | 'failed' | null) => void
  onScreenshotsChange: (screenshots: { login?: string; deposit?: string }) => void
  status: 'success' | 'failed' | null
  screenshots: { login?: string; deposit?: string }
  disabled?: boolean
}

export function BetmgmCheckSection({
  onStatusChange,
  onScreenshotsChange,
  status,
  screenshots,
  disabled,
}: BetmgmCheckSectionProps) {
  const [isUploading, setIsUploading] = useState<'login' | 'deposit' | null>(null)
  const [uploadErrors, setUploadErrors] = useState<{ login?: string; deposit?: string }>({})
  const loginInputRef = useRef<HTMLInputElement>(null)
  const depositInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (
    file: File,
    type: 'login' | 'deposit',
  ) => {
    setIsUploading(type)
    setUploadErrors((prev) => ({ ...prev, [type]: undefined }))
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', `betmgm-${type}`)
      formData.append('entity', 'betmgm-check')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Upload failed')
      }

      const data = await res.json()
      const url = data.url as string

      onScreenshotsChange({
        ...screenshots,
        [type]: url,
      })
      toast.success(`${type === 'login' ? 'Login' : 'Deposit'} screenshot uploaded`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setUploadErrors((prev) => ({ ...prev, [type]: message }))
      toast.error(message)
    } finally {
      setIsUploading(null)
    }
  }

  return (
    <div className="space-y-4" data-testid="betmgm-check-section">
      {/* Hidden inputs for form submission */}
      <input type="hidden" name="betmgmResult" value={status ?? ''} />
      <input type="hidden" name="betmgmLoginScreenshot" value={screenshots.login ?? ''} />
      <input type="hidden" name="betmgmDepositScreenshot" value={screenshots.deposit ?? ''} />

      {/* Result Selection */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Registration Result
        </p>
        <div className="flex gap-3">
          <Button
            type="button"
            variant={status === 'success' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onStatusChange('success')}
            disabled={disabled}
            className={cn(
              status === 'success' && 'bg-success hover:bg-success/90 text-white',
            )}
            data-testid="betmgm-success-btn"
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Success
          </Button>
          <Button
            type="button"
            variant={status === 'failed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              onStatusChange('failed')
              onScreenshotsChange({})
            }}
            disabled={disabled}
            className={cn(
              status === 'failed' && 'bg-destructive hover:bg-destructive/90 text-white',
            )}
            data-testid="betmgm-failed-btn"
          >
            <XCircle className="mr-1.5 h-4 w-4" />
            Failed
          </Button>
        </div>
      </div>

      {/* Screenshot Uploads — only shown on success */}
      {status === 'success' && (
        <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Required Screenshots
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Login Screenshot */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Login Page</p>
              {screenshots.login ? (
                <div
                  className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success"
                  data-testid="betmgm-login-uploaded"
                >
                  <ImageIcon className="h-4 w-4" />
                  Uploaded
                </div>
              ) : (
                <>
                  <input
                    ref={loginInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file, 'login')
                    }}
                    disabled={disabled}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => loginInputRef.current?.click()}
                    disabled={disabled || isUploading === 'login'}
                    data-testid="betmgm-login-upload-btn"
                  >
                    {isUploading === 'login' ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-1.5 h-4 w-4" />
                    )}
                    Upload Login Screenshot
                  </Button>
                  {uploadErrors.login && (
                    <p className="text-xs text-destructive" data-testid="betmgm-login-error">
                      {uploadErrors.login}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Deposit Screenshot */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Deposit Page</p>
              {screenshots.deposit ? (
                <div
                  className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success"
                  data-testid="betmgm-deposit-uploaded"
                >
                  <ImageIcon className="h-4 w-4" />
                  Uploaded
                </div>
              ) : (
                <>
                  <input
                    ref={depositInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file, 'deposit')
                    }}
                    disabled={disabled}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => depositInputRef.current?.click()}
                    disabled={disabled || isUploading === 'deposit'}
                    data-testid="betmgm-deposit-upload-btn"
                  >
                    {isUploading === 'deposit' ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-1.5 h-4 w-4" />
                    )}
                    Upload Deposit Screenshot
                  </Button>
                  {uploadErrors.deposit && (
                    <p className="text-xs text-destructive" data-testid="betmgm-deposit-error">
                      {uploadErrors.deposit}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {status === 'failed' && (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          data-testid="betmgm-failed-notice"
        >
          BetMGM registration failed. Client will be flagged — the platform will be marked as REJECTED.
        </div>
      )}
    </div>
  )
}
