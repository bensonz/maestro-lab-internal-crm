'use client'

import { useState, useCallback } from 'react'
import {
  ArrowLeft,
  Images,
  AlertCircle,
  AlertTriangle,
  Lock,
  MapPin,
  UserPlus,
  Eye,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { EditableField } from './editable-field'
import { PlatformSection } from './platform-section'
import { ApplicationReviewCard } from './application-review-card'
import { ClientModals } from './client-modals'
import { CloseClientDialog } from './close-client-dialog'
import type { Client, ClientStatus, TimelineEvent } from './types'

// ============================================================================
// Helpers
// ============================================================================

function getStatusColor(status: ClientStatus): string {
  switch (status) {
    case 'active':
      return 'bg-success/20 text-success'
    case 'closed':
      return 'bg-muted text-muted-foreground'
    case 'further_verification':
      return 'bg-warning/20 text-warning'
  }
}

function calculateAge(dob: string): number {
  const birthDate = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--
  }
  return age
}

function isIdExpiringSoon(expiryDate?: string): boolean {
  if (!expiryDate) return false
  const expiry = new Date(expiryDate)
  const today = new Date()
  const monthsUntilExpiry =
    (expiry.getFullYear() - today.getFullYear()) * 12 +
    (expiry.getMonth() - today.getMonth())
  return monthsUntilExpiry <= 3
}

function getTimelineIcon(
  type: TimelineEvent['type'],
): string {
  switch (type) {
    case 'application':
      return 'bg-primary'
    case 'verification':
      return 'bg-success'
    case 'status':
      return 'bg-warning'
    case 'deposit':
      return 'bg-success'
    case 'withdrawal':
      return 'bg-destructive'
    case 'todo':
      return 'bg-primary'
    case 'update':
      return 'bg-muted-foreground'
  }
}

// ============================================================================
// Component
// ============================================================================

interface ClientDetailProps {
  client: Client
  allClients: Client[]
  onBack: () => void
  onNavigateToClient: (clientId: string) => void
  isAdmin?: boolean
}

