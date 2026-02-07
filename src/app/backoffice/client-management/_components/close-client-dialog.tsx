'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { closeClientAction, checkBalancesAction } from '@/app/actions/closure'
import { Field, FieldLabel } from '@/components/ui/field'

interface CloseClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName: string
  isAdmin: boolean
}

export function CloseClientDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  isAdmin,
}: CloseClientDialogProps) {
  const [reason, setReason] = useState('')
  const [skipBalanceCheck, setSkipBalanceCheck] = useState(false)
  const [balances, setBalances] = useState<Record<
    string,
    { balance: number }
  > | null>(null)
  const [allZero, setAllZero] = useState(false)
  const [loadingBalances, setLoadingBalances] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setReason('')
      setSkipBalanceCheck(false)
      setBalances(null)
      setAllZero(false)
      setError(null)
      return
    }

    async function loadBalances() {
      setLoadingBalances(true)
      setError(null)
      const result = await checkBalancesAction(clientId)
      if (result.success && 'breakdown' in result) {
        setBalances(result.breakdown as Record<string, { balance: number }>)
        setAllZero(result.allZero as boolean)
      } else {
        setError(result.error ?? 'Failed to check balances')
      }
      setLoadingBalances(false)
    }

    loadBalances()
  }, [open, clientId])

  const canSubmit =
    reason.trim().length > 0 && (allZero || skipBalanceCheck) && !submitting

  async function handleConfirm() {
    setSubmitting(true)
    setError(null)

    const result = await closeClientAction({
      clientId,
      reason: reason.trim(),
      skipBalanceCheck,
    })

    if (result.success) {
      onOpenChange(false)
    } else {
      setError(result.error ?? 'Failed to close client')
    }

    setSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        data-testid="close-client-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            End Partnership
          </DialogTitle>
          <DialogDescription>
            Close partnership with <strong>{clientName}</strong>. This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Balance Check Panel */}
          <div className="rounded-md border p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Platform Balances
            </p>
            {loadingBalances ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking balances...
              </div>
            ) : balances && Object.keys(balances).length > 0 ? (
              <div className="space-y-1">
                {Object.entries(balances).map(([platform, { balance }]) => {
                  const isZero = Math.abs(balance) < 0.01
                  return (
                    <div
                      key={platform}
                      className="flex items-center justify-between text-sm"
                      data-testid={`balance-${platform}`}
                    >
                      <span>{platform}</span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={
                            isZero
                              ? 'text-muted-foreground'
                              : 'font-medium text-destructive'
                          }
                        >
                          ${balance.toFixed(2)}
                        </span>
                        {isZero ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : balances ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                No platform balances found
              </div>
            ) : null}

            {!loadingBalances && !allZero && balances && (
              <Badge
                variant="destructive"
                className="mt-2"
                data-testid="non-zero-warning"
              >
                Non-zero balances must be resolved before closure
              </Badge>
            )}
          </div>

          {/* Admin Override */}
          {isAdmin && !allZero && balances && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="skip-balance-check"
                checked={skipBalanceCheck}
                onCheckedChange={(checked) =>
                  setSkipBalanceCheck(checked === true)
                }
                data-testid="skip-balance-checkbox"
              />
              <label
                htmlFor="skip-balance-check"
                className="text-sm text-muted-foreground"
              >
                Admin override: skip balance verification
              </label>
            </div>
          )}

          {/* Reason */}
          <Field>
            <FieldLabel htmlFor="closure-reason">
              Reason for closure
            </FieldLabel>
            <Textarea
              id="closure-reason"
              placeholder="Enter the reason for ending this partnership..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              data-testid="closure-reason"
            />
          </Field>

          {/* Error */}
          {error && (
            <p
              className="text-sm text-destructive"
              data-testid="closure-error"
            >
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            data-testid="closure-cancel-btn"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canSubmit}
            data-testid="closure-confirm-btn"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Closing...
              </>
            ) : (
              'End Partnership'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
