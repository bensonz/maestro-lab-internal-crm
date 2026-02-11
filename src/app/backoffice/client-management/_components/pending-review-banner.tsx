'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Image as ImageIcon,
  User,
  Calendar,
  MapPin,
  Shield,
} from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  approveClientIntake,
  rejectClientIntake,
  approvePrequal,
  rejectPrequal,
} from '@/app/actions/backoffice'

interface PendingReviewBannerProps {
  clientId: string
  clientName: string
  submittedDate: string
  agentName?: string
  betmgmScreenshots: string[]
  betmgmStatus: string
  questionnaire?: Record<string, unknown> | null
  state?: string
  dob?: string
  address?: string
  idImageUrl?: string
  reviewPhase?: 1 | 2
}

function formatBetmgmStatus(status: string): string {
  switch (status) {
    case 'PENDING_REVIEW': return 'Pending Review'
    case 'VERIFIED': return 'Verified'
    case 'REJECTED': return 'Rejected'
    default: return status.replace(/_/g, ' ')
  }
}

function ComplianceLine({
  label,
  value,
  flagValue,
}: {
  label: string
  value?: string
  flagValue?: string
}) {
  if (!value || value === '—') return null
  const isFlag = flagValue && value.toLowerCase() === flagValue.toLowerCase()
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-xs font-medium',
          isFlag ? 'text-destructive' : 'text-foreground',
        )}
      >
        {value === 'yes' ? 'Yes' : value === 'no' ? 'No' : value}
        {isFlag && ' ⚠'}
      </span>
    </div>
  )
}

