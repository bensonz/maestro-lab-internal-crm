'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Eye,
  EyeOff,
  AlertTriangle,
  Shield,
  Info,
  MapPin,
  Building2,
  Timer,
  Clock,
  Edit3,
  Upload,
} from 'lucide-react'
import { IntakeStatus } from '@/types'
import { DeadlineCountdown } from '@/components/deadline-countdown'
import { ExtensionRequestDialog } from './extension-request-dialog'
import { cn } from '@/lib/utils'

interface ClientProfileProps {
  client: {
    id: string
    firstName: string
    lastName: string
    middleName: string | null
    dateOfBirth: string | null
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
    zipCode: string | null
    secondaryAddress: {
      address?: string
      city?: string
      state?: string
      zip?: string
    } | null
    status: string
    statusColor: string
    intakeStatus: IntakeStatus
    deadline: Date | null
    deadlineExtensions: number
    questionnaire: Record<string, unknown>
    phoneAssignment: {
      phoneNumber: string
      deviceId: string | null
    } | null
    pendingExtensionRequest: {
      id: string
      status: string
      reason: string
      requestedDays: number
      createdAt: Date
    } | null
    extensionRequestCount: number
  }
  bankPin: string
  bankLogin: { username: string; password: string }
  pinEditCount: number
  credentialEditCount: number
  onEditPin: () => void
  onEditCredentials: () => void
  onUploadSSN: () => void
  onUploadZelle: () => void
}

function calculateAge(dob: string): number | null {
  if (!dob) return null
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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })
}

const MAX_EXTENSIONS = 3

