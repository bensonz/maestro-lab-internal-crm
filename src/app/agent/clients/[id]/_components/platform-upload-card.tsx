'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { UploadDropzone, ScreenshotThumbnail } from '@/components/upload-dropzone'
import {
  uploadPlatformScreenshot,
  deletePlatformScreenshot,
} from '@/app/actions/platforms'
import { PlatformType, PlatformStatus } from '@/types'
import { getPlatformName, getPlatformAbbrev } from '@/lib/platforms'
import {
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'

interface PlatformUploadCardProps {
  clientId: string
  platformType: PlatformType
  status: PlatformStatus
  screenshots: string[]
  username: string | null
}

function getStatusBadge(status: PlatformStatus) {
  switch (status) {
    case PlatformStatus.VERIFIED:
      return (
        <Badge className="bg-chart-4/20 text-chart-4 text-xs rounded-md">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      )
    case PlatformStatus.PENDING_REVIEW:
      return (
        <Badge className="bg-primary/20 text-primary text-xs rounded-md">
          <Clock className="h-3 w-3 mr-1" />
          Pending Review
        </Badge>
      )
    case PlatformStatus.NEEDS_MORE_INFO:
      return (
        <Badge className="bg-accent/20 text-accent text-xs rounded-md">
          <AlertCircle className="h-3 w-3 mr-1" />
          Needs Info
        </Badge>
      )
    case PlatformStatus.REJECTED:
      return (
        <Badge className="bg-destructive/20 text-destructive text-xs rounded-md">
          <AlertCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      )
    case PlatformStatus.PENDING_UPLOAD:
      return (
        <Badge className="bg-accent/20 text-accent text-xs rounded-md">
          <Upload className="h-3 w-3 mr-1" />
          Pending Upload
        </Badge>
      )
    default:
      return (
        <Badge className="bg-muted text-muted-foreground text-xs rounded-md">
          Not Started
        </Badge>
      )
  }
}

export function PlatformUploadCard({
  clientId,
  platformType,
  status,
  screenshots,
  username,
}: PlatformUploadCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUploading, startUploadTransition] = useTransition()
  const [deletingPath, setDeletingPath] = useState<string | null>(null)

  const platformName = getPlatformName(platformType)
  const platformAbbrev = getPlatformAbbrev(platformType)

  const handleUpload = async (file: File) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      startUploadTransition(async () => {
        const formData = new FormData()
        formData.append('file', file)

        const result = await uploadPlatformScreenshot(clientId, platformType, formData)

        if (result.success) {
          toast.success(`Screenshot uploaded for ${platformName}`)
        } else {
          toast.error(result.error || 'Upload failed')
        }

        resolve(result)
      })
    })
  }

  const handleDelete = async (screenshotPath: string) => {
    setDeletingPath(screenshotPath)
    try {
      const result = await deletePlatformScreenshot(clientId, platformType, screenshotPath)
      if (result.success) {
        toast.success('Screenshot deleted')
      } else {
        toast.error(result.error || 'Delete failed')
      }
    } finally {
      setDeletingPath(null)
    }
  }

  const canUpload =
    status === PlatformStatus.NOT_STARTED ||
    status === PlatformStatus.PENDING_UPLOAD ||
    status === PlatformStatus.NEEDS_MORE_INFO ||
    status === PlatformStatus.REJECTED

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg p-2.5 text-left transition-all hover:bg-muted/30 ring-1 ring-border/30">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
            {platformAbbrev}
          </div>
          <div>
            <span className="text-sm font-medium text-foreground">{platformName}</span>
            {username && (
              <p className="text-xs text-muted-foreground">@{username}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {screenshots.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {screenshots.length} screenshot{screenshots.length !== 1 ? 's' : ''}
            </span>
          )}
          {getStatusBadge(status)}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapse data-[state=open]:animate-expand">
        <div className="space-y-3 pt-3 pl-2">
          {/* Screenshots Grid */}
          {screenshots.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Uploaded Screenshots</p>
              <div className="flex flex-wrap gap-2">
                {screenshots.map((screenshot) => (
                  <ScreenshotThumbnail
                    key={screenshot}
                    src={screenshot}
                    onDelete={() => handleDelete(screenshot)}
                    isDeleting={deletingPath === screenshot}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Upload Area */}
          {canUpload && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {screenshots.length > 0 ? 'Add More Screenshots' : 'Upload Screenshot'}
              </p>
              <UploadDropzone
                onUpload={handleUpload}
                disabled={isUploading}
              />
            </div>
          )}

          {/* Verified State */}
          {status === PlatformStatus.VERIFIED && (
            <div className="flex items-center gap-2 rounded-lg bg-chart-4/10 p-3 ring-1 ring-chart-4/20">
              <CheckCircle2 className="h-4 w-4 text-chart-4" />
              <span className="text-xs text-chart-4">
                Platform verified by backoffice
              </span>
            </div>
          )}

          {/* Pending Review State */}
          {status === PlatformStatus.PENDING_REVIEW && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3 ring-1 ring-primary/20">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xs text-primary">
                Awaiting backoffice review
              </span>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
