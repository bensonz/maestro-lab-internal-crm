'use client'

import { useState, useTransition } from 'react'
import {
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  ClipboardCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { approveClientIntake, rejectClientIntake } from '@/app/actions/backoffice'

// ============================================================================
// Types
// ============================================================================

interface ComplianceData {
  hasBankingHistory?: string
  bankName?: string
  hasBeenDebanked?: string
  debankedBy?: string
  ssn?: string
  bankAccountType?: string
  hasPayPal?: string
  paypalEmail?: string
  paypalPreviouslyUsed?: string
  paypalVerificationStatus?: string
  hasBettingHistory?: string
  previousPlatforms?: string[]
  hasEightPlusRegistrations?: string
  hasCriminalRecord?: string
  criminalDetails?: string
  idType?: string
  hasAddressProof?: string
  riskLevel?: string
  isReliable?: string
  previouslyFlagged?: string
  introducedBy?: string
  howMet?: string
  profession?: string
  canReadEnglish?: string
  canSpeakEnglish?: string
  languageNotes?: string
  authorizationNotes?: string
}

interface ApplicationReviewCardProps {
  clientId: string
  intakeStatus: string
  questionnaire: Record<string, unknown> | null
  hideActions?: boolean
}

// ============================================================================
// Helpers
// ============================================================================

function formatValue(value: string | undefined | null, fallback = '\u2014'): string {
  if (!value || value === '') return fallback
  return value
}

function formatYesNo(value: string | undefined | null): string {
  if (!value || value === '') return '\u2014'
  switch (value) {
    case 'yes': return 'Yes'
    case 'no': return 'No'
    case 'unknown': return 'Unknown'
    case 'none': return 'None'
    case 'some': return 'Some'
    case 'extensive': return 'Extensive'
    case 'limited': return 'Limited'
    case 'verified': return 'Verified'
    case 'unverified': return 'Unverified'
    case 'multiple': return 'Multiple'
    case 'checking': return 'Checking'
    case 'savings': return 'Savings'
    case 'pending': return 'Pending'
    case 'low': return 'Low'
    case 'medium': return 'Medium'
    case 'high': return 'High'
    default: return value.charAt(0).toUpperCase() + value.slice(1)
  }
}

function formatIdType(value: string | undefined | null): string {
  if (!value || value === '') return '\u2014'
  switch (value) {
    case 'drivers_license': return "Driver's License"
    case 'state_id': return 'State ID'
    case 'passport': return 'Passport'
    default: return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ')
  }
}

function maskSSN(ssn: string): string {
  // Show only last 4 digits
  if (ssn.length >= 4) {
    return `\u2022\u2022\u2022-\u2022\u2022-${ssn.slice(-4)}`
  }
  return '\u2022\u2022\u2022\u2022'
}

function getRiskBadgeColor(level: string): string {
  switch (level) {
    case 'low': return 'bg-success/20 text-success'
    case 'medium': return 'bg-warning/20 text-warning'
    case 'high': return 'bg-destructive/20 text-destructive'
    default: return 'bg-muted text-muted-foreground'
  }
}

// ============================================================================
// Sub-components
// ============================================================================

function ReviewRow({
  label,
  value,
  className,
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-baseline justify-between py-0.5', className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground">{value}</span>
    </div>
  )
}

function GroupHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground first:mt-0">
      {children}
    </p>
  )
}

// ============================================================================
// Component
// ============================================================================

