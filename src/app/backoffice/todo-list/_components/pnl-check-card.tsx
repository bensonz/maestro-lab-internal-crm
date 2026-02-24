'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, ClipboardCheck, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { markDailyPnlComplete } from '@/lib/mock-actions'
import { toast } from 'sonner'
import type { PnlStatus } from './types'

interface PnlCheckCardProps {
  pnlStatus: PnlStatus
}

export function PnlCheckCard({ pnlStatus: initialStatus }: PnlCheckCardProps) {
  const [status, setStatus] = useState(initialStatus)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleComplete() {
    setLoading(true)
    try {
      const result = await markDailyPnlComplete(notes || undefined)
      if (result.success) {
        setStatus({
          completed: true,
          completedBy: 'You',
          completedAtFormatted: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        })
        if (result.alreadyCompleted) {
          toast.success('P&L check was already completed today')
        } else {
          toast.success('P&L daily check completed')
        }
      } else {
        toast.error(result.error || 'Failed to complete P&L check')
      }
    } catch {
      toast.error('Failed to complete P&L check')
    } finally {
      setLoading(false)
    }
  }

  if (status.completed) {
    return (
      <Card
        className={cn('border-success/30 bg-success/5')}
        data-testid="pnl-check-card-completed"
      >
        <CardContent className="flex items-center gap-3 p-4">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-success" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-success">
              P&L Reconciliation Complete
            </p>
            <p className="text-xs text-muted-foreground">
              Completed at {status.completedAtFormatted || '—'} by{' '}
              {status.completedBy}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn('border-warning/30 bg-warning/5')}
      data-testid="pnl-check-card-pending"
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-warning" />
          <p className="text-sm font-medium">P&L Daily Reconciliation</p>
        </div>
        <Textarea
          placeholder="Notes (optional)..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-16 resize-none text-sm"
          data-testid="pnl-notes-input"
        />
        <Button
          onClick={handleComplete}
          disabled={loading}
          className="w-full"
          data-testid="pnl-complete-btn"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          Complete P&L Check
        </Button>
      </CardContent>
    </Card>
  )
}
