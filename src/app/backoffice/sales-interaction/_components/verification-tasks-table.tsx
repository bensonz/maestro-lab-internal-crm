'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, CheckCircle, Clock } from 'lucide-react'
import type { VerificationTask } from '@/backend/data/operations'
import { PlatformType } from '@/types'
import { cn } from '@/lib/utils'
import { DocumentReviewModal } from './document-review-modal'
import { DeadlineCountdown } from '@/components/deadline-countdown'

interface VerificationTasksTableProps {
  tasks: VerificationTask[]
  selectedAgentId: string | null
}

export function VerificationTasksTable({
  tasks,
  selectedAgentId,
}: VerificationTasksTableProps) {
  const [selectedTask, setSelectedTask] = useState<VerificationTask | null>(
    null,
  )

  return (
    <>
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              Active Client Verification
            </div>
            <Badge variant="outline" className="font-mono">
              {tasks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {selectedAgentId
                ? 'No tasks for selected agent'
                : 'No verification tasks pending'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border/30">
                    <th className="pb-3 font-medium">Client</th>
                    <th className="pb-3 font-medium">Platform</th>
                    <th className="pb-3 font-medium">Task</th>
                    <th className="pb-3 font-medium">Agent</th>
                    <th className="pb-3 font-medium">Deadline</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium sr-only">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr
                      key={task.id}
                      className="border-b border-border/20 last:border-0"
                    >
                      <td className="py-3">
                        {task.clientId ? (
                          <Link
                            href={`/backoffice/clients/${task.clientId}`}
                            className="font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {task.clientName}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">
                            {task.clientName}
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <PlatformBadge platformType={task.platformType} />
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {task.task}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {task.agentName}
                      </td>
                      <td className="py-3">
                        {task.clientDeadline ? (
                          <DeadlineCountdown
                            deadline={task.clientDeadline}
                            variant="inline"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {task.deadlineLabel}
                          </div>
                        )}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            task.status === 'Done'
                              ? 'bg-chart-4/20 text-chart-4 border-chart-4/30'
                              : 'bg-accent/20 text-accent border-accent/30',
                          )}
                        >
                          {task.status}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedTask(task)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Review documents</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTask && selectedTask.clientId && selectedTask.platformType && (
        <DocumentReviewModal
          open={!!selectedTask}
          onOpenChange={(open) => {
            if (!open) setSelectedTask(null)
          }}
          clientId={selectedTask.clientId}
          clientName={selectedTask.clientName}
          platformType={selectedTask.platformType}
          platformLabel={selectedTask.platformLabel}
          task={selectedTask.task}
          screenshots={selectedTask.screenshots}
        />
      )}
    </>
  )
}

function PlatformBadge({
  platformType,
}: {
  platformType: PlatformType | null
}) {
  if (!platformType) {
    return (
      <Badge variant="outline" className="text-xs">
        N/A
      </Badge>
    )
  }

  const config = getPlatformBadgeConfig(platformType)

  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-medium', config.className)}
    >
      {config.label}
    </Badge>
  )
}

function getPlatformBadgeConfig(platformType: PlatformType): {
  label: string
  className: string
} {
  const configs: Record<PlatformType, { label: string; className: string }> = {
    [PlatformType.DRAFTKINGS]: {
      label: 'DraftKings',
      className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
    [PlatformType.FANDUEL]: {
      label: 'FanDuel',
      className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    },
    [PlatformType.BETMGM]: {
      label: 'BetMGM',
      className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    },
    [PlatformType.CAESARS]: {
      label: 'Caesars',
      className: 'bg-red-500/20 text-red-400 border-red-500/30',
    },
    [PlatformType.FANATICS]: {
      label: 'Fanatics',
      className: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    },
    [PlatformType.BALLYBET]: {
      label: 'Bally Bet',
      className: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    },
    [PlatformType.BETRIVERS]: {
      label: 'BetRivers',
      className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    },
    [PlatformType.BET365]: {
      label: 'Bet365',
      className: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
    },
    [PlatformType.BANK]: {
      label: 'Bank',
      className: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    },
    [PlatformType.PAYPAL]: {
      label: 'PayPal',
      className: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    },
    [PlatformType.EDGEBOOST]: {
      label: 'Edgeboost',
      className: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    },
  }

  return configs[platformType] || { label: platformType, className: '' }
}