export function ApplicationReviewCard({
  clientId,
  intakeStatus,
  questionnaire,
  hideActions,
}: ApplicationReviewCardProps) {
  const [isPending, startTransition] = useTransition()
  const [showSSN, setShowSSN] = useState(false)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const compliance = (questionnaire?.compliance ?? {}) as ComplianceData
  const overriddenFields = (questionnaire?.overriddenFields ?? []) as string[]
  const idVerified = questionnaire?.idVerified as boolean | undefined
  const dateOfBirth = questionnaire?.dateOfBirth as string | undefined
  const middleName = questionnaire?.middleName as string | undefined

  const isReadyForApproval = intakeStatus === 'READY_FOR_APPROVAL'

  function handleApprove() {
    startTransition(async () => {
      const result = await approveClientIntake(clientId)
      if (result.success) {
        toast.success('Client application approved')
        setApproveDialogOpen(false)
      } else {
        toast.error(result.error || 'Failed to approve')
      }
    })
  }

  function handleReject() {
    startTransition(async () => {
      const result = await rejectClientIntake(clientId, rejectReason || undefined)
      if (result.success) {
        toast.success('Client application rejected')
        setRejectDialogOpen(false)
        setRejectReason('')
      } else {
        toast.error(result.error || 'Failed to reject')
      }
    })
  }

  return (
    <>
      <Card className="card-terminal" data-testid="application-review-card">
        <CardHeader className="px-4 pb-2 pt-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Application Review
            </CardTitle>
            {isReadyForApproval && !hideActions && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={isPending}
                  data-testid="reject-application-btn"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  className="h-7 gap-1.5 text-xs bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => setApproveDialogOpen(true)}
                  disabled={isPending}
                  data-testid="approve-application-btn"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {/* Meta row */}
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {idVerified !== undefined && (
              <Badge variant="outline" className="text-[9px]">
                ID {idVerified ? 'Verified' : 'Not Verified'}
              </Badge>
            )}
            {dateOfBirth && (
              <span>DOB: <span className="font-mono">{dateOfBirth}</span></span>
            )}
            {middleName && (
              <span>Middle: {middleName}</span>
            )}
            {overriddenFields.length > 0 && (
              <Badge variant="outline" className="text-[9px] border-warning/30 text-warning">
                {overriddenFields.length} field{overriddenFields.length > 1 ? 's' : ''} overridden
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
            {/* Group A: Banking & Financial */}
            <div>
              <GroupHeader>Banking &amp; Financial</GroupHeader>
              <ReviewRow label="Banking History" value={formatYesNo(compliance.hasBankingHistory)} />
              <ReviewRow label="Bank Name" value={formatValue(compliance.bankName)} />
              <ReviewRow label="Account Type" value={formatYesNo(compliance.bankAccountType)} />
              <ReviewRow label="Debanked" value={formatYesNo(compliance.hasBeenDebanked)} />
              {compliance.hasBeenDebanked === 'yes' && compliance.debankedBy && (
                <ReviewRow label="Debanked By" value={compliance.debankedBy} />
              )}
              <ReviewRow
                label="SSN"
                value={
                  compliance.ssn ? (
                    <span className="flex items-center gap-1">
                      <span className="font-mono">
                        {showSSN ? compliance.ssn : maskSSN(compliance.ssn)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSSN(!showSSN)}
                        className="text-muted-foreground hover:text-foreground"
                        data-testid="toggle-ssn-btn"
                      >
                        {showSSN ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </button>
                    </span>
                  ) : (
                    '\u2014'
                  )
                }
              />
            </div>

            {/* Group B: PayPal & Payment */}
            <div>
              <GroupHeader>PayPal &amp; Payment</GroupHeader>
              <ReviewRow label="Has PayPal" value={formatYesNo(compliance.hasPayPal)} />
              <ReviewRow label="PayPal Email" value={formatValue(compliance.paypalEmail)} />
              <ReviewRow label="Previously Used" value={formatYesNo(compliance.paypalPreviouslyUsed)} />
              <ReviewRow label="Verification" value={formatYesNo(compliance.paypalVerificationStatus)} />
            </div>

            {/* Group C: Platform History */}
            <div>
              <GroupHeader>Platform History</GroupHeader>
              <ReviewRow label="Betting History" value={formatYesNo(compliance.hasBettingHistory)} />
              <ReviewRow
                label="Previous Platforms"
                value={
                  compliance.previousPlatforms && compliance.previousPlatforms.length > 0
                    ? compliance.previousPlatforms.join(', ')
                    : '\u2014'
                }
              />
              <ReviewRow label="8+ Registrations" value={formatYesNo(compliance.hasEightPlusRegistrations)} />
            </div>

            {/* Group D: Criminal & Legal */}
            <div>
              <GroupHeader>Criminal &amp; Legal</GroupHeader>
              <ReviewRow label="Criminal Record" value={formatYesNo(compliance.hasCriminalRecord)} />
              {compliance.hasCriminalRecord === 'yes' && compliance.criminalDetails && (
                <ReviewRow label="Details" value={compliance.criminalDetails} />
              )}
              <ReviewRow label="ID Type" value={formatIdType(compliance.idType)} />
              <ReviewRow label="Address Proof" value={formatYesNo(compliance.hasAddressProof)} />
            </div>

            {/* Group E: Risk Assessment */}
            <div>
              <GroupHeader>Risk Assessment</GroupHeader>
              <ReviewRow
                label="Risk Level"
                value={
                  compliance.riskLevel ? (
                    <Badge className={cn('text-[9px]', getRiskBadgeColor(compliance.riskLevel))}>
                      {formatYesNo(compliance.riskLevel)}
                    </Badge>
                  ) : (
                    '\u2014'
                  )
                }
              />
              <ReviewRow label="Reliable" value={formatYesNo(compliance.isReliable)} />
              <ReviewRow label="Previously Flagged" value={formatYesNo(compliance.previouslyFlagged)} />
              <ReviewRow label="Introduced By" value={formatValue(compliance.introducedBy)} />
              <ReviewRow label="How Met" value={formatValue(compliance.howMet)} />
              <ReviewRow label="Profession" value={formatValue(compliance.profession)} />
            </div>

            {/* Group F: Language & Communication */}
            <div>
              <GroupHeader>Language &amp; Communication</GroupHeader>
              <ReviewRow label="Read English" value={formatYesNo(compliance.canReadEnglish)} />
              <ReviewRow label="Speak English" value={formatYesNo(compliance.canSpeakEnglish)} />
              <ReviewRow label="Notes" value={formatValue(compliance.languageNotes)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Application</AlertDialogTitle>
            <AlertDialogDescription>
              This will transition the client to APPROVED status, trigger commission
              distribution, and notify the agent. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={isPending}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              data-testid="confirm-approve-btn"
            >
              {isPending ? 'Approving...' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Application</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject the client application and notify the agent.
              Optionally provide a reason for rejection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            className="mt-2"
            data-testid="reject-reason-input"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-reject-btn"
            >
              {isPending ? 'Rejecting...' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
