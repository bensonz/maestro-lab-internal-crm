'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Star,
  TrendingUp,
  Users,
  Clock,
  Eye,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { updateAgentField } from '@/app/actions/user-management'
import { EditableField } from './editable-field'
import type { AgentDetailData } from '@/types/backend-types'

interface AgentDetailViewProps {
  agent: AgentDetailData
  prevAgentId?: string | null
  nextAgentId?: string | null
  viewMode?: 'table' | 'tree'
}

export function AgentDetailView({ agent, prevAgentId, nextAgentId, viewMode = 'table' }: AgentDetailViewProps) {
  const router = useRouter()
  const [showIdModal, setShowIdModal] = useState(false)

  const renderStars = (count: number) => {
    return Array(count)
      .fill(0)
      .map((_, i) => (
        <Star key={i} className="h-3 w-3 fill-warning text-warning" />
      ))
  }

  const viewParam = viewMode !== 'table' ? `?view=${viewMode}` : ''

  const handleNavigateToAgent = (agentId: string) => {
    router.push(`/backoffice/agent-management/${agentId}${viewParam}`)
  }

  const handleFieldSave = async (fieldKey: string, oldValue: string, newValue: string) => {
    const result = await updateAgentField(agent.id, fieldKey, oldValue, newValue)
    if (result.success) {
      toast.success('Field updated')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Update failed')
      throw new Error(result.error ?? 'Update failed')
    }
  }

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* Header with Back Button + Nav Arrows */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/backoffice/agent-management${viewParam ? `${viewParam}` : ''}`)}
            className="gap-2"
            data-testid="agent-detail-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
              <span className="text-sm font-medium text-primary">
                {agent.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </span>
            </div>
            <div>
              <h1
                className="text-xl font-semibold"
                data-testid="agent-detail-name"
              >
                {agent.name}
              </h1>
              <div className="mt-0.5 flex items-center gap-2">
                {agent.stars ? (
                  <div className="flex items-center">
                    {renderStars(agent.stars)}
                  </div>
                ) : (
                  <Badge className="bg-warning/20 text-[10px] text-warning">
                    {agent.tier}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1" data-testid="agent-nav-arrows">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={!prevAgentId}
            onClick={() => prevAgentId && handleNavigateToAgent(prevAgentId)}
            data-testid="agent-nav-prev"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={!nextAgentId}
            onClick={() => nextAgentId && handleNavigateToAgent(nextAgentId)}
            data-testid="agent-nav-next"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="space-y-4 pr-4">
          {/* Profile Section — single card, 3-column grid (matches Client Lifecycle Panel) */}
          <Card className="card-terminal" data-testid="agent-profile-card">
            <CardContent className="p-3">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Identity */}
                <div className="space-y-1">
                  <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Identity
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{agent.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 text-[10px]"
                      onClick={() => setShowIdModal(true)}
                      data-testid="view-id-btn"
                    >
                      <Eye className="mr-0.5 h-3 w-3" />
                      View ID
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {agent.gender} &middot; {agent.age} yrs
                  </div>
                  <EditableField label="ID" value={agent.idNumber} fieldKey="idNumber" onSave={handleFieldSave} mono />
                  <div className="text-sm">
                    <span className="text-muted-foreground">ID Exp:</span>{' '}
                    <span className="font-mono">{agent.idExpiry || '\u2014'}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">SSN:</span>{' '}
                    <span className="font-mono">{agent.ssn || '\u2014'}</span>
                  </div>
                  <EditableField label="Citizenship" value={agent.citizenship} fieldKey="citizenship" onSave={handleFieldSave} />
                  <div className="text-sm">
                    <span className="text-muted-foreground">Start Date:</span>{' '}
                    <span className="font-mono">{agent.startDate}</span>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-1">
                  <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Contact Information
                  </h4>
                  <EditableField label="Company Phone" value={agent.companyPhone} fieldKey="companyPhone" onSave={handleFieldSave} mono />
                  <EditableField label="Carrier" value={agent.carrier} fieldKey="carrier" onSave={handleFieldSave} />
                  <div className="text-sm">
                    <span className="text-muted-foreground">Company Email:</span>{' '}
                    <span className="font-mono">{agent.companyEmail || '\u2014'}</span>
                  </div>
                  <EditableField label="Personal Email" value={agent.personalEmail} fieldKey="personalEmail" onSave={handleFieldSave} mono />
                  <EditableField label="Personal Phone" value={agent.personalPhone} fieldKey="personalPhone" onSave={handleFieldSave} mono />
                  <EditableField label="Zelle" value={agent.zelle} fieldKey="zelle" onSave={handleFieldSave} mono />
                </div>

                {/* Address & Login */}
                <div className="space-y-1">
                  <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Address & Login
                  </h4>
                  <EditableField label="Address" value={agent.address} fieldKey="address" onSave={handleFieldSave} />
                  <div className="mt-1.5 space-y-1 border-t border-border/50 pt-1">
                    <EditableField label="Account" value={agent.loginAccount} fieldKey="loginAccount" onSave={handleFieldSave} mono />
                    <div className="text-sm">
                      <span className="text-muted-foreground">Login Email:</span>{' '}
                      <span className="font-mono">{agent.loginEmail || '\u2014'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Summary: 4-card grid */}
          <div className="grid grid-cols-4 gap-3">
            <Card className="card-terminal" data-testid="stat-total-clients">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-mono font-semibold">
                  {agent.totalClients}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Total Clients
                </p>
              </CardContent>
            </Card>
            <Card className="card-terminal" data-testid="stat-total-earned">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-mono font-semibold text-success">
                  ${(agent.totalEarned / 1000).toFixed(1)}K
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Total Earned
                </p>
              </CardContent>
            </Card>
            <Card className="card-terminal" data-testid="stat-this-month">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-mono font-semibold">
                  ${agent.thisMonthEarned.toLocaleString()}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  This Month
                </p>
              </CardContent>
            </Card>
            <Card className="card-terminal" data-testid="stat-new-clients">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-mono font-semibold">
                  {agent.newClientsThisMonth}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-success">
                  +{agent.newClientsGrowth}%
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  New Clients
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Performance & Team Relations */}
          <div className="grid grid-cols-3 gap-4">
            {/* Performance Details */}
            <Card
              className="card-terminal col-span-2"
              data-testid="performance-metrics-card"
            >
              <CardHeader className="px-3 py-2">
                <CardTitle className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
                  <TrendingUp className="h-3 w-3" /> Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Title Level:</span>
                    <span>
                      {agent.tier}{' '}
                      {agent.stars && `(${agent.stars}★)`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Avg Days to Initiate:
                    </span>
                    <span className="font-mono">
                      {agent.avgDaysToInitiate}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Avg Days to Convert:
                    </span>
                    <span className="font-mono">
                      {agent.avgDaysToConvert}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Success Rate:</span>
                    <span
                      className={cn(
                        'font-mono',
                        agent.successRate >= 80
                          ? 'text-success'
                          : 'text-warning',
                      )}
                    >
                      {agent.successRate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Referral Rate:
                    </span>
                    <span className="font-mono">
                      {agent.referralRate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Extension Rate:
                    </span>
                    <span className="font-mono">
                      {agent.extensionRate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Resubmission Rate:
                    </span>
                    <span className="font-mono">
                      {agent.resubmissionRate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Avg Accounts/Client:
                    </span>
                    <span className="font-mono">
                      {agent.avgAccountsPerClient}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">In Progress:</span>
                    <span className="font-mono">
                      {agent.clientsInProgress}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Avg Daily Todos:
                    </span>
                    <span className="font-mono">
                      {agent.avgDailyTodos}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delay Rate:</span>
                    <span
                      className={cn(
                        'font-mono',
                        agent.delayRate > 15
                          ? 'text-destructive'
                          : 'text-foreground',
                      )}
                    >
                      {agent.delayRate}%
                    </span>
                  </div>
                </div>

                <Separator className="my-3" />

                <div>
                  <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                    Monthly Client Breakdown
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {agent.monthlyClients.map((m) => (
                      <div
                        key={m.month}
                        className="rounded bg-muted/30 px-2 py-1 text-xs"
                      >
                        <span className="text-muted-foreground">
                          {m.month}:
                        </span>{' '}
                        <span className="font-mono font-medium">{m.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team Relations */}
            <Card className="card-terminal" data-testid="team-relations-card">
              <CardHeader className="px-3 py-2">
                <CardTitle className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
                  <Users className="h-3 w-3" /> Team Relations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-3 pt-0">
                {agent.supervisor ? (
                  <div>
                    <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      Supervisor
                    </p>
                    <button
                      onClick={() =>
                        handleNavigateToAgent(agent.supervisor!.id)
                      }
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-warning/20">
                        <span className="text-[10px] font-medium text-warning">
                          {agent.supervisor.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </span>
                      </div>
                      {agent.supervisor.name}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No supervisor (Top level)
                  </p>
                )}

                {agent.directReports &&
                  agent.directReports.length > 0 && (
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        Direct Reports ({agent.directReports.length})
                      </p>
                      <div className="space-y-1">
                        {agent.directReports.slice(0, 5).map((report) => (
                          <button
                            key={report.id}
                            onClick={() => handleNavigateToAgent(report.id)}
                            className="flex items-center gap-2 text-sm text-primary hover:underline"
                          >
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20">
                              <span className="text-[8px] font-medium text-primary">
                                {report.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')}
                              </span>
                            </div>
                            {report.name}
                          </button>
                        ))}
                        {agent.directReports.length > 5 && (
                          <p className="text-xs text-muted-foreground">
                            +{agent.directReports.length - 5} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>

          {/* Activity Timeline */}
          <Card className="card-terminal" data-testid="activity-timeline-card">
            <CardHeader className="px-3 py-2">
              <CardTitle className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
                <Clock className="h-3 w-3" /> Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              {agent.timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No activity recorded yet
                </p>
              ) : (
                <div className="space-y-2">
                  {agent.timeline.map((event, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-sm">
                      <div
                        className={cn(
                          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                          event.type === 'success' && 'bg-success',
                          event.type === 'warning' && 'bg-warning',
                          event.type === 'info' && 'bg-primary',
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground">{event.event}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {event.date}{event.actor ? ` \u00b7 by ${event.actor}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* View ID Modal */}
      <Dialog open={showIdModal} onOpenChange={setShowIdModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>ID Document - {agent.name}</DialogTitle>
          </DialogHeader>
          <div className="flex min-h-[300px] items-center justify-center rounded-lg bg-muted/30 p-4">
            {agent.idDocumentUrl ? (
              <img
                src={agent.idDocumentUrl}
                alt="ID Document"
                className="max-h-[400px] max-w-full object-contain"
              />
            ) : (
              <p className="text-muted-foreground">No ID document uploaded</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
