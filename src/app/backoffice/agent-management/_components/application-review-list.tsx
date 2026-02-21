'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Eye,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { approveApplication, rejectApplication } from '@/app/actions/application-review'
import type { ApplicationStatus } from '@/types'

export interface ApplicationRow {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  status: ApplicationStatus
  gender: string | null
  dateOfBirth: Date | null
  citizenship: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  country: string | null
  idDocument: string | null
  addressDocument: string | null
  idNumber: string | null
  idExpiry: Date | null
  zelle: string | null
  referredByName: string | null
  createdAt: Date
  reviewedBy: { id: string; name: string } | null
  reviewedAt: Date | null
  reviewNotes: string | null
  resultUser: { id: string; name: string; email: string } | null
}

interface Props {
  applications: ApplicationRow[]
  agents: { id: string; name: string }[]
}

export function ApplicationReviewList({ applications, agents }: Props) {
  const router = useRouter()
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewedOpen, setReviewedOpen] = useState(false)

  // Approve/reject state inside review dialog
  const [mode, setMode] = useState<'view' | 'reject'>('view')
  const [loading, setLoading] = useState(false)
  const [supervisorId, setSupervisorId] = useState('')
  const [tier, setTier] = useState('rookie')
  const [notes, setNotes] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState('')

  const pending = applications.filter((a) => a.status === 'PENDING')
  const reviewed = applications.filter((a) => a.status !== 'PENDING')
  const reviewingApp = applications.find((a) => a.id === reviewingId)

  const openReview = (id: string) => {
    setReviewingId(id)
    setMode('view')
    setSupervisorId('')
    setTier('rookie')
    setNotes('')
    setRejectReason('')
    setRejectError('')
  }

  const closeReview = () => {
    setReviewingId(null)
    setMode('view')
  }

  const handleApprove = async () => {
    if (!reviewingApp) return
    setLoading(true)
    try {
      const result = await approveApplication(reviewingApp.id, {
        supervisorId: supervisorId || undefined,
        tier,
        notes: notes || undefined,
      })
      if (result.success) {
        toast.success(`Agent account created for ${reviewingApp.firstName} ${reviewingApp.lastName}`)
        closeReview()
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to approve')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!reviewingApp) return
    if (!rejectReason.trim()) {
      setRejectError('Rejection reason is required')
      return
    }
    setLoading(true)
    setRejectError('')
    try {
      const result = await rejectApplication(reviewingApp.id, rejectReason)
      if (result.success) {
        toast.success(`Application rejected for ${reviewingApp.firstName} ${reviewingApp.lastName}`)
        closeReview()
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to reject')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Pending Applications — table matching agent directory style */}
      <Card className="card-terminal" data-testid="pending-applications-card">
        <CardHeader className="border-b border-border px-4 py-3">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Pending Applications ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pending.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No pending applications
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Applicant</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Email</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Phone</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Referred By</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Applied</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((app) => (
                    <tr
                      key={app.id}
                      className="border-b border-border transition-colors hover:bg-muted/30"
                      data-testid={`application-row-${app.id}`}
                    >
                      <td className="px-3 py-2">
                        <span className="font-medium text-xs">
                          {app.firstName} {app.lastName}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {app.email}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {app.phone}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {app.referredByName || '—'}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-xs gap-1"
                          onClick={() => openReview(app.id)}
                          data-testid={`review-app-${app.id}`}
                        >
                          <Eye className="h-3 w-3" />
                          Review
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

      {/* Reviewed — collapsed by default */}
      {reviewed.length > 0 && (
        <div className="mt-4" data-testid="reviewed-applications-card">
          <button
            type="button"
            onClick={() => setReviewedOpen(!reviewedOpen)}
            className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-left transition-colors hover:bg-muted/50 cursor-pointer"
            data-testid="toggle-reviewed"
          >
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex-1">
              Reviewed ({reviewed.length})
            </span>
            {reviewedOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {reviewedOpen && (
            <div className="mt-1 rounded-lg border border-border divide-y divide-border overflow-hidden">
              {reviewed.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center gap-3 px-4 py-2"
                  data-testid={`reviewed-row-${app.id}`}
                >
                  <Badge
                    className={`text-[10px] px-1.5 py-0 ${
                      app.status === 'APPROVED'
                        ? 'bg-success/20 text-success border-success/30'
                        : 'bg-destructive/20 text-destructive border-destructive/30'
                    }`}
                  >
                    {app.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                  </Badge>
                  <span className="text-sm font-medium truncate">
                    {app.firstName} {app.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {app.email}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                    {app.reviewedAt
                      ? formatDistanceToNow(new Date(app.reviewedAt), { addSuffix: true })
                      : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Dialog — full details + documents + approve/reject */}
      <Dialog open={!!reviewingId} onOpenChange={(open) => { if (!open) closeReview() }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="review-application-dialog">
          <DialogHeader>
            <DialogTitle>
              Review Application — {reviewingApp?.firstName} {reviewingApp?.lastName}
            </DialogTitle>
          </DialogHeader>

          {reviewingApp && (
            <>
              {/* Documents side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">ID Document</p>
                  {reviewingApp.idDocument ? (
                    <img
                      src={reviewingApp.idDocument}
                      alt="ID Document"
                      className="w-full rounded-md border border-border object-cover max-h-48"
                      data-testid="review-id-image"
                    />
                  ) : (
                    <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                      Not uploaded
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Address Proof</p>
                  {reviewingApp.addressDocument ? (
                    <img
                      src={reviewingApp.addressDocument}
                      alt="Address Proof"
                      className="w-full rounded-md border border-border object-cover max-h-48"
                      data-testid="review-address-image"
                    />
                  ) : (
                    <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                      Not uploaded
                    </div>
                  )}
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Name</span>
                  <p className="font-medium">{reviewingApp.firstName} {reviewingApp.lastName}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Email</span>
                  <p>{reviewingApp.email}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Phone</span>
                  <p className="font-mono">{reviewingApp.phone}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Gender</span>
                  <p>{reviewingApp.gender || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Date of Birth</span>
                  <p>{reviewingApp.dateOfBirth ? new Date(reviewingApp.dateOfBirth).toLocaleDateString() : '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Legal Status</span>
                  <p>{reviewingApp.citizenship || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">ID Number</span>
                  <p className="font-mono">{reviewingApp.idNumber || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">ID Expiry</span>
                  <p>{reviewingApp.idExpiry ? new Date(reviewingApp.idExpiry).toLocaleDateString() : '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Zelle</span>
                  <p>{reviewingApp.zelle || '—'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground">Address</span>
                  <p>{[reviewingApp.address, reviewingApp.city, reviewingApp.state, reviewingApp.zipCode, reviewingApp.country].filter(Boolean).join(', ') || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Referred By</span>
                  <p>{reviewingApp.referredByName || '—'}</p>
                </div>
              </div>

              {/* Reject form (shown when mode === 'reject') */}
              {mode === 'reject' ? (
                <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm font-medium text-destructive">Reject this application</p>
                  <Field>
                    <FieldLabel htmlFor="reject-reason">Reason *</FieldLabel>
                    <Textarea
                      id="reject-reason"
                      value={rejectReason}
                      onChange={(e) => { setRejectReason(e.target.value); if (rejectError) setRejectError('') }}
                      placeholder="Why is this application being rejected?"
                      rows={2}
                      data-testid="reject-reason-input"
                    />
                    <FieldError>{rejectError}</FieldError>
                  </Field>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMode('view')}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleReject}
                      disabled={loading}
                      data-testid="confirm-reject-btn"
                    >
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <X className="h-3.5 w-3.5 mr-1" />}
                      Reject
                    </Button>
                  </div>
                </div>
              ) : (
                /* Approve options (default view) */
                <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                  <div className="grid grid-cols-3 gap-3">
                    <Field>
                      <FieldLabel htmlFor="supervisor-select">Supervisor</FieldLabel>
                      <Select value={supervisorId} onValueChange={setSupervisorId}>
                        <SelectTrigger id="supervisor-select" data-testid="supervisor-select" className="h-8 text-xs">
                          <SelectValue placeholder="Optional" />
                        </SelectTrigger>
                        <SelectContent>
                          {agents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="tier-select">Initial Tier</FieldLabel>
                      <Select value={tier} onValueChange={setTier}>
                        <SelectTrigger id="tier-select" data-testid="tier-select" className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rookie">Rookie</SelectItem>
                          <SelectItem value="rising">Rising</SelectItem>
                          <SelectItem value="veteran">Veteran</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="review-notes">Notes</FieldLabel>
                      <Input
                        id="review-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Optional"
                        className="h-8 text-xs"
                        data-testid="review-notes-input"
                      />
                    </Field>
                  </div>
                </div>
              )}
            </>
          )}

          {mode !== 'reject' && (
            <DialogFooter>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setMode('reject')}
                disabled={loading}
                data-testid="reject-app-btn"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Reject
              </Button>
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={loading}
                className="bg-success text-success-foreground hover:bg-success/90"
                data-testid="confirm-approve-btn"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                Approve & Create Account
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
