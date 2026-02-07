'use client'

import { useState, useCallback, useRef, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Upload,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  Edit2,
  X,
} from 'lucide-react'
import {
  uploadToDoScreenshots,
  confirmToDoUpload,
  type AIDetection,
} from '@/app/actions/todos'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface UploadModalProps {
  todoId: string
  todoTitle: string
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

type ModalState = 'upload' | 'processing' | 'results' | 'editing'

export function UploadModal({
  todoId,
  todoTitle,
  isOpen,
  onClose,
  onComplete,
}: UploadModalProps) {
  const [state, setState] = useState<ModalState>('upload')
  const [detections, setDetections] = useState<AIDetection[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editedDetections, setEditedDetections] = useState<AIDetection[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setState('upload')
    setDetections([])
    setEditedDetections([])
    setEditingIndex(null)
    setSelectedFiles([])
  }, [])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [resetState, onClose])

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files).slice(0, 5)
    setSelectedFiles((prev) => [...prev, ...fileArray].slice(0, 5))
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles],
  )

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleUpload = useCallback(() => {
    if (selectedFiles.length === 0) return

    setState('processing')

    startTransition(async () => {
      const formData = new FormData()
      selectedFiles.forEach((file) => {
        formData.append('files', file)
      })

      const result = await uploadToDoScreenshots(todoId, formData)

      if (result.success && result.detections) {
        setDetections(result.detections)
        setEditedDetections(result.detections)
        setState('results')
      } else {
        toast.error(result.error || 'Upload failed')
        setState('upload')
      }
    })
  }, [selectedFiles, todoId])

  const handleConfirm = useCallback(() => {
    startTransition(async () => {
      const result = await confirmToDoUpload(todoId, editedDetections)

      if (result.success) {
        toast.success('Screenshots uploaded and To-Do completed!')
        handleClose()
        onComplete()
      } else {
        toast.error(result.error || 'Failed to confirm upload')
      }
    })
  }, [todoId, editedDetections, handleClose, onComplete])

  const handleEdit = useCallback((index: number) => {
    setEditingIndex(index)
    setState('editing')
  }, [])

  const handleSaveEdit = useCallback(
    (index: number, field: string, value: string) => {
      setEditedDetections((prev) =>
        prev.map((d, i) =>
          i === index
            ? { ...d, extracted: { ...d.extracted, [field]: value } }
            : d,
        ),
      )
    },
    [],
  )

  const handleDoneEditing = useCallback(() => {
    setEditingIndex(null)
    setState('results')
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {state === 'upload' && (
              <>
                <Upload className="h-5 w-5 text-primary" />
                Upload Screenshots
              </>
            )}
            {state === 'processing' && (
              <>
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                Processing...
              </>
            )}
            {(state === 'results' || state === 'editing') && (
              <>
                <ImageIcon className="h-5 w-5 text-primary" />
                AI Image Detection Result
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Upload State */}
        {state === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Uploading for:{' '}
              <span className="text-foreground font-medium">{todoTitle}</span>
            </p>

            {/* Dropzone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                setIsDragging(false)
              }}
              onClick={() => inputRef.current?.click()}
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-all cursor-pointer',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border/60 hover:border-primary/50 hover:bg-muted/20',
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                className="hidden"
              />
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">
                Drop images here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WebP up to 5MB each
              </p>
              <p className="text-xs text-muted-foreground">
                Bulk upload: up to 5 images
              </p>
            </div>

            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Selected files ({selectedFiles.length}/5)
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="group relative flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs"
                    >
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="max-w-[120px] truncate">
                        {file.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(idx)
                        }}
                        className="ml-1 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || isPending}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload
              </Button>
            </div>
          </div>
        )}

        {/* Processing State */}
        {state === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">
              Analyzing images with AI...
            </p>
          </div>
        )}

        {/* Results State */}
        {(state === 'results' || state === 'editing') && (
          <div className="space-y-4">
            {editedDetections.map((detection, idx) => (
              <div
                key={detection.path}
                className="flex gap-4 rounded-lg bg-muted/30 p-4 ring-1 ring-border/30"
              >
                {/* Image Preview */}
                <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg bg-muted/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/${detection.path}`}
                    alt="Uploaded"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
                    <span className="text-xs text-muted-foreground">
                      Preview
                    </span>
                  </div>
                </div>

                {/* Detection Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Detected Information
                    </span>
                    <Badge className="bg-success/20 text-success text-xs">
                      {Math.round(detection.confidence * 100)}% confidence
                    </Badge>
                  </div>

                  {editingIndex === idx ? (
                    // Editing Mode
                    <div className="space-y-2">
                      <div className="rounded-lg bg-card/50 p-2 ring-1 ring-border/30">
                        <label className="text-xs text-muted-foreground">
                          Content Type
                        </label>
                        <Input
                          value={detection.contentType}
                          onChange={(e) => {
                            setEditedDetections((prev) =>
                              prev.map((d, i) =>
                                i === idx
                                  ? { ...d, contentType: e.target.value }
                                  : d,
                              ),
                            )
                          }}
                          className="h-8 text-sm mt-1"
                        />
                      </div>
                      {Object.entries(detection.extracted).map(
                        ([key, value]) => (
                          <div
                            key={key}
                            className="rounded-lg bg-card/50 p-2 ring-1 ring-border/30"
                          >
                            <label className="text-xs text-muted-foreground capitalize">
                              {key}
                            </label>
                            <Input
                              value={value}
                              onChange={(e) =>
                                handleSaveEdit(idx, key, e.target.value)
                              }
                              className="h-8 text-sm mt-1"
                            />
                          </div>
                        ),
                      )}
                      <Button size="sm" onClick={handleDoneEditing}>
                        Done Editing
                      </Button>
                    </div>
                  ) : (
                    // Display Mode
                    <div className="space-y-2">
                      <div className="rounded-lg bg-card/50 p-2 ring-1 ring-border/30">
                        <span className="text-xs text-muted-foreground">
                          Content Type
                        </span>
                        <p className="text-sm font-medium text-foreground">
                          {detection.contentType}
                        </p>
                      </div>
                      {Object.entries(detection.extracted).map(
                        ([key, value]) => (
                          <div
                            key={key}
                            className="rounded-lg bg-card/50 p-2 ring-1 ring-border/30"
                          >
                            <span className="text-xs text-muted-foreground capitalize">
                              {key}
                            </span>
                            <p className="text-sm font-mono text-foreground">
                              {value}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Actions */}
            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => handleEdit(0)}
                disabled={state === 'editing' || isPending}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Override / Correct
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={state === 'editing' || isPending}
                  className="bg-success hover:bg-success/90 text-success-foreground"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Confirm Detection
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