export function ClientProfile({
  client,
  bankPin,
  bankLogin,
  pinEditCount,
  credentialEditCount,
  onEditPin,
  onEditCredentials,
  onUploadSSN,
  onUploadZelle,
}: ClientProfileProps) {
  const [showCredentials, setShowCredentials] = useState(false)
  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false)

  const fullName = [client.firstName, client.middleName, client.lastName]
    .filter(Boolean)
    .join(' ')

  const age = client.dateOfBirth ? calculateAge(client.dateOfBirth) : null

  // Flags from questionnaire
  const compliance = client.questionnaire?.compliance as
    | Record<string, unknown>
    | undefined
  const clientSource = client.questionnaire?.clientSource as
    | Record<string, unknown>
    | undefined
  const flags: { type: 'warning' | 'compliance' | 'info'; label: string }[] = []
  if (compliance?.hasCriminalRecord === 'yes') {
    flags.push({ type: 'compliance', label: 'Criminal Record' })
  }
  if (clientSource?.previouslyFlagged === 'yes') {
    flags.push({ type: 'warning', label: 'Previously Flagged' })
  }
  if (compliance?.idType) {
    flags.push({ type: 'info', label: `ID: ${compliance.idType}` })
  }

  return (
    <div className="space-y-2">
      {/* Alert Flags */}
      {flags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {flags.map((flag, idx) => (
            <Badge
              key={idx}
              variant="outline"
              className={cn(
                'gap-1 text-[10px]',
                flag.type === 'warning' &&
                  'bg-warning/10 text-warning border-warning/30',
                flag.type === 'compliance' &&
                  'bg-destructive/10 text-destructive border-destructive/30',
                flag.type === 'info' &&
                  'bg-primary/10 text-primary border-primary/30',
              )}
            >
              {flag.type === 'warning' && <AlertTriangle className="h-3 w-3" />}
              {flag.type === 'compliance' && <Shield className="h-3 w-3" />}
              {flag.type === 'info' && <Info className="h-3 w-3" />}
              {flag.label}
            </Badge>
          ))}
        </div>
      )}

      {/* Execution Delayed Banner */}
      {client.intakeStatus === IntakeStatus.EXECUTION_DELAYED && (
        <div
          data-testid="execution-delayed-banner"
          className="flex items-center gap-3 rounded-lg bg-yellow-500/10 p-3 ring-1 ring-yellow-500/30"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-500" />
          <div>
            <p className="text-sm font-medium text-yellow-500">
              Execution Delayed
            </p>
            <p className="text-xs text-yellow-500/80">
              Deadline has passed. Awaiting backoffice action.
            </p>
          </div>
        </div>
      )}

      {/* Compact Profile Card — 3-column grid */}
      <Card className="card-terminal">
        <CardContent className="p-3">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Identity Column */}
            <div className="space-y-1">
              <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Identity
              </h4>

              {/* Full Name */}
              <p className="text-sm font-medium">{fullName}</p>

              {/* DOB, Age */}
              <div className="text-sm text-muted-foreground">
                <span className="font-mono">
                  {client.dateOfBirth ? formatDate(client.dateOfBirth) : 'N/A'}
                </span>
                {age !== null && <> · {age} yrs</>}
              </div>

              {/* SSN Upload */}
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">SSN:</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-5 gap-1 px-1.5 text-[10px]"
                  onClick={onUploadSSN}
                  data-testid="upload-ssn-btn"
                >
                  <Upload className="h-3 w-3" />
                  Upload
                </Button>
              </div>

              {/* Deadline */}
              {client.deadline && (
                <div className="mt-2 space-y-1.5 rounded-lg bg-muted/30 p-2 ring-1 ring-border/30">
                  <label className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <Timer className="h-3 w-3" />
                    Deadline
                  </label>
                  <DeadlineCountdown
                    deadline={client.deadline}
                    variant="card"
                    isDelayed={
                      client.intakeStatus === IntakeStatus.EXECUTION_DELAYED
                    }
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                      {client.deadlineExtensions} extension
                      {client.deadlineExtensions !== 1 ? 's' : ''} used
                    </p>
                    {client.intakeStatus === IntakeStatus.IN_EXECUTION && (
                      <>
                        {client.pendingExtensionRequest ? (
                          <Badge
                            variant="outline"
                            className="border-yellow-500/50 bg-yellow-500/10 text-[10px] text-yellow-500"
                          >
                            <Clock className="mr-0.5 h-3 w-3" />
                            Pending
                          </Badge>
                        ) : client.deadlineExtensions >= MAX_EXTENSIONS ? (
                          <Badge
                            variant="outline"
                            className="border-muted-foreground/30 bg-muted/30 text-[10px] text-muted-foreground"
                          >
                            Max Used
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-5 px-1.5 text-[10px]"
                            onClick={() => setExtensionDialogOpen(true)}
                          >
                            <Clock className="mr-0.5 h-3 w-3" />
                            Extend
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  {client.intakeStatus === IntakeStatus.IN_EXECUTION && (
                    <ExtensionRequestDialog
                      clientId={client.id}
                      currentDeadline={client.deadline}
                      extensionsUsed={client.deadlineExtensions}
                      open={extensionDialogOpen}
                      onOpenChange={setExtensionDialogOpen}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Contact Column */}
            <div className="space-y-1">
              <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Contact Information
              </h4>

              {/* Company-Issued Phone */}
              {client.phoneAssignment && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Company Phone:</span>{' '}
                  <span className="font-mono text-primary">
                    {client.phoneAssignment.phoneNumber}
                  </span>
                </div>
              )}

              {/* Personal Phone */}
              {client.phone && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Personal Phone:</span>{' '}
                  <span className="font-mono">{client.phone}</span>
                </div>
              )}

              {/* Personal Email */}
              {client.email && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Personal Email:</span>{' '}
                  <span className="font-mono text-xs">{client.email}</span>
                </div>
              )}

              {/* Zelle Upload */}
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Zelle:</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-5 gap-1 px-1.5 text-[10px]"
                  onClick={onUploadZelle}
                  data-testid="upload-zelle-btn"
                >
                  <Upload className="h-3 w-3" />
                  Upload
                </Button>
              </div>

              {/* Bank Credentials */}
              <div className="mt-2 space-y-2 rounded-lg bg-muted/30 p-2 ring-1 ring-border/30">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    Bank Credentials
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[10px]"
                    onClick={() => setShowCredentials(!showCredentials)}
                  >
                    {showCredentials ? (
                      <EyeOff className="mr-0.5 h-3 w-3" />
                    ) : (
                      <Eye className="mr-0.5 h-3 w-3" />
                    )}
                    {showCredentials ? 'Hide' : 'Show'}
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <div className="flex items-center gap-1">
                      <label className="text-[10px] text-muted-foreground">
                        PIN
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 px-1 text-[9px] text-muted-foreground"
                        onClick={onEditPin}
                        data-testid="edit-pin-btn"
                      >
                        <Edit3 className="h-2.5 w-2.5" />
                      </Button>
                      {pinEditCount > 0 && (
                        <Badge
                          variant="outline"
                          className="h-3.5 border-warning/30 px-1 text-[8px] text-warning"
                        >
                          {pinEditCount}x
                        </Badge>
                      )}
                    </div>
                    <p className="font-mono text-sm">
                      {showCredentials ? bankPin : '••••'}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <label className="text-[10px] text-muted-foreground">
                        Online Banking
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 px-1 text-[9px] text-muted-foreground"
                        onClick={onEditCredentials}
                        data-testid="edit-credentials-btn"
                      >
                        <Edit3 className="h-2.5 w-2.5" />
                      </Button>
                      {credentialEditCount > 0 && (
                        <Badge
                          variant="outline"
                          className="h-3.5 border-warning/30 px-1 text-[8px] text-warning"
                        >
                          {credentialEditCount}x
                        </Badge>
                      )}
                    </div>
                    <p className="font-mono text-sm">
                      {showCredentials
                        ? `${bankLogin.username} / ${bankLogin.password}`
                        : '•••••••• / ••••••••'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Addresses Column */}
            <div className="space-y-1">
              <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Addresses
              </h4>

              {/* Primary Address */}
              <div className="text-sm">
                <span className="text-muted-foreground">
                  <MapPin className="mr-0.5 inline h-3 w-3" /> Primary:
                </span>{' '}
                {client.address ? (
                  <span>
                    {client.address},{' '}
                    {[client.city, client.state, client.zipCode]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                ) : (
                  <span className="italic text-muted-foreground/50">
                    — not set
                  </span>
                )}
              </div>

              {/* Secondary Address */}
              {client.secondaryAddress?.address && (
                <div className="text-sm">
                  <span className="text-muted-foreground">
                    <MapPin className="mr-0.5 inline h-3 w-3" /> Secondary:
                  </span>{' '}
                  <span>
                    {client.secondaryAddress.address},{' '}
                    {[
                      client.secondaryAddress.city,
                      client.secondaryAddress.state,
                      client.secondaryAddress.zip,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}

              {/* Agent info */}
              <div className="mt-2 border-t border-border/50 pt-1.5">
                <div className="text-[11px] text-muted-foreground">
                  <Building2 className="mr-0.5 inline h-3 w-3" />
                  Company-Issued Email:{' '}
                  <span className="font-mono text-primary">
                    sarah.j.0101@company-ops.com
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
