'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { CheckCircle2, AlertTriangle, Image, Edit3 } from 'lucide-react'

interface DetectedData {
  platform?: string
  username?: string
  password?: string
  contentType?: string
  confidence?: number
}

interface AIDetectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageUrl: string
  detectedData: DetectedData
  onConfirm: (data: DetectedData) => void
  onOverride: (data: DetectedData) => void
}

export function AIDetectionModal({
  open,
  onOpenChange,
  imageUrl,
  detectedData,
  onConfirm,
  onOverride,
}: AIDetectionModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<DetectedData>(detectedData)
  const [editCount, setEditCount] = useState(0)

  const handleConfirm = () => {
    if (isEditing) {
      setEditCount((prev) => prev + 1)
      onOverride({ ...editedData, confidence: 100 })
    } else {
      onConfirm(detectedData)
    }
    onOpenChange(false)
    setIsEditing(false)
  }

  const handleEnableEdit = () => {
    setIsEditing(true)
    setEditedData(detectedData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Image className="h-5 w-5 text-primary" />
            AI Image Detection Result
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Image Preview */}
          <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
            <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
              Uploaded Image
            </p>
            <div className="flex aspect-video items-center justify-center rounded bg-muted/40">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Uploaded"
                  className="max-h-full max-w-full rounded object-contain"
                />
              ) : (
                <div className="text-sm text-muted-foreground">
                  Preview not available
                </div>
              )}
            </div>
          </div>

          {/* Detected Data */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Detected Information
              </p>
              {detectedData.confidence && (
                <Badge
                  variant="outline"
                  className={
                    detectedData.confidence > 80
                      ? 'border-success/50 text-success'
                      : 'border-warning/50 text-warning'
                  }
                >
                  {detectedData.confidence}% confidence
                </Badge>
              )}
            </div>

            <div className="space-y-3">
              {detectedData.contentType && (
                <div className="rounded border border-border/30 bg-muted/20 p-2">
                  <p className="text-xs text-muted-foreground">Content Type</p>
                  <p className="font-mono text-sm text-foreground">
                    {detectedData.contentType}
                  </p>
                </div>
              )}

              {detectedData.platform && (
                <div className="rounded border border-border/30 bg-muted/20 p-2">
                  <p className="text-xs text-muted-foreground">Platform</p>
                  {isEditing ? (
                    <Input
                      value={editedData.platform}
                      onChange={(e) =>
                        setEditedData({
                          ...editedData,
                          platform: e.target.value,
                        })
                      }
                      className="mt-1 h-7 bg-background font-mono text-sm"
                    />
                  ) : (
                    <p className="font-mono text-sm text-foreground">
                      {detectedData.platform}
                    </p>
                  )}
                </div>
              )}

              {detectedData.username && (
                <div className="rounded border border-border/30 bg-muted/20 p-2">
                  <p className="text-xs text-muted-foreground">Username</p>
                  {isEditing ? (
                    <Input
                      value={editedData.username}
                      onChange={(e) =>
                        setEditedData({
                          ...editedData,
                          username: e.target.value,
                        })
                      }
                      className="mt-1 h-7 bg-background font-mono text-sm"
                    />
                  ) : (
                    <p className="font-mono text-sm text-foreground">
                      {detectedData.username}
                    </p>
                  )}
                </div>
              )}

              {detectedData.password && (
                <div className="rounded border border-border/30 bg-muted/20 p-2">
                  <p className="text-xs text-muted-foreground">Password</p>
                  {isEditing ? (
                    <Input
                      value={editedData.password}
                      onChange={(e) =>
                        setEditedData({
                          ...editedData,
                          password: e.target.value,
                        })
                      }
                      className="mt-1 h-7 bg-background font-mono text-sm"
                    />
                  ) : (
                    <p className="font-mono text-sm text-foreground">
                      {detectedData.password}
                    </p>
                  )}
                </div>
              )}
            </div>

            {editCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-warning">
                <AlertTriangle className="h-3 w-3" />
                <span>{editCount} edit(s) will be logged to timeline</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnableEdit}
                className="text-xs"
              >
                <Edit3 className="mr-1 h-3 w-3" />
                Override / Correct
              </Button>
            )}
            {isEditing && (
              <Badge
                variant="outline"
                className="border-warning/50 text-xs text-warning"
              >
                Override Mode Active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              className="bg-primary hover:bg-primary/90"
            >
              <CheckCircle2 className="mr-1 h-4 w-4" />
              {isEditing ? 'Confirm Override' : 'Confirm Detection'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
