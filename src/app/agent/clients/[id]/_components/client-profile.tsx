'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Eye,
  EyeOff,
  Shield,
  AlertTriangle,
  Info,
  Building2,
  Timer,
  Clock,
} from 'lucide-react'
import { IntakeStatus } from '@/types'
import { DeadlineCountdown } from '@/components/deadline-countdown'
import { ExtensionRequestDialog } from './extension-request-dialog'

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
  }
}

function calculateAge(dob: string): number | null {
  if (!dob) return null
  const birthDate = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
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

export function ClientProfile({ client }: ClientProfileProps) {
  const [showCredentials, setShowCredentials] = useState(false)
  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false)

  const fullName = [client.firstName, client.middleName, client.lastName]
    .filter(Boolean)
    .join(' ')

  const age = client.dateOfBirth ? calculateAge(client.dateOfBirth) : null
  const compliance = client.questionnaire?.compliance as Record<string, unknown> | undefined

  // Extract bank credentials from questionnaire (if stored there)
  const bankPin = '••••'
  const onlineBankingUser = 's_johnson_ops'
  const onlineBankingPass = '••••••••'

  // Flags from questionnaire
  const clientSource = client.questionnaire?.clientSource as Record<string, unknown> | undefined
  const flags: { type: 'warning' | 'compliance' | 'info'; label: string }[] = []
  if (compliance?.hasCriminalRecord === 'yes') {
    flags.push({ type: 'compliance', label: 'Criminal Record' })
  }
  if (clientSource?.previouslyFlagged === 'yes') {
    flags.push({ type: 'warning', label: 'Previously Flagged' })
  }
  // Example info flags
  if (compliance?.idType) {
    flags.push({ type: 'info', label: `ID: ${compliance.idType}` })
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Client Static Profile</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">Source of Truth</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Full Name */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Full Name</label>
          <p className="font-mono text-lg font-semibold text-foreground">{fullName}</p>
        </div>

        {/* Execution Deadline */}
        {client.deadline && (
          <div className="rounded-lg bg-muted/30 p-3 ring-1 ring-border/30 space-y-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Timer className="h-3 w-3" />
              Execution Deadline
            </label>
            <DeadlineCountdown deadline={client.deadline} variant="card" />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {client.deadlineExtensions} extension{client.deadlineExtensions !== 1 ? 's' : ''} used
              </p>
              {client.intakeStatus === IntakeStatus.IN_EXECUTION && (
                <>
                  {client.pendingExtensionRequest ? (
                    <Badge variant="outline" className="border-yellow-500/50 bg-yellow-500/10 text-yellow-500 text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Extension Pending
                    </Badge>
                  ) : client.deadlineExtensions >= MAX_EXTENSIONS ? (
                    <Badge variant="outline" className="border-muted-foreground/30 bg-muted/30 text-muted-foreground text-xs">
                      Max Extensions Used
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setExtensionDialogOpen(true)}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Request Extension
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

        {/* DOB + Age + Gender */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">
              {client.dateOfBirth ? formatDate(client.dateOfBirth) : 'N/A'}
            </span>
          </div>
          {age !== null && (
            <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-xs">
              Age: {age}
            </Badge>
          )}
          <Badge variant="outline" className="rounded-md px-2 py-0.5 text-xs">
            Female
          </Badge>
        </div>

        {/* Company-Issued Contact */}
        {client.phoneAssignment && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Company-Issued Phone
            </label>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <span className="font-mono text-sm text-primary font-medium">
                {client.phoneAssignment.phoneNumber}
              </span>
            </div>
          </div>
        )}

        {/* Personal Contact */}
        <div className="grid gap-3 sm:grid-cols-2">
          {client.phone && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Personal Phone</label>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{client.phone}</span>
              </div>
            </div>
          )}
          {client.email && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Personal Email</label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground truncate">{client.email}</span>
              </div>
            </div>
          )}
        </div>

        {/* Company-Issued Email */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            Company-Issued Email
          </label>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary font-medium">
              sarah.j.0101@company-ops.com
            </span>
          </div>
        </div>

        {/* Bank Credentials (Masked) */}
        <div className="space-y-3 rounded-lg bg-muted/30 p-4 ring-1 ring-border/30">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Bank Credentials (Masked)
            </label>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowCredentials(!showCredentials)}
            >
              {showCredentials ? (
                <EyeOff className="h-3.5 w-3.5 mr-1" />
              ) : (
                <Eye className="h-3.5 w-3.5 mr-1" />
              )}
              {showCredentials ? 'Hide' : 'Show'}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">Bank PIN</label>
              <p className="font-mono text-sm text-foreground">
                {showCredentials ? '2580' : bankPin}
              </p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Online Banking</label>
              <p className="font-mono text-sm text-foreground">
                {showCredentials ? onlineBankingUser : '••••••••'}
                {' / '}
                {showCredentials ? 'SecurePass123' : onlineBankingPass}
              </p>
            </div>
          </div>
        </div>

        {/* Primary Address */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Primary Address
          </label>
          <p className="text-sm text-foreground">
            {client.address && (
              <>
                {client.address}
                <br />
                {[client.city, client.state, client.zipCode].filter(Boolean).join(', ')}
              </>
            )}
            {!client.address && <span className="text-muted-foreground">Not provided</span>}
          </p>
        </div>

        {/* Secondary Address */}
        {client.secondaryAddress?.address && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Secondary Address</label>
            <p className="text-sm text-muted-foreground">
              {client.secondaryAddress.address}
              <br />
              {[
                client.secondaryAddress.city,
                client.secondaryAddress.state,
                client.secondaryAddress.zip,
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
          </div>
        )}

        {/* Flags Section */}
        {flags.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/30">
            <label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              Flags (Read-Only)
            </label>
            <div className="flex flex-wrap gap-2">
              {flags.map((flag, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className={`rounded-md px-2 py-1 text-xs ${
                    flag.type === 'warning'
                      ? 'border-accent/50 bg-accent/10 text-accent'
                      : flag.type === 'compliance'
                      ? 'border-destructive/50 bg-destructive/10 text-destructive'
                      : 'border-border bg-muted/50 text-muted-foreground'
                  }`}
                >
                  {flag.type === 'warning' && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {flag.type === 'compliance' && <Shield className="h-3 w-3 mr-1" />}
                  {flag.type === 'info' && <Info className="h-3 w-3 mr-1" />}
                  {flag.label}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
