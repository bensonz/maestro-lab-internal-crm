'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload, Loader2, X, Check, Eye } from 'lucide-react'
import { PLATFORM_INFO } from '@/lib/platforms'
import { mockDetectPlatformFromScreenshot } from './mock-extract-id'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import type { PlatformType } from '@/types'

interface SortedScreenshot {
  file: File
  path: string // uploaded URL
  objectUrl: string // local blob URL for preview
  platform: PlatformType
  confidence: number
  isUnidentified: boolean
}

interface BulkUploadZoneProps {
  platforms: PlatformType[]
  onScreenshotsSorted: (sorted: Map<PlatformType, string[]>) => void
}

export function BulkUploadZone({ platforms, onScreenshotsSorted }: BulkUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [sorted, setSorted] = useState<SortedScreenshot[]>([])
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const processFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return
      setIsUploading(true)
      setError(null)

      const results: SortedScreenshot[] = []

      for (const file of files) {
        try {
          // 1. Upload file
          const body = new FormData()
          body.append('file', file)
          const res = await fetch('/api/upload/public', { method: 'POST', body })
          if (!res.ok) {
            results.push({
              file,
              path: '',
              objectUrl: URL.createObjectURL(file),
              platform: platforms[0],
              confidence: 0,
              isUnidentified: true,
            })
            continue
          }
          const data = await res.json()

          // 2. Detect platform via OCR
          const detection = await mockDetectPlatformFromScreenshot(file)
          const isKnownPlatform = platforms.includes(detection.platform)
          const isLowConfidence = detection.confidence < 0.7

          results.push({
            file,
            path: data.url,
            objectUrl: URL.createObjectURL(file),
            platform: isKnownPlatform ? detection.platform : platforms[0],
            confidence: detection.confidence,
            isUnidentified: !isKnownPlatform || isLowConfidence,
          })
        } catch {
          // Upload/detection failed for this file — skip
        }
      }

      setSorted((prev) => [...prev, ...results])
      setIsUploading(false)

      // Build and emit sorted map
      const allResults = [...sorted, ...results]
      emitSorted(allResults)
    },
    [platforms, sorted],
  )

  const emitSorted = useCallback(
    (items: SortedScreenshot[]) => {
      const map = new Map<PlatformType, string[]>()
      for (const item of items) {
        if (!item.path) continue
        const existing = map.get(item.platform) || []
        existing.push(item.path)
        map.set(item.platform, existing)
      }
      onScreenshotsSorted(map)
    },
    [onScreenshotsSorted],
  )

  const handleReassign = useCallback(
    (index: number, newPlatform: PlatformType) => {
      const updated = [...sorted]
      updated[index] = { ...updated[index], platform: newPlatform, isUnidentified: false }
      setSorted(updated)
      emitSorted(updated)
    },
    [sorted, emitSorted],
  )

  const handleRemove = useCallback(
    (index: number) => {
      const updated = sorted.filter((_, i) => i !== index)
      setSorted(updated)
      emitSorted(updated)
    },
    [sorted, emitSorted],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        ['image/jpeg', 'image/png', 'image/webp'].includes(f.type),
      )
      if (files.length > 0) processFiles(files)
    },
    [processFiles],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length > 0) processFiles(files)
      e.target.value = ''
    },
    [processFiles],
  )

  // Build summary counts
  const confirmedCount = sorted.filter((s) => !s.isUnidentified).length
  const unidentifiedCount = sorted.filter((s) => s.isUnidentified).length

  return (
    <div className="space-y-2" data-testid="bulk-upload-zone">
      {/* Drop zone */}
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-3 transition-all ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border/60 hover:border-primary/50 hover:bg-muted/20'
        } ${isUploading ? 'pointer-events-none opacity-70' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleInputChange}
          className="hidden"
          disabled={isUploading}
        />
        {isUploading ? (
          <div className="flex items-center gap-2 py-1">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Uploading & detecting platforms...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 py-1">
            <Upload className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium">Drop sportsbook screenshots here</p>
              <p className="text-[10px] text-muted-foreground">Upload all at once — OCR auto-sorts by platform</p>
            </div>
          </div>
        )}
      </div>

      {/* All uploaded screenshots — review grid */}
      {sorted.length > 0 && (
        <div className="space-y-1.5">
          {/* Summary bar */}
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-muted-foreground font-medium">{sorted.length} uploaded</span>
            {confirmedCount > 0 && (
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-success">
                {confirmedCount} auto-sorted
              </span>
            )}
            {unidentifiedCount > 0 && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-700 dark:text-amber-400">
                {unidentifiedCount} need review
              </span>
            )}
          </div>

          {/* Screenshot review list — ALL items shown */}
          <div className="grid grid-cols-1 gap-1">
            {sorted.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${
                  s.isUnidentified
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-border/40 bg-muted/20'
                }`}
              >
                {/* Preview thumbnail — clickable to enlarge */}
                <button
                  type="button"
                  onClick={() => setPreviewUrl(s.objectUrl)}
                  className="group relative h-10 w-14 shrink-0 overflow-hidden rounded border border-border/40 bg-muted"
                  title="Click to preview"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.objectUrl}
                    alt={s.file.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                    <Eye className="h-3.5 w-3.5 text-white" />
                  </div>
                </button>

                {/* Filename */}
                <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground" title={s.file.name}>
                  {s.file.name}
                </span>

                {/* Confidence + platform assignment */}
                {!s.isUnidentified ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] text-success">
                    <Check className="h-2.5 w-2.5" />
                    {PLATFORM_INFO[s.platform]?.abbrev ?? s.platform}
                  </span>
                ) : (
                  <span className="shrink-0 text-[10px] text-amber-600">?</span>
                )}

                {/* Platform picker — always available to reassign */}
                <Select
                  value={s.platform}
                  onValueChange={(val) => handleReassign(i, val as PlatformType)}
                >
                  <SelectTrigger className={`h-6 w-24 text-[10px] ${s.isUnidentified ? 'border-amber-500/40' : ''}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((p) => (
                      <SelectItem key={p} value={p} className="text-xs">
                        {PLATFORM_INFO[p].name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => { if (!open) setPreviewUrl(null) }}>
        <DialogContent className="max-w-2xl p-2">
          <DialogTitle className="sr-only">Screenshot Preview</DialogTitle>
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Screenshot preview"
              className="w-full rounded"
            />
          )}
        </DialogContent>
      </Dialog>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
