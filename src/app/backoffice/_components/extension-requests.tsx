'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Clock, Check, X, AlertTriangle, User } from 'lucide-react'
import { approveExtensionRequest, rejectExtensionRequest } from '@/app/actions/extensions'

interface ExtensionRequest {
  id: string
  clientId: string
  clientName: string
  agentName: string
  reason: string
  requestedDays: number
  currentDeadline: Date
  createdAt: Date
  deadlineStatus: 'active' | 'overdue'
}

interface ExtensionRequestsProps {
  requests: ExtensionRequest[]
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  const minutes = Math.floor(diff / (1000 * 60))
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

function formatDeadline(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ExtensionRequests({ requests }: ExtensionRequestsProps) {
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleApprove(requestId: string) {
    startTransition(async () => {
      const result = await approveExtensionRequest(requestId)
      if (result.success) {
        toast.success('Extension approved — deadline extended')
      } else {
        toast.error(result.error || 'Failed to approve extension')
      }
    })
  }

  function handleReject(requestId: string) {
    if (!rejectNotes.trim()) {
      toast.error('Please provide rejection notes')
      return
    }
    startTransition(async () => {
      const result = await rejectExtensionRequest(requestId, rejectNotes)
      if (result.success) {
        toast.success('Extension request rejected')
        setRejectingId(null)
        setRejectNotes('')
      } else {
        toast.error(result.error || 'Failed to reject extension')
      }
    })
  }

  function toggleReject(requestId: string) {
    if (rejectingId === requestId) {
      setRejectingId(null)
      setRejectNotes('')
    } else {
      setRejectingId(requestId)
      setRejectNotes('')
    }
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Clock className="h-4 w-4" />
          Extension Requests
          {requests.length > 0 && (
            <Badge className="bg-accent/20 text-accent border-accent/30 text-xs font-medium ml-1">
              {requests.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No pending extension requests
          </p>
        ) : (
          requests.map((request) => (
            <div
              key={request.id}
              className="rounded-xl bg-muted/30 ring-1 ring-border/30 p-4 space-y-3"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">
                      {request.clientName}
                    </span>
                    {request.deadlineStatus === 'overdue' && (
                      <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs font-medium">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        OVERDUE
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{request.agentName}</span>
                    <span className="text-muted-foreground/50 mx-1">•</span>
                    <span>{formatRelativeTime(request.createdAt)}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs whitespace-nowrap shrink-0">
                  +{request.requestedDays} business days
                </Badge>
              </div>

              {/* Reason */}
              <p className="text-sm text-foreground/80">{request.reason}</p>

              {/* Deadline info */}
              <p className="text-xs text-muted-foreground">
                Current deadline: {formatDeadline(request.currentDeadline)}
              </p>

              {/* Reject notes inline form */}
              {rejectingId === request.id && (
                <div className="space-y-2 pt-1">
                  <Textarea
                    placeholder="Reason for rejection (required)..."
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    rows={2}
                    className="resize-none text-sm"
                    disabled={isPending}
                  />
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                {rejectingId === request.id ? (
                  <>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 text-xs"
                      onClick={() => handleReject(request.id)}
                      disabled={isPending || !rejectNotes.trim()}
                    >
                      {isPending ? 'Rejecting...' : 'Confirm Reject'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => toggleReject(request.id)}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-chart-4 hover:bg-chart-4/90 text-white"
                      onClick={() => handleApprove(request.id)}
                      disabled={isPending}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      {isPending ? 'Approving...' : 'Approve'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => toggleReject(request.id)}
                      disabled={isPending}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
