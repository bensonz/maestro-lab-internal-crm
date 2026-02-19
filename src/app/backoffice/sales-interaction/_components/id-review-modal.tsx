'use client'

import { useState, useTransition, useMemo } from 'react'
import {
  Shield,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  FileText,
  Pencil,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  approvePrequal,
  rejectPrequal,
  rejectPrequalWithRetry,
} from '@/app/actions/backoffice'
import type { IntakeClient } from '@/backend/data/operations'

interface IdReviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: IntakeClient | null
  onActionComplete: () => void
}

type ActiveAction = 'reject' | 'reject-retry' | null

export function IdReviewModal({
  open,
  onOpenChange,
  client,
  onActionComplete,
}: IdReviewModalProps) {
  const [isPending, startTransition] = useTransition()
  const [activeAction, setActiveAction] = useState<ActiveAction>(null)
  const [reason, setReason] = useState('')

  function resetState() {
    setActiveAction(null)
    setReason('')
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetState()
    onOpenChange(nextOpen)
  }

  // Compute expiry status
  const expiryInfo = useMemo(() => {
    if (!client?.extractedData?.idExpiry) return null
    const expiry = new Date(client.extractedData.idExpiry)
    if (isNaN(expiry.getTime())) return null
    const daysUntilExpiry = Math.ceil(
      (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    )
    return {
      date: expiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      days: daysUntilExpiry,
      status: daysUntilExpiry <= 0 ? 'expired' : daysUntilExpiry <= 75 ? 'warning' : 'ok',
    } as const
  }, [client?.extractedData?.idExpiry])

  function handleApprove() {
    if (!client) return
    startTransition(async () => {
      const result = await approvePrequal(client.id)
      if (result.success) {
        toast.success(`Pre-qualification approved for ${client.name}`)
        handleOpenChange(false)
        onActionComplete()
      } else {
        toast.error(result.error || 'Failed to approve')
      }
    })
  }

  function handleReject() {
    if (!client) return
    if (activeAction !== 'reject') {
      setActiveAction('reject')
      return
    }
    startTransition(async () => {
      const result = await rejectPrequal(client.id, reason || undefined)
      if (result.success) {
        toast.success(`Pre-qualification rejected for ${client.name}`)
        handleOpenChange(false)
        onActionComplete()
      } else {
        toast.error(result.error || 'Failed to reject')
      }
    })
  }

  function handleRejectRetry() {
    if (!client) return
    if (activeAction !== 'reject-retry') {
      setActiveAction('reject-retry')
      return
    }
    startTransition(async () => {
      const result = await rejectPrequalWithRetry(client.id, reason || undefined)
      if (result.success) {
        toast.success(`Rejection with retry sent for ${client.name}`)
        handleOpenChange(false)
        onActionComplete()
      } else {
        toast.error(result.error || 'Failed to reject with retry')
      }
    })
  }

  function toUrl(filepath: string) {
    return filepath.startsWith('/') ? filepath : `/${filepath}`
  }

  function isImage(filepath: string) {
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(filepath)
  }

  function getFilename(filepath: string) {
    return filepath.split('/').pop() || filepath
  }

  if (!client) return null

  const extracted = client.extractedData
  const overrides = client.overriddenFields ?? []
  const screenshots = client.betmgmScreenshots ?? []

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl" data-testid="id-review-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            ID Verification Review — {client.name}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="grid grid-cols-2 gap-4 py-4">
            {/* Left Column: Documents */}
            <div className="space-y-4">
              {/* ID Document Preview */}
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">ID Document</p>
                {client.idImageUrl ? (
                  <div className="overflow-hidden rounded-lg border border-border">
                    {isImage(client.idImageUrl) ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={toUrl(client.idImageUrl)}
                        alt="Client ID"
                        className="h-48 w-full object-contain bg-muted"
                        data-testid="id-document-preview"
                      />
                    ) : (
                      <div className="flex h-32 items-center justify-center bg-muted">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-border px-3 py-1.5">
                      <span className="text-[11px] text-muted-foreground">{getFilename(client.idImageUrl)}</span>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" asChild>
                        <a href={toUrl(client.idImageUrl)} download target="_blank" rel="noopener noreferrer">
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
                    <p className="text-xs text-muted-foreground">No ID uploaded</p>
                  </div>
                )}
              </div>

              {/* BetMGM Screenshots */}
              {screenshots.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">BetMGM Screenshots</p>
                  <div className="grid grid-cols-2 gap-2">
                    {screenshots.map((filepath, idx) => (
                      <div key={idx} className="overflow-hidden rounded border border-border">
                        {isImage(filepath) ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={toUrl(filepath)}
                            alt={`Screenshot ${idx + 1}`}
                            className="h-24 w-full object-cover bg-muted"
                          />
                        ) : (
                          <div className="flex h-24 items-center justify-center bg-muted">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex items-center justify-between border-t border-border px-2 py-1">
                          <span className="truncate text-[10px] text-muted-foreground">{getFilename(filepath)}</span>
                          <Button size="sm" variant="ghost" className="h-5 w-5 p-0" asChild>
                            <a href={toUrl(filepath)} download target="_blank" rel="noopener noreferrer">
                              <Download className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Extracted Data + Checks */}
            <div className="space-y-4">
              {/* Extracted Data Card */}
              <div className="rounded-lg border border-border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Extracted Data</p>
                {extracted ? (
                  <div className="space-y-1.5 text-sm">
                    <DataRow label="First Name" value={extracted.firstName} overridden={overrides.includes('firstName')} />
                    <DataRow label="Last Name" value={extracted.lastName} overridden={overrides.includes('lastName')} />
                    {extracted.middleName && (
                      <DataRow label="Middle Name" value={extracted.middleName} overridden={overrides.includes('middleName')} />
                    )}
                    {extracted.dateOfBirth && (
                      <DataRow
                        label="Date of Birth"
                        value={`${extracted.dateOfBirth}${computeAge(extracted.dateOfBirth)}`}
                        overridden={overrides.includes('dateOfBirth')}
                      />
                    )}
                    {extracted.address && (
                      <DataRow label="Address" value={extracted.address} overridden={overrides.includes('address')} />
                    )}
                    {extracted.city && (
                      <DataRow label="City" value={extracted.city} overridden={overrides.includes('city')} />
                    )}
                    {extracted.state && (
                      <DataRow label="State" value={extracted.state} overridden={overrides.includes('state')} />
                    )}
                    {extracted.zip && (
                      <DataRow label="ZIP" value={extracted.zip} overridden={overrides.includes('zip')} />
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No extracted data available</p>
                )}
              </div>

              {/* Overridden Fields Warning */}
              {overrides.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3" data-testid="overridden-fields-warning">
                  <div className="flex items-center gap-2 mb-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    <p className="text-xs font-medium text-amber-500">Agent Overrides</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {overrides.map((field) => (
                      <Badge
                        key={field}
                        variant="outline"
                        className="border-amber-500/30 bg-amber-500/10 text-amber-500 text-[10px]"
                      >
                        <Pencil className="mr-1 h-2.5 w-2.5" />
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* ID Expiry Check */}
              {expiryInfo && (
                <div
                  className={cn(
                    'rounded-lg border p-3',
                    expiryInfo.status === 'expired'
                      ? 'border-destructive/30 bg-destructive/5'
                      : expiryInfo.status === 'warning'
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : 'border-emerald-500/30 bg-emerald-500/5',
                  )}
                  data-testid="id-expiry-check"
                >
                  <div className="flex items-center gap-2">
                    <Clock className={cn(
                      'h-3.5 w-3.5',
                      expiryInfo.status === 'expired' ? 'text-destructive' :
                      expiryInfo.status === 'warning' ? 'text-amber-500' : 'text-emerald-500',
                    )} />
                    <p className={cn(
                      'text-xs font-medium',
                      expiryInfo.status === 'expired' ? 'text-destructive' :
                      expiryInfo.status === 'warning' ? 'text-amber-500' : 'text-emerald-500',
                    )}>
                      {expiryInfo.status === 'expired'
                        ? `ID Expired (${Math.abs(expiryInfo.days)} days ago)`
                        : expiryInfo.status === 'warning'
                          ? `ID Expires in ${expiryInfo.days} days`
                          : `ID Valid (expires ${expiryInfo.date})`}
                    </p>
                  </div>
                </div>
              )}

              {/* BetMGM Result */}
              {client.betmgmAgentResult !== undefined && client.betmgmAgentResult !== null && (
                <div className="rounded-lg border border-border p-3">
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">BetMGM Result</p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        client.betmgmAgentResult === 'success'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                          : 'border-destructive/30 bg-destructive/10 text-destructive',
                      )}
                      data-testid="betmgm-agent-result"
                    >
                      Agent reported: {client.betmgmAgentResult}
                    </Badge>
                    {(client.betmgmRetryCount ?? 0) > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        Retry #{client.betmgmRetryCount}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reason textarea for reject/retry actions */}
          {activeAction && (
            <div className="space-y-2 pb-2">
              <p className="text-xs text-muted-foreground">
                {activeAction === 'reject'
                  ? 'Reason for rejection (optional)'
                  : 'Reason for retry request (optional)'}
              </p>
              <Textarea
                placeholder={
                  activeAction === 'reject'
                    ? 'Provide a reason for permanent rejection...'
                    : 'Explain why the agent should retry...'
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                data-testid="review-reason-textarea"
              />
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="text-amber-500 hover:text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
            onClick={handleRejectRetry}
            disabled={isPending}
            data-testid="reject-retry-btn"
          >
            <Clock className="mr-2 h-4 w-4" />
            {activeAction === 'reject-retry' ? 'Confirm Retry' : 'Reject (Retry 24h)'}
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={handleReject}
            disabled={isPending}
            data-testid="reject-btn"
          >
            <XCircle className="mr-2 h-4 w-4" />
            {activeAction === 'reject' ? 'Confirm Reject' : 'Reject'}
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={handleApprove}
            disabled={isPending}
            data-testid="approve-btn"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DataRow({ label, value, overridden }: { label: string; value: string; overridden?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <span className={cn('text-xs font-medium', overridden && 'text-amber-500')}>{value}</span>
        {overridden && <Pencil className="h-2.5 w-2.5 text-amber-500" />}
      </div>
    </div>
  )
}

function computeAge(dateOfBirth: string): string {
  const dob = new Date(dateOfBirth)
  if (isNaN(dob.getTime())) return ''
  const age = Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
  return ` (${age}y)`
}
