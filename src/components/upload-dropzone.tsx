'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadDropzoneProps {
  onUpload: (file: File) => Promise<{ success: boolean; error?: string }>
  accept?: string
  maxSize?: number // in bytes
  disabled?: boolean
  className?: string
}

export function UploadDropzone({
  onUpload,
  accept = 'image/jpeg,image/png,image/webp',
  maxSize = 5 * 1024 * 1024, // 5MB default
  disabled = false,
  className,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback(
    (file: File): string | null => {
      const acceptedTypes = accept.split(',').map((t) => t.trim())
      if (!acceptedTypes.includes(file.type)) {
        return 'Invalid file type. Please upload JPG, PNG, or WebP.'
      }
      if (file.size > maxSize) {
        return `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.`
      }
      return null
    },
    [accept, maxSize],
  )

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)

      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }

      setIsUploading(true)
      try {
        const result = await onUpload(file)
        if (!result.success) {
          setError(result.error || 'Upload failed')
        }
      } catch {
        setError('Upload failed. Please try again.')
      } finally {
        setIsUploading(false)
      }
    },
    [onUpload, validateFile],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled || isUploading) return

      const file = e.dataTransfer.files[0]
      if (file) {
        handleFile(file)
      }
    },
    [disabled, isUploading, handleFile],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      inputRef.current?.click()
    }
  }, [disabled, isUploading])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFile(file)
      }
      // Reset input so same file can be selected again
      e.target.value = ''
    },
    [handleFile],
  )

  return (
    <div className={className}>
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-all cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border/60 hover:border-primary/50 hover:bg-muted/20',
          disabled && 'opacity-50 cursor-not-allowed',
          isUploading && 'pointer-events-none',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Uploading...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-foreground">
                Drop image here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                JPG, PNG, WebP up to {Math.round(maxSize / 1024 / 1024)}MB
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <X className="h-3 w-3 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

interface ScreenshotThumbnailProps {
  src: string
  onDelete?: () => void
  isDeleting?: boolean
}

export function ScreenshotThumbnail({
  src,
  onDelete,
  isDeleting,
}: ScreenshotThumbnailProps) {
  const [imageError, setImageError] = useState(false)

  return (
    <div className="group relative">
      <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-muted/50 ring-1 ring-border/30">
        {imageError ? (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src.startsWith('/') ? src : `/${src}`}
            alt="Screenshot"
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
      </div>

      {onDelete && (
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 disabled:opacity-50"
        >
          {isDeleting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <X className="h-3 w-3" />
          )}
        </button>
      )}
    </div>
  )
}
