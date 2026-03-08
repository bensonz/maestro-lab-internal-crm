'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Mail,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Unplug,
  BarChart3,
} from 'lucide-react'
import {
  getGmailStatus,
  getGmailAuthUrl,
  disconnectGmail,
  triggerManualSync,
} from '@/app/actions/gmail-settings'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface GmailStatusData {
  connected: boolean
  inboxEmail?: string
  lastSyncAt?: Date | null
  connectedAt?: Date
  stats?: {
    processedToday: number
    todosCreatedToday: number
    fundsMatchedToday: number
  }
}

export function GmailSettingsView() {
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<GmailStatusData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    const result = await getGmailStatus()
    if (result.success) {
      setStatus({
        connected: result.connected ?? false,
        inboxEmail: result.inboxEmail,
        lastSyncAt: result.lastSyncAt,
        connectedAt: result.connectedAt,
        stats: result.stats,
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchStatus()

    const success = searchParams.get('success')
    const error = searchParams.get('error')
    if (success === 'connected') {
      toast.success('Gmail connected successfully')
    }
    if (error) {
      const errorMessages: Record<string, string> = {
        oauth_denied: 'OAuth consent was denied',
        no_code: 'No authorization code received',
        no_email: 'Could not retrieve inbox email',
        token_exchange: 'Token exchange failed',
      }
      toast.error(errorMessages[error] || `OAuth error: ${error}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleConnect = () => {
    startTransition(async () => {
      const result = await getGmailAuthUrl()
      if (result.success && result.url) {
        window.location.href = result.url
      } else {
        toast.error(result.error || 'Failed to get auth URL')
      }
    })
  }

  const handleDisconnect = () => {
    startTransition(async () => {
      const result = await disconnectGmail()
      if (result.success) {
        toast.success('Gmail disconnected')
        fetchStatus()
      } else {
        toast.error(result.error || 'Failed to disconnect')
      }
    })
  }

  const handleSync = () => {
    startTransition(async () => {
      const result = await triggerManualSync()
      if (result.success) {
        const s = result.summary
        toast.success(
          `Sync complete: ${s?.emailsFetched ?? 0} emails, ${s?.todosCreated ?? 0} todos, ${s?.fundsMatched ?? 0} funds matched`,
        )
        fetchStatus()
      } else {
        toast.error(result.error || 'Sync failed')
      }
    })
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6" data-testid="gmail-settings">
      <div>
        <h1 className="text-2xl font-semibold">Gmail Integration</h1>
        <p className="text-sm text-muted-foreground">
          Connect a business Gmail inbox to auto-detect platform emails and create todos
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {status?.connected ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm font-medium">Connected</p>
                  <p className="text-xs text-muted-foreground">
                    {status.inboxEmail}
                  </p>
                </div>
                <Badge variant="secondary" className="ml-auto text-[10px] text-success">
                  Active
                </Badge>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Not Connected</p>
                  <p className="text-xs text-muted-foreground">
                    Connect a Gmail inbox to start auto-detecting emails
                  </p>
                </div>
              </>
            )}
          </div>

          {status?.connected && status.lastSyncAt && (
            <p className="text-xs text-muted-foreground">
              Last synced: {format(new Date(status.lastSyncAt), 'MMM d, yyyy h:mm a')}
            </p>
          )}

          {status?.connected && status.connectedAt && (
            <p className="text-xs text-muted-foreground">
              Connected since: {format(new Date(status.connectedAt), 'MMM d, yyyy')}
            </p>
          )}

          <div className="flex gap-2">
            {status?.connected ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={isPending}
                  data-testid="sync-now-btn"
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Sync Now
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={isPending}
                  data-testid="disconnect-gmail-btn"
                >
                  <Unplug className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                variant="terminal"
                onClick={handleConnect}
                disabled={isPending}
                data-testid="connect-gmail-btn"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Connect Gmail
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {status?.connected && status.stats && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Today&apos;s Stats</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="font-mono text-2xl font-semibold">
                  {status.stats.processedToday}
                </p>
                <p className="text-xs text-muted-foreground">Emails Processed</p>
              </div>
              <div className="text-center">
                <p className="font-mono text-2xl font-semibold text-primary">
                  {status.stats.todosCreatedToday}
                </p>
                <p className="text-xs text-muted-foreground">Todos Created</p>
              </div>
              <div className="text-center">
                <p className="font-mono text-2xl font-semibold text-success">
                  {status.stats.fundsMatchedToday}
                </p>
                <p className="text-xs text-muted-foreground">Funds Matched</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup instructions when not connected */}
      {!status?.connected && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ol className="list-decimal space-y-2 pl-4">
              <li>Create a Google Cloud project at console.cloud.google.com</li>
              <li>Enable the Gmail API</li>
              <li>Create OAuth 2.0 credentials (Web Application type)</li>
              <li>
                Set the redirect URI to:{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  https://your-domain.com/api/gmail/callback
                </code>
              </li>
              <li>
                Add these environment variables:
                <ul className="mt-1 space-y-1 pl-4">
                  <li>
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">GMAIL_CLIENT_ID</code>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">GMAIL_CLIENT_SECRET</code>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">GMAIL_REDIRECT_URI</code>
                  </li>
                </ul>
              </li>
              <li>Click &quot;Connect Gmail&quot; above to authorize</li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
