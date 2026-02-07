'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import {
  updateUser,
  resetUserPassword,
  toggleUserActive,
} from '@/app/actions/user-management'
import { toast } from 'sonner'

interface UserData {
  id: string
  name: string
  email: string
  role: string
  phone: string
  isActive: boolean
}

interface EditUserDialogProps {
  user: UserData
  currentUserRole: string
  currentUserId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ROLE_OPTIONS = [
  { value: 'AGENT', label: 'Agent' },
  { value: 'BACKOFFICE', label: 'Backoffice' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'FINANCE', label: 'Finance' },
]

export function EditUserDialog({
  user,
  currentUserRole,
  currentUserId,
  open,
  onOpenChange,
}: EditUserDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const router = useRouter()

  const availableRoles =
    currentUserRole === 'ADMIN'
      ? ROLE_OPTIONS
      : ROLE_OPTIONS.filter((r) => r.value === 'AGENT')

  const isSelf = currentUserId === user.id
  const canToggleActive = currentUserRole === 'ADMIN' && !isSelf

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const errors: Record<string, string> = {}
    if (!form.get('name')?.toString().trim()) errors.name = 'Name is required'
    if (!form.get('email')?.toString().trim())
      errors.email = 'Email is required'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setError(null)
    startTransition(async () => {
      const result = await updateUser(user.id, form)
      if (result.success) {
        toast.success('User updated successfully')
        onOpenChange(false)
        router.refresh()
      } else {
        setError(result.error || 'Failed to update user')
      }
    })
  }

  function handleResetPassword() {
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    startTransition(async () => {
      const result = await resetUserPassword(user.id, newPassword)
      if (result.success) {
        toast.success('Password reset successfully')
        setShowResetPassword(false)
        setNewPassword('')
      } else {
        toast.error(result.error || 'Failed to reset password')
      }
    })
  }

  function handleToggleActive() {
    startTransition(async () => {
      const result = await toggleUserActive(user.id)
      if (result.success) {
        toast.success(
          `User ${user.isActive ? 'deactivated' : 'activated'} successfully`,
        )
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to toggle user status')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="edit-user-dialog">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="edit-name">Full Name</FieldLabel>
            <Input
              id="edit-name"
              name="name"
              defaultValue={user.name}
              required
              data-testid="edit-user-name"
            />
            <FieldError>{fieldErrors.name}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="edit-email">Email Address</FieldLabel>
            <Input
              id="edit-email"
              name="email"
              type="email"
              defaultValue={user.email}
              required
              data-testid="edit-user-email"
            />
            <FieldError>{fieldErrors.email}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="edit-role">Role</FieldLabel>
            <Select name="role" defaultValue={user.role} disabled={isSelf}>
              <SelectTrigger data-testid="edit-user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSelf && (
              <p className="text-xs text-muted-foreground">
                Cannot change your own role
              </p>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="edit-phone">Phone</FieldLabel>
            <Input
              id="edit-phone"
              name="phone"
              defaultValue={user.phone}
              data-testid="edit-user-phone"
            />
          </Field>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full"
            data-testid="edit-user-submit"
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>

        {/* Divider */}
        <div className="border-t border-border/50 pt-4 mt-2 space-y-3">
          {/* Reset Password */}
          {showResetPassword ? (
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="New password (min 8 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                data-testid="reset-password-input"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetPassword}
                disabled={isPending}
                data-testid="reset-password-confirm"
              >
                Reset
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowResetPassword(false)
                  setNewPassword('')
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowResetPassword(true)}
              data-testid="reset-password-btn"
            >
              Reset Password
            </Button>
          )}

          {/* Toggle Active */}
          {canToggleActive && (
            <Button
              variant={user.isActive ? 'destructive' : 'default'}
              size="sm"
              className="w-full"
              onClick={handleToggleActive}
              disabled={isPending}
              data-testid="toggle-active-btn"
            >
              {user.isActive ? 'Deactivate User' : 'Activate User'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
