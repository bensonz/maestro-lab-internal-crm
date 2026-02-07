'use client'

import {
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpDown,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  BETTING_PLATFORMS,
  type ServerClientStats,
  type ViewPlatformStatus,
} from './types'

const METRIC_CONFIG = [
  {
    key: 'total' as const,
    label: 'Total Clients',
    icon: Users,
    variant: 'primary' as const,
  },
  {
    key: 'active' as const,
    label: 'Active',
    icon: CheckCircle2,
    variant: 'success' as const,
  },
  {
    key: 'closed' as const,
    label: 'Closed',
    icon: XCircle,
    variant: 'muted' as const,
  },
  {
    key: 'furtherVerification' as const,
    label: 'Further Verification',
    icon: AlertTriangle,
    variant: 'warning' as const,
  },
]

interface ClientSidebarProps {
  stats: ServerClientStats
  platformFilter: string
  onPlatformFilterChange: (v: string) => void
  statusFilter: ViewPlatformStatus | 'all'
  onStatusFilterChange: (v: ViewPlatformStatus | 'all') => void
  sortByFunds: 'desc' | 'asc' | 'none'
  onSortByFundsChange: (v: 'desc' | 'asc' | 'none') => void
}

export function ClientSidebar({
  stats,
  platformFilter,
  onPlatformFilterChange,
  statusFilter,
  onStatusFilterChange,
  sortByFunds,
  onSortByFundsChange,
}: ClientSidebarProps) {
  return (
    <div
      className="w-64 min-w-64 space-y-4 border-r border-border bg-sidebar p-4"
      data-testid="client-sidebar"
    >
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Client Management
        </h1>
      </div>

      {/* Summary Metrics */}
      <div className="space-y-2">
        {METRIC_CONFIG.map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.key} className="card-terminal">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {metric.label}
                    </p>
                    <p className="mt-0.5 font-mono text-xl font-semibold">
                      {stats[metric.key]}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg',
                      metric.variant === 'primary' && 'bg-primary/20',
                      metric.variant === 'success' && 'bg-success/20',
                      metric.variant === 'muted' && 'bg-muted',
                      metric.variant === 'warning' && 'bg-warning/20',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4',
                        metric.variant === 'primary' && 'text-primary',
                        metric.variant === 'success' && 'text-success',
                        metric.variant === 'muted' && 'text-muted-foreground',
                        metric.variant === 'warning' && 'text-warning',
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Filters
        </p>

        <div className="space-y-2">
          <Select
            value={platformFilter}
            onValueChange={onPlatformFilterChange}
          >
            <SelectTrigger
              className="h-8 w-full bg-background/50 text-xs"
              data-testid="platform-filter"
            >
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {BETTING_PLATFORMS.map((platform) => (
                <SelectItem key={platform.id} value={platform.id}>
                  {platform.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) =>
              onStatusFilterChange(v as ViewPlatformStatus | 'all')
            }
          >
            <SelectTrigger
              className="h-8 w-full bg-background/50 text-xs"
              data-testid="status-filter"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="limited">Limited</SelectItem>
              <SelectItem value="pipeline">Pipeline</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 w-full gap-2 text-xs',
            sortByFunds !== 'none' && 'border-primary/30 bg-primary/10',
          )}
          onClick={() => {
            onSortByFundsChange(
              sortByFunds === 'none'
                ? 'desc'
                : sortByFunds === 'desc'
                  ? 'asc'
                  : 'none',
            )
          }}
          data-testid="sort-by-funds"
        >
          <ArrowUpDown className="h-3 w-3" />
          {sortByFunds === 'desc'
            ? 'Highest First'
            : sortByFunds === 'asc'
              ? 'Lowest First'
              : 'Sort by Funds'}
        </Button>
      </div>
    </div>
  )
}
