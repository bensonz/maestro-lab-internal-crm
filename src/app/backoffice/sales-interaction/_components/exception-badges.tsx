'use client'

import { Badge } from '@/components/ui/badge'
import {
  Clock,
  AlertTriangle,
  XCircle,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExceptionState, ExceptionType } from '@/types/backend-types'

const EXCEPTION_CONFIG: Record<
  ExceptionType,
  { icon: React.ElementType; urgent?: boolean }
> = {
  'deadline-approaching': { icon: Clock },
  overdue: { icon: AlertTriangle, urgent: true },
  'platform-rejection': { icon: XCircle },
  'needs-more-info': { icon: Info },
  'extension-pending': { icon: Clock },
  'execution-delayed': { icon: AlertTriangle, urgent: true },
}

export function ExceptionBadge({ exception }: { exception: ExceptionState }) {
  const config = EXCEPTION_CONFIG[exception.type]
  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 px-1.5 py-0 text-[10px] font-medium',
        config.urgent
          ? 'border-destructive/30 bg-destructive/5 text-destructive'
          : 'text-muted-foreground',
      )}
      data-testid={`exception-badge-${exception.type}`}
    >
      <Icon className="h-3 w-3" />
      {exception.label}
    </Badge>
  )
}

export function ExceptionBadgeGroup({
  exceptions,
  maxVisible = 3,
}: {
  exceptions: ExceptionState[]
  maxVisible?: number
}) {
  if (exceptions.length === 0) return null

  const visible = exceptions.slice(0, maxVisible)
  const overflowCount = exceptions.length - maxVisible

  return (
    <div className="flex flex-wrap items-center gap-1" data-testid="exception-badge-group">
      {visible.map((ex, i) => (
        <ExceptionBadge key={`${ex.type}-${i}`} exception={ex} />
      ))}
      {overflowCount > 0 && (
        <Badge
          variant="outline"
          className="px-1.5 py-0 text-[10px] font-medium text-muted-foreground"
        >
          +{overflowCount}
        </Badge>
      )}
    </div>
  )
}
