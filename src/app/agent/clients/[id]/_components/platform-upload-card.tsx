'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { PlatformType, PlatformStatus } from '@/types'
import { getPlatformName, getPlatformAbbrev } from '@/lib/platforms'
import {
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Upload,
  Image as ImageIcon,
} from 'lucide-react'

interface PlatformUploadCardProps {
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
  platformType,
  status,
  screenshots,
  username,
}: PlatformUploadCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  const platformName = getPlatformName(platformType)
  const platformAbbrev = getPlatformAbbrev(platformType)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg p-2.5 text-left transition-all hover:bg-muted/30 ring-1 ring-border/30">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
            {platformAbbrev}
          </div>
          <div>
            <span className="text-sm font-medium text-foreground">
              {platformName}
            </span>
            {username && (
              <p className="text-xs text-muted-foreground">@{username}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {screenshots.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {screenshots.length} screenshot
              {screenshots.length !== 1 ? 's' : ''}
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
          {/* Screenshots Grid (read-only) */}
          {screenshots.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Uploaded Screenshots
              </p>
              <div className="flex flex-wrap gap-2">
                {screenshots.map((screenshot) => (
                  <div
                    key={screenshot}
                    className="relative h-16 w-16 overflow-hidden rounded-lg bg-muted/50 ring-1 ring-border/30"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        screenshot.startsWith('/')
                          ? screenshot
                          : `/${screenshot}`
                      }
                      alt="Screenshot"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove(
                          'hidden',
                        )
                      }}
                    />
                    <div className="hidden h-full w-full items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Messages */}
          {status === PlatformStatus.VERIFIED && (
            <div className="flex items-center gap-2 rounded-lg bg-chart-4/10 p-3 ring-1 ring-chart-4/20">
              <CheckCircle2 className="h-4 w-4 text-chart-4" />
              <span className="text-xs text-chart-4">
                Platform verified by backoffice
              </span>
            </div>
          )}

          {status === PlatformStatus.PENDING_REVIEW && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3 ring-1 ring-primary/20">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xs text-primary">
                Awaiting backoffice review
              </span>
            </div>
          )}

          {(status === PlatformStatus.NOT_STARTED ||
            status === PlatformStatus.PENDING_UPLOAD) && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-3 ring-1 ring-border/30">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Complete the related To-Do to upload screenshots
              </span>
            </div>
          )}

          {status === PlatformStatus.NEEDS_MORE_INFO && (
            <div className="flex items-center gap-2 rounded-lg bg-accent/10 p-3 ring-1 ring-accent/20">
              <AlertCircle className="h-4 w-4 text-accent" />
              <span className="text-xs text-accent">
                Additional information required - check your To-Dos
              </span>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
