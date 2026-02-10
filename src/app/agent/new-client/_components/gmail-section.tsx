'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { updateGmailCredentials } from '@/app/actions/prequal'
import { toast } from 'sonner'

interface GmailSectionProps {
  defaultGmail?: string
  defaultPassword?: string
  clientId?: string
  errors?: Record<string, string[]>
  disabled?: boolean
  onGmailChange?: (value: string) => void
  onPasswordChange?: (value: string) => void
}

export function GmailSection({
  defaultGmail,
  defaultPassword,
  clientId,
  errors,
  disabled,
  onGmailChange,
  onPasswordChange,
}: GmailSectionProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isUpdating, startTransition] = useTransition()
  const [gmail, setGmail] = useState(defaultGmail ?? '')
  const [password, setPassword] = useState(defaultPassword ?? '')

  const handleGmailChange = (value: string) => {
    setGmail(value)
    onGmailChange?.(value)
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    onPasswordChange?.(value)
  }

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

  return (
    <div className="space-y-4" data-testid="gmail-section">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="gmailAccount">
            <Mail className="mr-1 inline h-3.5 w-3.5" />
            Gmail Account
          </FieldLabel>
          <Input
            id="gmailAccount"
            type="email"
            placeholder="client@gmail.com"
            value={gmail}
            onChange={(e) => handleGmailChange(e.target.value)}
            disabled={disabled}
            data-testid="gmail-account-input"
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
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              disabled={disabled}
              className="pr-10"
              data-testid="gmail-password-input"
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

      {clientId && !disabled && (
        <div className="flex justify-end">
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
        </div>
      )}
    </div>
  )
}
