'use client'

import { Badge } from '@/components/ui/badge'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Info, CheckCircle2, XCircle, FileImage } from 'lucide-react'
import { getInstructionsForPlatform } from './todo-instructions'

interface ToDoHoverPopoverProps {
  title: string
  platformType: string | null
  stepNumber: number | null
  triggerSource?: string
  createdAt: Date
  children?: React.ReactNode
}

export function ToDoHoverPopover({
  title,
  platformType,
  stepNumber,
  triggerSource = 'Phone number issued',
  createdAt,
  children,
}: ToDoHoverPopoverProps) {
  const instructions = getInstructionsForPlatform(platformType)

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children || (
          <button className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <Info className="h-3.5 w-3.5" />
          </button>
        )}
      </HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="start"
        className="w-80 bg-card/95 backdrop-blur-sm border-border/50"
      >
        <div className="space-y-4">
          {/* Title and Badges */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">{title}</h4>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs rounded-md">
                Rule
              </Badge>
              {stepNumber && (
                <Badge variant="outline" className="text-xs rounded-md">
                  Step {stepNumber}
                </Badge>
              )}
            </div>
          </div>

          {/* What Agent Must Do */}
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              What Agent Must Do
            </h5>
            <ul className="space-y-1.5">
              {instructions.mustDo.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs text-foreground"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* What Agent Must Not Do */}
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              What Agent Must Not Do
            </h5>
            <ul className="space-y-1.5">
              {instructions.mustNotDo.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs text-foreground"
                >
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Screenshot Guidance */}
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <FileImage className="h-3.5 w-3.5" />
              Screenshot Guidance
            </h5>
            <div className="space-y-1 text-xs">
              <div className="flex gap-2">
                <span className="text-muted-foreground">Page:</span>
                <span className="text-foreground">
                  {instructions.screenshotGuidance.page}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground">Section:</span>
                <span className="text-foreground">
                  {instructions.screenshotGuidance.section}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-success">Success:</span>
                <span className="text-foreground">
                  {instructions.screenshotGuidance.success}
                </span>
              </div>
            </div>
          </div>

          {/* Success Criteria */}
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Success Criteria
            </h5>
            <p className="text-xs text-foreground">
              {instructions.successCriteria}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs text-muted-foreground">
            <div>
              <span className="block text-muted-foreground/70">
                Trigger Source
              </span>
              <span>{triggerSource}</span>
            </div>
            <div className="text-right">
              <span className="block text-muted-foreground/70">Created</span>
              <span>
                {new Date(createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
