'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Star,
  Phone,
  MapPin,
  User,
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
import { EditableField } from './editable-field'
import type { AgentDetailData } from '@/backend/data/backoffice'

interface AgentDetailViewProps {
  agent: AgentDetailData
}

export function AgentDetailView({ agent }: AgentDetailViewProps) {
  const router = useRouter()
  const [showIdModal, setShowIdModal] = useState(false)
  const [agentData, setAgentData] = useState(agent)

  const updateField = (field: keyof typeof agentData, value: string) => {
    setAgentData((prev) => ({ ...prev, [field]: value }))
  }

  const renderStars = (count: number) => {
    return Array(count)
      .fill(0)
      .map((_, i) => (
        <Star key={i} className="h-3 w-3 fill-warning text-warning" />
      ))
  }

  const handleNavigateToAgent = (agentId: string) => {
    router.push(`/backoffice/agent-management/${agentId}`)
  }

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/backoffice/agent-management')}
          className="gap-2"
          data-testid="agent-detail-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
            <span className="text-sm font-medium text-primary">
              {agentData.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-semibold" data-testid="agent-detail-name">
              {agentData.name}
            </h1>
            <div className="mt-0.5 flex items-center gap-2">
              {agentData.stars ? (
                <div className="flex items-center">
                  {renderStars(agentData.stars)}
                </div>
              ) : (
                <Badge className="bg-warning/20 text-[10px] text-warning">
                  {agentData.tier}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="space-y-4 pr-4">
          {/* Top Section: Identity, Contact, Address */}
          <div className="grid grid-cols-3 gap-4">
            {/* Identity */}
            <Card className="card-terminal" data-testid="agent-identity-card">
              <CardHeader className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
                    <User className="h-3 w-3" /> Identity
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 gap-1 text-xs"
                    onClick={() => setShowIdModal(true)}
                    data-testid="view-id-btn"
                  >
                    <Eye className="h-3 w-3" />
                    View ID
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 p-3 pt-0 text-sm">
                <EditableField
                  label="Name"
                  value={agentData.name}
                  onSave={(v) => updateField('name', v)}
                />
                <EditableField
                  label="Gender"
                  value={agentData.gender}
                  onSave={(v) => updateField('gender', v)}
                />
                <EditableField
                  label="Age"
                  value={String(agentData.age)}
                  onSave={(v) => updateField('age', v)}
                />
                <EditableField
                  label="ID"
                  value={agentData.idNumber}
                  onSave={(v) => updateField('idNumber', v)}
                  className="font-mono text-xs"
                />
                <EditableField
                  label="ID Expiry"
                  value={agentData.idExpiry}
                  onSave={(v) => updateField('idExpiry', v)}
                />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SSN:</span>
                  <span className="font-mono text-xs">{agentData.ssn}</span>
                </div>
                <EditableField
                  label="Citizenship"
                  value={agentData.citizenship}
                  onSave={(v) => updateField('citizenship', v)}
                />
                <EditableField
                  label="Start Date"
                  value={agentData.startDate}
                  onSave={(v) => updateField('startDate', v)}
                />
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card className="card-terminal" data-testid="agent-contact-card">
              <CardHeader className="px-3 py-2">
                <CardTitle className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
                  <Phone className="h-3 w-3" /> Contact Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 p-3 pt-0 text-sm">
                <EditableField
                  label="Company Phone"
                  value={agentData.companyPhone}
                  onSave={(v) => updateField('companyPhone', v)}
                  className="font-mono text-xs"
                />
                <EditableField
                  label="Carrier"
                  value={agentData.carrier}
                  onSave={(v) => updateField('carrier', v)}
                />
                <EditableField
                  label="Company Email"
                  value={agentData.companyEmail}
                  onSave={(v) => updateField('companyEmail', v)}
                  className="max-w-full truncate text-xs"
                />
                <EditableField
                  label="Personal Email"
                  value={agentData.personalEmail}
                  onSave={(v) => updateField('personalEmail', v)}
                  className="max-w-full truncate text-xs"
                />
                <EditableField
                  label="Personal Phone"
                  value={agentData.personalPhone}
                  onSave={(v) => updateField('personalPhone', v)}
                  className="font-mono text-xs"
                />
                <EditableField
                  label="Zelle"
                  value={agentData.zelle}
                  onSave={(v) => updateField('zelle', v)}
                  className="font-mono text-xs"
                />
              </CardContent>
            </Card>

            {/* Address & Login */}
            <Card className="card-terminal" data-testid="agent-address-card">
              <CardHeader className="px-3 py-2">
                <CardTitle className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
                  <MapPin className="h-3 w-3" /> Address & Login
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 p-3 pt-0 text-sm">
                <div>
                  <span className="text-muted-foreground">Address:</span>
                </div>
                <div
                  className="-mx-1 cursor-pointer rounded px-1 transition-colors hover:bg-muted/30"
                  onDoubleClick={() => {
                    const newAddr = prompt('Edit Address:', agentData.address)
                    if (newAddr !== null) updateField('address', newAddr)
                  }}
                  title="Double-click to edit"
                >
                  <p className="text-xs">{agentData.address}</p>
                </div>
                <Separator className="my-2" />
                <EditableField
                  label="Account"
                  value={agentData.loginAccount}
                  onSave={(v) => updateField('loginAccount', v)}
                  className="font-mono text-xs"
                />
                <EditableField
                  label="Login Email"
                  value={agentData.loginEmail}
                  onSave={(v) => updateField('loginEmail', v)}
                  className="max-w-full truncate text-xs"
                />
              </CardContent>
            </Card>
          </div>

          {/* Performance Summary: 4-card grid */}
          <div className="grid grid-cols-4 gap-3">
            <Card className="card-terminal" data-testid="stat-total-clients">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-mono font-semibold">
                  {agentData.totalClients}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Total Clients
                </p>
              </CardContent>
            </Card>
            <Card className="card-terminal" data-testid="stat-total-earned">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-mono font-semibold text-success">
                  ${(agentData.totalEarned / 1000).toFixed(1)}K
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Total Earned
                </p>
              </CardContent>
            </Card>
            <Card className="card-terminal" data-testid="stat-this-month">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-mono font-semibold">
                  ${agentData.thisMonthEarned.toLocaleString()}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  This Month
                </p>
              </CardContent>
            </Card>
            <Card className="card-terminal" data-testid="stat-new-clients">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-mono font-semibold">
                  {agentData.newClientsThisMonth}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-success">
                  +{agentData.newClientsGrowth}%
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
                      {agentData.tier}{' '}
                      {agentData.stars && `(${agentData.stars}★)`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Avg Days to Initiate:
                    </span>
                    <span className="font-mono">
                      {agentData.avgDaysToInitiate}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Avg Days to Convert:
                    </span>
                    <span className="font-mono">
                      {agentData.avgDaysToConvert}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Success Rate:</span>
                    <span
                      className={cn(
                        'font-mono',
                        agentData.successRate >= 80
                          ? 'text-success'
                          : 'text-warning',
                      )}
                    >
                      {agentData.successRate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Referral Rate:
                    </span>
                    <span className="font-mono">
                      {agentData.referralRate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Extension Rate:
                    </span>
                    <span className="font-mono">
                      {agentData.extensionRate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Resubmission Rate:
                    </span>
                    <span className="font-mono">
                      {agentData.resubmissionRate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Avg Accounts/Client:
                    </span>
                    <span className="font-mono">
                      {agentData.avgAccountsPerClient}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">In Progress:</span>
                    <span className="font-mono">
                      {agentData.clientsInProgress}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Avg Daily Todos:
                    </span>
                    <span className="font-mono">
                      {agentData.avgDailyTodos}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delay Rate:</span>
                    <span
                      className={cn(
                        'font-mono',
                        agentData.delayRate > 15
                          ? 'text-destructive'
                          : 'text-foreground',
                      )}
                    >
                      {agentData.delayRate}%
                    </span>
                  </div>
                </div>

                <Separator className="my-3" />

                <div>
                  <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                    Monthly Client Breakdown
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {agentData.monthlyClients.map((m) => (
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
                {agentData.supervisor ? (
                  <div>
                    <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      Supervisor
                    </p>
                    <button
                      onClick={() =>
                        handleNavigateToAgent(agentData.supervisor!.id)
                      }
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-warning/20">
                        <span className="text-[10px] font-medium text-warning">
                          {agentData.supervisor.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </span>
                      </div>
                      {agentData.supervisor.name}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No supervisor (Top level)
                  </p>
                )}

                {agentData.directReports &&
                  agentData.directReports.length > 0 && (
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        Direct Reports ({agentData.directReports.length})
                      </p>
                      <div className="space-y-1">
                        {agentData.directReports.slice(0, 5).map((report) => (
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
                        {agentData.directReports.length > 5 && (
                          <p className="text-xs text-muted-foreground">
                            +{agentData.directReports.length - 5} more
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
              {agentData.timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No activity recorded yet
                </p>
              ) : (
                <div className="space-y-2">
                  {agentData.timeline.map((event, idx) => (
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
                          {event.date}
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
            <DialogTitle>ID Document - {agentData.name}</DialogTitle>
          </DialogHeader>
          <div className="flex min-h-[300px] items-center justify-center rounded-lg bg-muted/30 p-4">
            {agentData.idDocumentUrl ? (
              <img
                src={agentData.idDocumentUrl}
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
