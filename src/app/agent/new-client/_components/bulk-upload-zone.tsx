'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload, Loader2, AlertTriangle } from 'lucide-react'
import { PLATFORM_INFO } from '@/lib/platforms'
import { mockDetectPlatformFromScreenshot } from './mock-extract-id'
import type { PlatformType } from '@/types'
import type { PlatformEntry } from '@/types/backend-types'

interface SortedScreenshot {
  file: File
  path: string // uploaded URL
  platform: PlatformType
  confidence: number
  isUnidentified: boolean
}

interface BulkUploadZoneProps {
  platforms: PlatformType[]
  onScreenshotsSorted: (sorted: Map<PlatformType, string[]>) => void
  /** Called after a batch upload completes — receives the first platform that got new images */
  onUploadComplete?: (firstPlatform: PlatformType | null) => void
  /** Current platform entries — used for duplicate filename detection */
  existingEntries?: PlatformEntry[]
}

export function BulkUploadZone({
  platforms,
  onScreenshotsSorted,
  onUploadComplete,
  existingEntries,
}: BulkUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [sorted, setSorted] = useState<SortedScreenshot[]>([])
  const [error, setError] = useState<string | null>(null)

  // ── Duplicate detection state ──
  const [duplicatePrompt, setDuplicatePrompt] = useState<{
    fileName: string
    existingPlatform: string
    resolve: (action: 'replace' | 'skip') => void
  } | null>(null)

  /** Check if a filename already exists in any platform's screenshots */
  const findDuplicate = useCallback(
    (fileName: string): string | null => {
      const lowerName = fileName.toLowerCase()
      for (const entry of existingEntries ?? []) {
        const allPaths = [
          entry.screenshot,
          entry.screenshotPersonalInfo,
          entry.screenshotDeposit,
          ...(entry.screenshots ?? []),
        ].filter((p): p is string => !!p)
        for (const path of allPaths) {
          const existingName = path.split('/').pop()?.toLowerCase()
          if (existingName === lowerName) return entry.platform
        }
      }
      return null
    },
    [existingEntries],
  )

  const processFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return
      setIsUploading(true)
      setError(null)

      const results: SortedScreenshot[] = []
      let firstPlatformWithNew: PlatformType | null = null

      for (const file of files) {
        try {
          // Check for duplicates before uploading
          const dupPlatform = findDuplicate(file.name)
          if (dupPlatform) {
            // Wait for user decision
            const action = await new Promise<'replace' | 'skip'>((resolve) => {
              setDuplicatePrompt({
                fileName: file.name,
                existingPlatform: dupPlatform,
                resolve,
              })
            })
            setDuplicatePrompt(null)
            if (action === 'skip') continue
            // If replace, proceed with upload (will overwrite via new URL)
          }

          // 1. Upload file
          const body = new FormData()
          body.append('file', file)
          const res = await fetch('/api/upload/public', { method: 'POST', body })
          if (!res.ok) {
            results.push({
              file,
              path: '',
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
          const assignedPlatform = isKnownPlatform ? detection.platform : platforms[0]

          results.push({
            file,
            path: data.url,
            platform: assignedPlatform,
            confidence: detection.confidence,
            isUnidentified: !isKnownPlatform || isLowConfidence,
          })

          // Track first platform that received a successful upload
          if (!firstPlatformWithNew && data.url) {
            firstPlatformWithNew = assignedPlatform
          }
        } catch {
          // Upload/detection failed for this file — skip
        }
      }

      setSorted((prev) => [...prev, ...results])
      setIsUploading(false)

      // Build and emit sorted map
      const allResults = [...sorted, ...results]
      emitSorted(allResults)

      // Notify parent that upload batch is complete
      onUploadComplete?.(firstPlatformWithNew)
    },
    [platforms, sorted, findDuplicate, onUploadComplete],
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

      {/* Duplicate detection prompt */}
      {duplicatePrompt && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span className="flex-1 text-xs text-amber-700 dark:text-amber-400">
            &quot;{duplicatePrompt.fileName}&quot; already exists in{' '}
            <strong>{PLATFORM_INFO[duplicatePrompt.existingPlatform as PlatformType]?.name ?? duplicatePrompt.existingPlatform}</strong>.
            Replace it?
          </span>
          <button
            type="button"
            onClick={() => duplicatePrompt.resolve('replace')}
            className="rounded bg-amber-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-amber-700"
            data-testid="duplicate-replace-btn"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={() => duplicatePrompt.resolve('skip')}
            className="rounded border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted"
            data-testid="duplicate-skip-btn"
          >
            Skip
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