export function ClientDetail({
  client,
  allClients,
  onBack,
  onNavigateToClient,
  isAdmin = false,
}: ClientDetailProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [expandedPlatforms, setExpandedPlatforms] = useState<string[]>([])
  const [showIdModal, setShowIdModal] = useState(false)
  const [showSsnModal, setShowSsnModal] = useState(false)
  const [showDocumentModal, setShowDocumentModal] = useState<{
    url: string
    type: string
  } | null>(null)
  const [showAllScreenshotsModal, setShowAllScreenshotsModal] = useState(false)
  const [showCredentialsScreenshotModal, setShowCredentialsScreenshotModal] =
    useState(false)
  const [showAllTransactionsModal, setShowAllTransactionsModal] =
    useState(false)

  const age = calculateAge(client.profile.dob)
  const hasAlerts =
    client.alertFlags?.paypalPreviouslyUsed ||
    client.alertFlags?.idExpiring ||
    isIdExpiringSoon(client.profile.idExpiryDate) ||
    client.alertFlags?.pinIssue ||
    (client.alertFlags?.customAlerts?.length ?? 0) > 0

  const togglePlatformExpanded = useCallback((name: string) => {
    setExpandedPlatforms((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name],
    )
  }, [])

  const handleFieldEdit = useCallback(
    (_fieldKey: string, _oldValue: string, _newValue: string) => {
      // TODO: Wire to server action for persisting edits
      // Would also add a timeline event for the change
    },
    [],
  )

  return (
    <div
      className="animate-fade-in space-y-4 p-6"
      data-testid="client-detail"
    >
      {/* Back Button & Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          data-testid="client-detail-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">
            {client.profile.fullName}
          </h1>
          <p className="text-xs text-muted-foreground">
            Client Lifecycle Panel &mdash; Source of Truth
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setShowAllScreenshotsModal(true)}
            data-testid="view-all-screenshots"
          >
            <Images className="h-3.5 w-3.5" />
            View All Screenshots
          </Button>
          {client.intakeStatus === 'APPROVED' && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => setCloseDialogOpen(true)}
              data-testid="close-partnership-btn"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Close Partnership
            </Button>
          )}
          <Badge className={cn(getStatusColor(client.status))}>
            {client.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Alert Flags */}
      {hasAlerts && (
        <div className="flex flex-wrap gap-2" data-testid="alert-flags">
          {client.alertFlags?.paypalPreviouslyUsed && (
            <Badge
              variant="outline"
              className="gap-1 border-warning/30 bg-warning/10 text-[10px] text-warning"
            >
              <AlertCircle className="h-3 w-3" />
              PayPal Previously Used
            </Badge>
          )}
          {(client.alertFlags?.idExpiring ||
            isIdExpiringSoon(client.profile.idExpiryDate)) && (
            <Badge
              variant="outline"
              className="gap-1 border-destructive/30 bg-destructive/10 text-[10px] text-destructive"
            >
              <AlertCircle className="h-3 w-3" />
              ID Expiring Soon
            </Badge>
          )}
          {client.alertFlags?.pinIssue && (
            <Badge
              variant="outline"
              className="gap-1 border-destructive/30 bg-destructive/10 text-[10px] text-destructive"
            >
              <Lock className="h-3 w-3" />
              PIN Issue
            </Badge>
          )}
          {client.alertFlags?.customAlerts?.map((alert, idx) => (
            <Badge
              key={idx}
              variant="outline"
              className="gap-1 border-warning/30 bg-warning/10 text-[10px] text-warning"
            >
              <AlertTriangle className="h-3 w-3" />
              {alert}
            </Badge>
          ))}
        </div>
      )}

      {/* Profile Section - 3 columns */}
      <Card className="card-terminal">
        <CardContent className="p-3">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Identity */}
            <div className="space-y-1">
              <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Identity
              </h4>
              <div className="flex items-center gap-2">
                <EditableField
                  value={client.profile.fullName}
                  fieldKey="fullName"
                  className="text-sm font-medium"
                  onSave={handleFieldEdit}
                />
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
                <EditableField
                  value={client.profile.dob}
                  fieldKey="dob"
                  mono
                  onSave={handleFieldEdit}
                />{' '}
                &middot; {age} yrs &middot; {client.profile.gender}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">ID Exp:</span>{' '}
                <span
                  className={cn(
                    'font-mono',
                    isIdExpiringSoon(client.profile.idExpiryDate) &&
                      'text-destructive',
                  )}
                >
                  {client.profile.idExpiryDate}
                </span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground">SSN:</span>
                <EditableField
                  value={client.profile.ssn}
                  fieldKey="ssn"
                  mono
                  onSave={handleFieldEdit}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[10px]"
                  onClick={() => setShowSsnModal(true)}
                  data-testid="view-ssn-btn"
                >
                  <Eye className="h-3 w-3" />
                  View
                </Button>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Citizenship:</span>{' '}
                <EditableField
                  value={client.profile.citizenship}
                  fieldKey="citizenship"
                  onSave={handleFieldEdit}
                />
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Start Date:</span>{' '}
                <span className="font-mono">{client.startDate}</span>
              </div>
              {client.closeDate && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Close Date:</span>{' '}
                  <span className="font-mono">{client.closeDate}</span>
                </div>
              )}
              {/* Agent */}
              <div className="mt-1.5 space-y-1 border-t border-border/50 pt-1">
                <div className="text-sm">
                  <span className="text-muted-foreground">Agent:</span>{' '}
                  {client.agentId ? (
                    <button
                      className="text-primary underline transition-colors hover:text-primary/80"
                      onClick={() => {
                        // TODO: Navigate to agent detail page
                        window.location.href = `/backoffice/agent-management/${client.agentId}`
                      }}
                    >
                      {client.agent || '\u2014'}
                    </button>
                  ) : (
                    <EditableField
                      value={client.agent || '\u2014'}
                      fieldKey="agent"
                      onSave={handleFieldEdit}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-1">
              <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Contact Information
              </h4>
              <div className="text-sm">
                <span className="text-muted-foreground">Company Phone:</span>{' '}
                <EditableField
                  value={client.companyPhone}
                  fieldKey="companyPhone"
                  mono
                  onSave={handleFieldEdit}
                />
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Carrier:</span>{' '}
                <EditableField
                  value={client.carrier}
                  fieldKey="carrier"
                  onSave={handleFieldEdit}
                />
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Company Email:</span>{' '}
                <EditableField
                  value={client.companyEmail}
                  fieldKey="companyEmail"
                  mono
                  onSave={handleFieldEdit}
                />
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Personal Phone:</span>{' '}
                <EditableField
                  value={client.personalPhone}
                  fieldKey="personalPhone"
                  mono
                  onSave={handleFieldEdit}
                />
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Personal Email:</span>{' '}
                <EditableField
                  value={client.profile.personalEmail}
                  fieldKey="personalEmail"
                  mono
                  onSave={handleFieldEdit}
                />
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Zelle:</span>{' '}
                <EditableField
                  value={client.zelle || '\u2014'}
                  fieldKey="zelle"
                  mono
                  onSave={handleFieldEdit}
                />
              </div>
              {/* Relationships */}
              {client.relationships && client.relationships.length > 0 && (
                <div className="mt-1.5 flex items-start gap-1 border-t border-border/50 pt-1 text-sm">
                  <span className="shrink-0 text-muted-foreground">
                    <UserPlus className="inline h-3 w-3" /> Relations:
                  </span>
                  <span className="text-primary">
                    {client.relationships.map((r, i) => (
                      <span key={i}>
                        {r.clientId ? (
                          <button
                            className="underline transition-colors hover:text-primary/80"
                            onClick={() => onNavigateToClient(r.clientId!)}
                          >
                            {r.name}
                          </button>
                        ) : (
                          r.name
                        )}{' '}
                        ({r.type})
                        {i < client.relationships!.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </div>

            {/* Addresses */}
            <div className="space-y-1">
              <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Addresses
              </h4>
              <div className="text-sm">
                <span className="text-muted-foreground">
                  <MapPin className="inline h-3 w-3" /> Primary:
                </span>
                <EditableField
                  value={client.profile.primaryAddress}
                  fieldKey="primaryAddress"
                  onSave={handleFieldEdit}
                />
              </div>
              {client.profile.secondaryAddress && (
                <div className="text-sm">
                  <span className="text-muted-foreground">
                    <MapPin className="inline h-3 w-3" /> Secondary:
                  </span>
                  <EditableField
                    value={client.profile.secondaryAddress}
                    fieldKey="secondaryAddress"
                    onSave={handleFieldEdit}
                  />
                </div>
              )}
              {/* Platform-specific addresses */}
              {client.platformAddresses && (
                <div className="space-y-0.5 pt-1">
                  <div className="text-[11px] text-muted-foreground">
                    PayPal:{' '}
                    <EditableField
                      value={client.platformAddresses.paypal || '\u2014'}
                      fieldKey="paypalAddress"
                      className="text-muted-foreground"
                      onSave={handleFieldEdit}
                    />
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Bank:{' '}
                    <EditableField
                      value={client.platformAddresses.bank || '\u2014'}
                      fieldKey="bankAddress"
                      className="text-muted-foreground"
                      onSave={handleFieldEdit}
                    />
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    EdgeBoost:{' '}
                    <EditableField
                      value={client.platformAddresses.edgeboost || '\u2014'}
                      fieldKey="edgeboostAddress"
                      className="text-muted-foreground"
                      onSave={handleFieldEdit}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Application Review — only when questionnaire data exists */}
      {client.questionnaire && client.intakeStatus &&
        ['READY_FOR_APPROVAL', 'APPROVED', 'REJECTED', 'PARTNERSHIP_ENDED'].includes(client.intakeStatus) && (
        <ApplicationReviewCard
          clientId={client.id}
          intakeStatus={client.intakeStatus}
          questionnaire={client.questionnaire}
        />
      )}

      {/* Platform Section */}
      <PlatformSection
        client={client}
        selectedPlatform={selectedPlatform}
        onSelectPlatform={setSelectedPlatform}
        expandedPlatforms={expandedPlatforms}
        onTogglePlatformExpanded={togglePlatformExpanded}
        onViewCredentialsScreenshots={() =>
          setShowCredentialsScreenshotModal(true)
        }
        onViewAllTransactions={() => setShowAllTransactionsModal(true)}
        onViewDocument={(url, type) => setShowDocumentModal({ url, type })}
        onFieldEdit={handleFieldEdit}
      />

      {/* Activity Timeline */}
      <Card className="card-terminal">
        <CardHeader className="px-4 pb-2 pt-3">
          <CardTitle className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Activity Timeline
            <Badge variant="outline" className="ml-1 text-[9px]">
              Immutable
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[200px]">
            <div className="divide-y divide-border">
              {client.timeline.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-2 p-2.5 px-4"
                >
                  <div
                    className={cn(
                      'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                      getTimelineIcon(event.type),
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{event.event}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {event.date}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="h-5 shrink-0 capitalize text-[9px]"
                  >
                    {event.type}
                  </Badge>
                </div>
              ))}
              {client.timeline.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No events recorded
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Modals */}
      <ClientModals
        client={client}
        showIdModal={showIdModal}
        onShowIdModalChange={setShowIdModal}
        showSsnModal={showSsnModal}
        onShowSsnModalChange={setShowSsnModal}
        showDocumentModal={showDocumentModal}
        onShowDocumentModalChange={setShowDocumentModal}
        showAllScreenshotsModal={showAllScreenshotsModal}
        onShowAllScreenshotsModalChange={setShowAllScreenshotsModal}
        showCredentialsScreenshotModal={showCredentialsScreenshotModal}
        onShowCredentialsScreenshotModalChange={
          setShowCredentialsScreenshotModal
        }
        showAllTransactionsModal={showAllTransactionsModal}
        onShowAllTransactionsModalChange={setShowAllTransactionsModal}
        onViewDocument={(url, type) => setShowDocumentModal({ url, type })}
      />

      {/* Close Partnership Dialog */}
      <CloseClientDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        clientId={client.id}
        clientName={client.name}
        isAdmin={isAdmin}
      />
    </div>
  )
}