export function PendingReviewBanner({
  clientId,
  clientName,
  submittedDate,
  agentName,
  betmgmScreenshots,
  betmgmStatus,
  questionnaire,
  state,
  dob,
  address,
  idImageUrl,
  reviewPhase = 2,
}: PendingReviewBannerProps) {
  const [isPending, startTransition] = useTransition()
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const router = useRouter()

  const compliance = (questionnaire?.compliance ?? {}) as Record<string, string>

  // Detect compliance red flags
  const redFlags: string[] = []
  if (compliance.hasBeenDebanked === 'yes') redFlags.push('Previously Debanked')
  if (compliance.hasCriminalRecord === 'yes') redFlags.push('Criminal Record')
  if (compliance.hasEightPlusRegistrations === 'yes') redFlags.push('8+ Platform Registrations')
  if (compliance.paypalPreviouslyUsed === 'yes') redFlags.push('PayPal Previously Used')

  function handleApprove() {
    startTransition(async () => {
      const result = reviewPhase === 1
        ? await approvePrequal(clientId)
        : await approveClientIntake(clientId)
      if (result.success) {
        toast.success(
          reviewPhase === 1
            ? 'Pre-qualification approved'
            : 'Client application approved',
        )
        setApproveDialogOpen(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to approve')
      }
    })
  }

  function handleReject() {
    startTransition(async () => {
      const result = reviewPhase === 1
        ? await rejectPrequal(clientId, rejectReason || undefined)
        : await rejectClientIntake(clientId, rejectReason || undefined)
      if (result.success) {
        toast.success(
          reviewPhase === 1
            ? 'Pre-qualification rejected'
            : 'Client application rejected',
        )
        setRejectDialogOpen(false)
        setRejectReason('')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to reject')
      }
    })
  }

  return (
    <>
      <div
        className="space-y-4 rounded-lg border-2 border-warning/40 bg-warning/5 p-5"
        data-testid="pending-review-banner"
      >
        {/* Status Banner with Approve/Reject */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-warning" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {reviewPhase === 1
                  ? 'Pre-Qualification Pending Review'
                  : 'Application Pending Review'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Submitted on {submittedDate}
                {agentName && <> by <span className="font-medium">{agentName}</span></>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => setRejectDialogOpen(true)}
              disabled={isPending}
              data-testid="banner-reject-btn"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => setApproveDialogOpen(true)}
              disabled={isPending}
              loading={isPending}
              data-testid="banner-approve-btn"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approve
            </Button>
          </div>
        </div>

        {/* Two-column: Screenshots/Compliance + Summary */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Left column: Phase 1 = ID + BetMGM screenshots, Phase 2 = Compliance summary */}
          <div className="rounded-md border border-border/50 bg-card p-4">
            {reviewPhase === 1 ? (
              <>
                {/* ID Document preview */}
                {idImageUrl && (
                  <div className="mb-4">
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      Client ID Document
                    </h3>
                    <button
                      onClick={() => setLightboxUrl(idImageUrl.startsWith('uploads/') ? `/api/upload?path=${idImageUrl}` : idImageUrl)}
                      className="group relative aspect-video w-full max-w-xs overflow-hidden rounded-md border border-border/50 bg-muted/30 transition-all hover:border-primary/50 hover:ring-2 hover:ring-primary/20"
                      data-testid="id-document-preview"
                    >
                      <img
                        src={idImageUrl.startsWith('uploads/') ? `/api/upload?path=${idImageUrl}` : idImageUrl}
                        alt="Client ID"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                        <span className="text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                          Click to enlarge
                        </span>
                      </div>
                    </button>
                  </div>
                )}
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <ImageIcon className="h-3.5 w-3.5" />
                    BetMGM Verification Screenshots
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[9px]',
                      betmgmStatus === 'VERIFIED'
                        ? 'border-success/30 text-success'
                        : betmgmStatus === 'REJECTED'
                          ? 'border-destructive/30 text-destructive'
                          : 'border-warning/30 text-warning',
                    )}
                  >
                    {formatBetmgmStatus(betmgmStatus)}
                  </Badge>
                </div>

                {betmgmScreenshots.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {betmgmScreenshots.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => setLightboxUrl(url)}
                        className="group relative aspect-video overflow-hidden rounded-md border border-border/50 bg-muted/30 transition-all hover:border-primary/50 hover:ring-2 hover:ring-primary/20"
                        data-testid={`betmgm-screenshot-${idx}`}
                      >
                        <img
                          src={url.startsWith('uploads/') ? `/api/upload?path=${url}` : url}
                          alt={`BetMGM screenshot ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                          <span className="text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                            Click to enlarge
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border/50 text-sm text-muted-foreground">
                    No screenshots uploaded
                  </div>
                )}
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Uploaded by agent during pre-qualification
                </p>
              </>
            ) : (
              <>
                <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  Compliance Review
                </h3>
                <div className="space-y-2 text-sm">
                  <ComplianceLine label="Banking History" value={compliance.hasBankingHistory} />
                  <ComplianceLine label="Bank Name" value={compliance.bankName} />
                  <ComplianceLine label="Account Type" value={compliance.bankAccountType} />
                  <ComplianceLine label="Debanked" value={compliance.hasBeenDebanked} flagValue="yes" />
                  <ComplianceLine label="Has PayPal" value={compliance.hasPayPal} />
                  <ComplianceLine label="PayPal Previously Used" value={compliance.paypalPreviouslyUsed} flagValue="yes" />
                  <ComplianceLine label="Betting History" value={compliance.bettingPlatformHistory} />
                  <ComplianceLine label="8+ Registrations" value={compliance.hasEightPlusRegistrations} flagValue="yes" />
                  <ComplianceLine label="Criminal Record" value={compliance.hasCriminalRecord} flagValue="yes" />
                  <ComplianceLine label="ID Type" value={compliance.idType} />
                  <ComplianceLine label="Address Proof" value={compliance.hasAddressProof} />
                  <ComplianceLine label="Reads English" value={compliance.canReadEnglish} />
                  <ComplianceLine label="Speaks English" value={compliance.canSpeakEnglish} />
                  {compliance.agentNotes && (
                    <div className="mt-2 border-t border-border/50 pt-2">
                      <span className="text-xs text-muted-foreground">Agent Notes:</span>
                      <p className="text-xs mt-0.5">{compliance.agentNotes}</p>
                    </div>
                  )}

                  {/* BetMGM one-liner summary */}
                  <div className="mt-3 border-t border-border/50 pt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>BetMGM (reviewed in Phase 1)</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px]',
                          betmgmStatus === 'VERIFIED'
                            ? 'border-success/30 text-success'
                            : betmgmStatus === 'REJECTED'
                              ? 'border-destructive/30 text-destructive'
                              : 'border-warning/30 text-warning',
                        )}
                      >
                        {formatBetmgmStatus(betmgmStatus)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Application Summary */}
          <div className="rounded-md border border-border/50 bg-card p-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              Application Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Client</span>
                <span className="font-medium">{clientName}</span>
              </div>
              {dob && dob !== '\u2014' && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    DOB
                  </span>
                  <span className="font-mono text-xs">{dob}</span>
                </div>
              )}
              {state && state !== '\u2014' && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    State
                  </span>
                  <span>{state}</span>
                </div>
              )}
              {address && address !== '\u2014' && (
                <div className="flex items-start justify-between">
                  <span className="text-muted-foreground">Address</span>
                  <span className="text-right text-xs">{address}</span>
                </div>
              )}
              {agentName && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Agent</span>
                  <span className="font-medium">{agentName}</span>
                </div>
              )}
              {reviewPhase === 2 && compliance.riskLevel ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Risk Level</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px]',
                      compliance.riskLevel?.toLowerCase() === 'high'
                        ? 'border-destructive/30 text-destructive'
                        : compliance.riskLevel?.toLowerCase() === 'medium'
                          ? 'border-warning/30 text-warning'
                          : 'border-success/30 text-success',
                    )}
                  >
                    {compliance.riskLevel}
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">BetMGM Result</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px]',
                      betmgmStatus === 'REJECTED'
                        ? 'border-destructive/30 text-destructive'
                        : 'border-success/30 text-success',
                    )}
                  >
                    {betmgmStatus === 'REJECTED' ? 'Failed' : 'Passed'}
                  </Badge>
                </div>
              )}
              {reviewPhase === 2 && compliance.profession && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Profession</span>
                  <span className="text-xs">{compliance.profession}</span>
                </div>
              )}
              {reviewPhase === 2 && compliance.introducedBy && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Introduced By</span>
                  <span className="text-xs">{compliance.introducedBy}</span>
                </div>
              )}
            </div>

            {/* Red Flags */}
            {redFlags.length > 0 && (
              <div className="mt-3 border-t border-border/50 pt-3">
                <h4 className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                  <Shield className="h-3 w-3" />
                  Compliance Red Flags
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {redFlags.map((flag) => (
                    <Badge
                      key={flag}
                      variant="outline"
                      className="gap-1 border-destructive/30 bg-destructive/5 text-[9px] text-destructive"
                    >
                      <AlertTriangle className="h-2.5 w-2.5" />
                      {flag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Screenshot Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>BetMGM Screenshot</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center overflow-auto">
            {lightboxUrl && (
              <img
                src={lightboxUrl.startsWith('uploads/') ? `/api/upload?path=${lightboxUrl}` : lightboxUrl}
                alt="BetMGM Screenshot"
                className="max-h-[80vh] w-auto object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {reviewPhase === 1 ? 'Approve Pre-Qualification' : 'Approve Application'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {reviewPhase === 1
                ? 'This will approve the pre-qualification, allowing the agent to proceed with the full application (Phase 2).'
                : 'This will transition the client to APPROVED status, trigger commission distribution, and notify the agent. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={isPending}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              data-testid="banner-confirm-approve-btn"
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
            <AlertDialogTitle>
              {reviewPhase === 1 ? 'Reject Pre-Qualification' : 'Reject Application'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {reviewPhase === 1
                ? 'This will reject the pre-qualification and notify the agent. Optionally provide a reason.'
                : 'This will reject the client application and notify the agent. Optionally provide a reason for rejection.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            className="mt-2"
            data-testid="banner-reject-reason-input"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="banner-confirm-reject-btn"
            >
              {isPending ? 'Rejecting...' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
