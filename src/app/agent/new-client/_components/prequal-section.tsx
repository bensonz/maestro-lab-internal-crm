'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Mail, Lock, Eye, EyeOff, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateGmailCredentials } from '@/app/actions/prequal'
import { toast } from 'sonner'

interface PrequalSectionProps {
  betmgmStatus: string
  betmgmVerified: boolean
  defaultGmail?: string
  defaultPassword?: string
  clientId?: string
  errors?: Record<string, string[]>
  disabled?: boolean
}

export function PrequalSection({
  betmgmStatus,
  betmgmVerified,
  defaultGmail,
  defaultPassword,
  clientId,
  errors,
  disabled,
}: PrequalSectionProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isUpdating, startTransition] = useTransition()
  const [gmail, setGmail] = useState(defaultGmail ?? '')
  const [password, setPassword] = useState(defaultPassword ?? '')

  const handleUpdateCredentials = () => {
    if (!clientId) return

    const formData = new FormData()
    formData.set('clientId', clientId)
    formData.set('gmailAccount', gmail)
    formData.set('gmailPassword', password)

    startTransition(async () => {
      const result = await updateGmailCredentials({}, formData)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message || 'Failed to update credentials')
      }
    })
  }

  const statusBadge = () => {
    if (betmgmVerified) {
      return (
        <Badge
          variant="outline"
          className="bg-success/15 text-success border-success/30"
          data-testid="betmgm-verified-badge"
        >
          <CheckCircle2 className="mr-1 h-3 w-3" />
          BetMGM Verified
        </Badge>
      )
    }
    if (betmgmStatus === 'PENDING_REVIEW') {
      return (
        <Badge
          variant="outline"
          className="bg-warning/15 text-warning border-warning/30"
          data-testid="betmgm-pending-badge"
        >
          <Clock className="mr-1 h-3 w-3" />
          Awaiting BetMGM Verification
        </Badge>
      )
    }
    return null
  }

  return (
    <div className="space-y-4" data-testid="prequal-section">
      <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Gmail & BetMGM Verification
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="gmailAccount">
              <Mail className="mr-1 inline h-3.5 w-3.5" />
              Gmail Account
            </FieldLabel>
            <Input
              id="gmailAccount"
              name="gmailAccount"
              type="email"
              placeholder="client@gmail.com"
              value={gmail}
              onChange={(e) => setGmail(e.target.value)}
              disabled={disabled}
              data-testid="prequal-gmail-input"
            />
            <FieldError>{errors?.gmailAccount?.[0]}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="gmailPassword">
              <Lock className="mr-1 inline h-3.5 w-3.5" />
              Gmail Password
            </FieldLabel>
            <div className="relative">
              <Input
                id="gmailPassword"
                name="gmailPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={disabled}
                className="pr-10"
                data-testid="prequal-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <FieldError>{errors?.gmailPassword?.[0]}</FieldError>
          </Field>
        </div>

        {/* BetMGM Status */}
        <div className="flex items-center justify-between">
          {statusBadge()}
          {clientId && !disabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleUpdateCredentials}
              disabled={isUpdating || !gmail || !password}
              data-testid="update-gmail-btn"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Credentials'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
