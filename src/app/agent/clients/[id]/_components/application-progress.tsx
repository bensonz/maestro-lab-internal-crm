'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  User,
  Building,
  FileCheck,
} from 'lucide-react'
import {
  IntakeStatus,
  PlatformType,
  PlatformStatus,
  ToDoType,
  ToDoStatus,
} from '@/types'
import { getPlatformName, getPlatformAbbrev } from '@/lib/platforms'
import { cn } from '@/lib/utils'

interface ApplicationProgressProps {
  client: {
    intakeStatus: IntakeStatus
    deadline: Date | null
    createdAt: Date
    statusChangedAt: Date
    platforms: {
      platformType: PlatformType
      status: PlatformStatus
      username: string | null
      screenshots: string[]
    }[]
    toDos: {
      type: ToDoType
      status: ToDoStatus
    }[]
    phoneAssignment: {
      phoneNumber: string
      issuedAt: Date | null
    } | null
    questionnaire: Record<string, unknown>
  }
}

type SectionStatus = 'complete' | 'in_progress' | 'empty'

function getSectionBadge(status: SectionStatus) {
  switch (status) {
    case 'complete':
      return (
        <Badge className="h-4 gap-0.5 rounded-full border border-success/30 bg-success/20 px-1 text-[9px] text-success">
          <CheckCircle2 className="h-2.5 w-2.5" /> Complete
        </Badge>
      )
    case 'in_progress':
      return (
        <Badge className="h-4 gap-0.5 rounded-full border border-primary/30 bg-primary/20 px-1 text-[9px] text-primary">
          <Clock className="h-2.5 w-2.5" /> In Progress
        </Badge>
      )
    default:
      return (
        <Badge className="h-4 gap-0.5 rounded-full border border-border bg-muted/20 px-1 text-[9px] text-muted-foreground">
          <AlertCircle className="h-2.5 w-2.5" /> Incomplete
        </Badge>
      )
  }
}

function getPlatformStatusColor(status: PlatformStatus): string {
  switch (status) {
    case PlatformStatus.VERIFIED:
      return 'bg-success/20 text-success border-success/40'
    case PlatformStatus.PENDING_REVIEW:
      return 'bg-primary/20 text-primary border-primary/40'
    case PlatformStatus.NEEDS_MORE_INFO:
    case PlatformStatus.PENDING_UPLOAD:
      return 'bg-warning/20 text-warning border-warning/40'
    default:
      return 'bg-muted/50 text-muted-foreground border-border'
  }
}

function getPlatformQuickColor(status: PlatformStatus): string {
  switch (status) {
    case PlatformStatus.VERIFIED:
      return 'bg-success/20 text-success border-success/40 hover:opacity-80'
    case PlatformStatus.PENDING_REVIEW:
      return 'bg-primary/20 text-primary border-primary/40 hover:opacity-80'
    default:
      return 'bg-muted/50 text-muted-foreground border-border hover:opacity-80'
  }
}

