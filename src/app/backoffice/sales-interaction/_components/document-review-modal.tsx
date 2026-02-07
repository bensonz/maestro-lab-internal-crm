'use client'

import { useState, useTransition } from 'react'
import {
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { PlatformType } from '@/types'
import {
  approvePlatformScreenshot,
  rejectPlatformScreenshot,
  requestMoreInfo,
} from '@/app/actions/platforms'

interface DocumentReviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName: string
  platformType: PlatformType
  platformLabel: string
  task: string
  screenshots: string[]
}

type ActiveAction = 'needs_more_info' | 'reject' | null

export function DocumentReviewModal({
  open,
  onOpenChange,
  clientId,
  clientName,
  platformType,
  platformLabel,
  task,
  screenshots,
}: DocumentReviewModalProps) {
  const [isPending, startTransition] = useTransition()
  const [activeAction, setActiveAction] = useState<ActiveAction>(null)
  const [notes, setNotes] = useState('')

  function resetState() {
    setActiveAction(null)
    setNotes('')
  }

  function handleOpenChange(open: boolean) {
    if (!open) resetState()
    onOpenChange(open)
  }

  function handleApprove() {
    startTransition(async () => {
      const result = await approvePlatformScreenshot(clientId, platformType)
      if (result.success) {
        toast.success('Platform screenshot approved')
        handleOpenChange(false)
      } else {
        toast.error(result.error || 'Failed to approve')
      }
    })
  }

  function handleReject() {
    if (activeAction !== 'reject') {
      setActiveAction('reject')
      return
    }

    startTransition(async () => {
      const result = await rejectPlatformScreenshot(
        clientId,
        platformType,
        notes || undefined,
      )
      if (result.success) {
        toast.success('Platform screenshot rejected')
        handleOpenChange(false)
      } else {
        toast.error(result.error || 'Failed to reject')
      }
    })
  }

  function handleNeedsMoreInfo() {
    if (activeAction !== 'needs_more_info') {
      setActiveAction('needs_more_info')
      return
    }

    if (!notes.trim()) {
      toast.error('Please provide notes explaining what information is needed')
      return
    }

    startTransition(async () => {
      const result = await requestMoreInfo(clientId, platformType, notes)
      if (result.success) {
        toast.success('More info requested from agent')
        handleOpenChange(false)
      } else {
        toast.error(result.error || 'Failed to request more info')
      }
    })
  }

  function getFilename(filepath: string) {
    return filepath.split('/').pop() || filepath
  }

  function isImage(filepath: string) {
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(filepath)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Document Review
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Client</p>
              <p className="font-medium">{clientName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Platform</p>
              <p className="font-medium">{platformLabel}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Task</p>
              <p className="font-medium">{task}</p>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-2 text-xs text-muted-foreground">
              Submitted Documents
            </p>
            {screenshots.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No documents uploaded yet
              </p>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {screenshots.map((filepath, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        {isImage(filepath) ? (
                          <div className="h-10 w-10 overflow-hidden rounded bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`/${filepath}`}
                              alt={getFilename(filepath)}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium">
                            {getFilename(filepath)}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        asChild
                      >
                        <a
                          href={`/${filepath}`}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-4 w-4" />
                          <span className="sr-only">Download</span>
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {activeAction && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {activeAction === 'needs_more_info'
                  ? 'What additional information is needed?'
                  : 'Reason for rejection (optional)'}
              </p>
              <Textarea
                placeholder={
                  activeAction === 'needs_more_info'
                    ? 'Describe what information or documents are needed...'
                    : 'Provide a reason for rejection...'
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="text-amber-500 hover:text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
            onClick={handleNeedsMoreInfo}
            disabled={isPending}
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            {activeAction === 'needs_more_info' ? 'Submit' : 'Needs More Info'}
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={handleReject}
            disabled={isPending}
          >
            <XCircle className="mr-2 h-4 w-4" />
            {activeAction === 'reject' ? 'Confirm Reject' : 'Reject'}
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={handleApprove}
            disabled={isPending}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
