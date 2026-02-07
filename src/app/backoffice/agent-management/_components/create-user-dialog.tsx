'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus } from 'lucide-react'
import { createUser } from '@/app/actions/user-management'
import { toast } from 'sonner'

interface CreateUserDialogProps {
  currentUserRole: string
}

const ROLE_OPTIONS = [
  { value: 'AGENT', label: 'Agent' },
  { value: 'BACKOFFICE', label: 'Backoffice' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'FINANCE', label: 'Finance' },
]

export function CreateUserDialog({ currentUserRole }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const router = useRouter()

  const availableRoles =
    currentUserRole === 'ADMIN'
      ? ROLE_OPTIONS
      : ROLE_OPTIONS.filter((r) => r.value === 'AGENT')

  function validate(form: FormData): Record<string, string> {
    const errors: Record<string, string> = {}
    const name = form.get('name') as string
    const email = form.get('email') as string
    const password = form.get('password') as string
    const confirmPassword = form.get('confirmPassword') as string
    const role = form.get('role') as string

    if (!name?.trim()) errors.name = 'Name is required'
    if (!email?.trim()) errors.email = 'Email is required'
    if (!password || password.length < 8) errors.password = 'Min 8 characters'
    if (password !== confirmPassword)
      errors.confirmPassword = 'Passwords do not match'
    if (!role) errors.role = 'Role is required'
    return errors
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const errors = validate(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setError(null)
    startTransition(async () => {
      const result = await createUser(form)
      if (result.success) {
        toast.success('User created successfully')
        setOpen(false)
        router.refresh()
      } else {
        setError(result.error || 'Failed to create user')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="create-user-button">
          <Plus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="create-user-dialog">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="name">Full Name</FieldLabel>
            <Input
              id="name"
              name="name"
              required
              data-testid="create-user-name"
            />
            <FieldError>{fieldErrors.name}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="email">Email Address</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              required
              data-testid="create-user-email"
            />
            <FieldError>{fieldErrors.email}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              data-testid="create-user-password"
            />
            <FieldError>{fieldErrors.password}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              data-testid="create-user-confirm-password"
            />
            <FieldError>{fieldErrors.confirmPassword}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="role">Role</FieldLabel>
            <Select name="role" required>
              <SelectTrigger data-testid="create-user-role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{fieldErrors.role}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="phone">Phone (optional)</FieldLabel>
            <Input id="phone" name="phone" data-testid="create-user-phone" />
          </Field>

          {error && (
            <p
              className="text-sm text-destructive"
              data-testid="create-user-error"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full"
            data-testid="create-user-submit"
          >
            {isPending ? 'Creating...' : 'Create Account'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
