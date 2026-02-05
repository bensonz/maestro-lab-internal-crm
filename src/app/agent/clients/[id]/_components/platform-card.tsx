import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getPlatformName, getPlatformAbbrev, isSportsPlatform } from '@/lib/platforms'
import { PlatformType, PlatformStatus } from '@/types'
import { Upload, Image, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react'

interface PlatformCardProps {
  platform: {
    id: string
    platformType: PlatformType
    status: PlatformStatus
    statusLabel: string
    statusColor: string
    username: string | null
    screenshots: string[]
  }
}

function StatusIcon({ status, className }: { status: PlatformStatus; className?: string }) {
  switch (status) {
    case PlatformStatus.VERIFIED:
      return <CheckCircle2 className={className} />
    case PlatformStatus.REJECTED:
      return <XCircle className={className} />
    case PlatformStatus.NEEDS_MORE_INFO:
      return <AlertCircle className={className} />
    case PlatformStatus.PENDING_REVIEW:
    case PlatformStatus.PENDING_EXTERNAL:
      return <Clock className={className} />
    default:
      return <Clock className={className} />
  }
}

export function PlatformCard({ platform }: PlatformCardProps) {
  const name = getPlatformName(platform.platformType)
  const abbrev = getPlatformAbbrev(platform.platformType)
  const isSports = isSportsPlatform(platform.platformType)
  const hasScreenshot = platform.screenshots.length > 0
  const canUpload =
    platform.status === PlatformStatus.NOT_STARTED ||
    platform.status === PlatformStatus.PENDING_UPLOAD ||
    platform.status === PlatformStatus.NEEDS_MORE_INFO

  return (
    <Card className="group border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 card-interactive">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold ${
                isSports
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                  : 'bg-chart-5/10 text-chart-5 ring-1 ring-chart-5/20'
              }`}
            >
              {abbrev}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{name}</h3>
              <p className="text-xs text-muted-foreground">
                {isSports ? 'Sports Betting' : 'Financial'}
              </p>
            </div>
          </div>
          <Badge className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium ${platform.statusColor}`}>
            <StatusIcon status={platform.status} className="mr-1 h-3 w-3" />
            {platform.statusLabel}
          </Badge>
        </div>

        {/* Username if exists */}
        {platform.username && (
          <p className="mb-3 text-sm text-muted-foreground">
            Username: <span className="text-foreground">{platform.username}</span>
          </p>
        )}

        {/* Screenshot or Upload Button */}
        <div className="mt-auto">
          {hasScreenshot ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted/50 ring-1 ring-border/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={platform.screenshots[0]}
                alt={`${name} screenshot`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                <Image className="h-3 w-3" />
                <span>{platform.screenshots.length} screenshot{platform.screenshots.length > 1 ? 's' : ''}</span>
              </div>
            </div>
          ) : canUpload ? (
            <Button
              variant="outline"
              className="w-full h-20 rounded-lg border-dashed border-border/60 bg-muted/20 text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
            >
              <div className="flex flex-col items-center gap-1">
                <Upload className="h-5 w-5" />
                <span className="text-xs">Upload Screenshot</span>
              </div>
            </Button>
          ) : (
            <div className="flex h-20 items-center justify-center rounded-lg bg-muted/30 ring-1 ring-border/20">
              <span className="text-xs text-muted-foreground">
                {platform.status === PlatformStatus.PENDING_REVIEW
                  ? 'Awaiting review...'
                  : platform.status === PlatformStatus.VERIFIED
                  ? 'Verification complete'
                  : 'No action needed'}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