export function ApplicationProgress({ client }: ApplicationProgressProps) {
  const [personalExpanded, setPersonalExpanded] = useState(false)
  const [platformsExpanded, setPlatformsExpanded] = useState(true)
  const [contractExpanded, setContractExpanded] = useState(false)

  const financePlatforms = client.platforms.filter(
    (p) =>
      p.platformType === PlatformType.BANK ||
      p.platformType === PlatformType.PAYPAL ||
      p.platformType === PlatformType.EDGEBOOST,
  )
  const sportsPlatforms = client.platforms.filter(
    (p) =>
      p.platformType !== PlatformType.BANK &&
      p.platformType !== PlatformType.PAYPAL &&
      p.platformType !== PlatformType.EDGEBOOST,
  )

  // Calculate progress
  const platformsCompleted = client.platforms.filter(
    (p) => p.status === PlatformStatus.VERIFIED,
  ).length
  const platformsTotal = client.platforms.length

  // Personal info status (based on intake status progression)
  const statusOrder: IntakeStatus[] = [
    IntakeStatus.PENDING,
    IntakeStatus.PHONE_ISSUED,
    IntakeStatus.IN_EXECUTION,
    IntakeStatus.READY_FOR_APPROVAL,
    IntakeStatus.APPROVED,
  ]
  const currentIndex = statusOrder.indexOf(client.intakeStatus)
  const personalStatus: SectionStatus =
    currentIndex >= 1 ? 'complete' : currentIndex >= 0 ? 'in_progress' : 'empty'

  // Contract status
  const contractStatus: SectionStatus =
    currentIndex >= 3 ? 'complete' : currentIndex >= 2 ? 'in_progress' : 'empty'

  // Overall progress
  const totalSections = 3
  const completedSections = [
    personalStatus === 'complete',
    platformsCompleted === platformsTotal,
    contractStatus === 'complete',
  ].filter(Boolean).length

  return (
    <Card className="flex h-full flex-col border-border/50 bg-card/80">
      <CardHeader className="px-3 pb-2 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            Application Progress
          </CardTitle>
          <Badge
            variant="outline"
            className={cn(
              'h-5 px-2 font-mono text-[10px]',
              completedSections === totalSections
                ? 'border-success/40 text-success'
                : completedSections > 0
                  ? 'border-primary/40 text-primary'
                  : 'border-border text-muted-foreground',
            )}
          >
            {completedSections}/{totalSections}
          </Badge>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              completedSections === totalSections ? 'bg-success' : 'bg-primary',
            )}
            style={{
              width: `${(completedSections / totalSections) * 100}%`,
            }}
          />
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 p-0">
        <div className="divide-y divide-border">
          {/* 1. Personal Information */}
          <Collapsible
            open={personalExpanded}
            onOpenChange={setPersonalExpanded}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between p-2.5 text-left transition-colors hover:bg-muted/30">
              <div className="flex items-center gap-1.5">
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
                    personalExpanded && 'rotate-180',
                  )}
                />
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Personal Information
                </span>
              </div>
              {getSectionBadge(personalStatus)}
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t border-border/50 bg-muted/10">
              <div className="space-y-1 p-2.5">
                <p className="text-xs text-muted-foreground">
                  Identity, contact info, and addresses verified via profile
                  card above.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* 2. All Platforms */}
          <Collapsible
            open={platformsExpanded}
            onOpenChange={setPlatformsExpanded}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between p-2.5 text-left transition-colors hover:bg-muted/30">
              <div className="flex items-center gap-1.5">
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
                    platformsExpanded && 'rotate-180',
                  )}
                />
                <Building className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">All Platforms</span>
              </div>
              <span
                className={cn(
                  'font-mono text-xs font-medium',
                  platformsCompleted === platformsTotal
                    ? 'text-success'
                    : platformsCompleted > 0
                      ? 'text-primary'
                      : 'text-muted-foreground',
                )}
              >
                {platformsCompleted}/{platformsTotal}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t border-border/50 bg-muted/10">
              <div className="divide-y divide-border/30">
                {/* Quick-Select Icons */}
                <div className="px-2.5 py-2">
                  <TooltipProvider delayDuration={100}>
                    <div className="flex flex-wrap items-center gap-0.5">
                      {financePlatforms.map((p) => (
                        <Tooltip key={p.platformType}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'flex h-5 w-6 items-center justify-center rounded border text-[9px] font-semibold',
                                getPlatformQuickColor(p.status),
                              )}
                            >
                              {getPlatformAbbrev(p.platformType)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            {getPlatformName(p.platformType)}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      <div className="mx-1 h-4 w-px bg-border" />
                      {sportsPlatforms.map((p) => (
                        <Tooltip key={p.platformType}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'flex h-5 w-6 items-center justify-center rounded border text-[8px] font-semibold',
                                getPlatformQuickColor(p.status),
                              )}
                            >
                              {getPlatformAbbrev(p.platformType)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            {getPlatformName(p.platformType)}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </TooltipProvider>
                </div>

                {/* Finance Platforms */}
                {financePlatforms.map((platform) => {
                  const screenshotCount = platform.screenshots.length
                  return (
                    <div
                      key={platform.platformType}
                      className="flex items-center justify-between p-2 text-left"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">
                          {getPlatformName(platform.platformType)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {screenshotCount} uploads
                        </span>
                        <Badge
                          className={cn(
                            'h-4 rounded-full border px-1.5 text-[9px]',
                            getPlatformStatusColor(platform.status),
                          )}
                        >
                          {platform.status === PlatformStatus.VERIFIED
                            ? 'Complete'
                            : platform.status === PlatformStatus.PENDING_REVIEW
                              ? 'Pending'
                              : platform.status === PlatformStatus.NOT_STARTED
                                ? 'Not Started'
                                : 'Incomplete'}
                        </Badge>
                      </div>
                    </div>
                  )
                })}

                {/* Separator */}
                <div className="px-3 py-1.5">
                  <p className="text-center text-[10px] text-muted-foreground">
                    Sportsbook Platforms
                  </p>
                </div>

                {/* Sportsbook Platforms */}
                {sportsPlatforms.map((platform) => {
                  const screenshotCount = platform.screenshots.length
                  return (
                    <div
                      key={platform.platformType}
                      className="flex items-center justify-between p-2 text-left"
                    >
                      <span className="text-sm">
                        {getPlatformName(platform.platformType)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {screenshotCount} uploads
                        </span>
                        <Badge
                          className={cn(
                            'h-4 rounded-full border px-1.5 text-[9px]',
                            getPlatformStatusColor(platform.status),
                          )}
                        >
                          {platform.status === PlatformStatus.VERIFIED
                            ? 'Complete'
                            : platform.status === PlatformStatus.PENDING_REVIEW
                              ? 'Pending'
                              : platform.status === PlatformStatus.NOT_STARTED
                                ? 'Not Started'
                                : 'Incomplete'}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* 3. Contract */}
          <Collapsible
            open={contractExpanded}
            onOpenChange={setContractExpanded}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between p-2.5 text-left transition-colors hover:bg-muted/30">
              <div className="flex items-center gap-1.5">
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
                    contractExpanded && 'rotate-180',
                  )}
                />
                <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">Contract</span>
              </div>
              {getSectionBadge(contractStatus)}
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t border-border/50 bg-muted/10">
              <div className="p-2.5">
                <div className="flex items-center justify-between rounded bg-background/50 px-2 py-1.5">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs text-muted-foreground">
                      Service Agreement
                    </span>
                    <p className="truncate font-mono text-sm">
                      <span className="italic text-muted-foreground/50">
                        — not uploaded
                      </span>
                    </p>
                  </div>
                  {getSectionBadge(contractStatus)}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  )
}
