'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Lock } from 'lucide-react'

interface BasicInfoSectionProps {
  isIdConfirmed: boolean
  errors?: Record<string, string[]>
  defaultValues?: {
    firstName?: string
    middleName?: string
    lastName?: string
    dateOfBirth?: string
    phone?: string
    email?: string
  }
}

function FormError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null
  return <p className="mt-1.5 text-sm text-destructive">{errors[0]}</p>
}

export function BasicInfoSection({
  isIdConfirmed,
  errors,
  defaultValues = {},
}: BasicInfoSectionProps) {
  return (
    <div className="space-y-5">
      {isIdConfirmed && (
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
          >
            <Lock className="mr-1 h-3 w-3" />
            Locked from ID
          </Badge>
          <span className="text-xs text-muted-foreground">
            ID-verified fields are locked
          </span>
        </div>
      )}
        {/* Name Fields */}
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="space-y-2">
            <Label
              htmlFor="firstName"
              className="text-sm font-medium text-foreground"
            >
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="firstName"
              name="firstName"
              defaultValue={defaultValues.firstName}
              readOnly={isIdConfirmed}
              className={`h-11 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80 ${
                isIdConfirmed ? 'opacity-70 cursor-not-allowed bg-muted/50' : ''
              }`}
              placeholder="John"
            />
            <FormError errors={errors?.firstName} />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="middleName"
              className="text-sm font-medium text-foreground"
            >
              Middle Name{' '}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="middleName"
              name="middleName"
              defaultValue={defaultValues.middleName}
              readOnly={isIdConfirmed}
              className={`h-11 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80 ${
                isIdConfirmed ? 'opacity-70 cursor-not-allowed bg-muted/50' : ''
              }`}
              placeholder="Michael"
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="lastName"
              className="text-sm font-medium text-foreground"
            >
              Last Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lastName"
              name="lastName"
              defaultValue={defaultValues.lastName}
              readOnly={isIdConfirmed}
              className={`h-11 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80 ${
                isIdConfirmed ? 'opacity-70 cursor-not-allowed bg-muted/50' : ''
              }`}
              placeholder="Doe"
            />
            <FormError errors={errors?.lastName} />
          </div>
        </div>

        {/* Date of Birth */}
        <div className="space-y-2">
          <Label
            htmlFor="dateOfBirth"
            className="text-sm font-medium text-foreground"
          >
            Date of Birth
          </Label>
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            defaultValue={defaultValues.dateOfBirth}
            readOnly={isIdConfirmed}
            className={`h-11 w-full rounded-xl border-border/50 bg-input px-4 text-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80 sm:w-48 ${
              isIdConfirmed ? 'opacity-70 cursor-not-allowed bg-muted/50' : ''
            }`}
          />
        </div>

        {/* Contact Fields - Always Editable */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label
              htmlFor="phone"
              className="text-sm font-medium text-foreground"
            >
              Phone Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={defaultValues.phone}
              className="h-11 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80"
              placeholder="(555) 000-0000"
            />
            <FormError errors={errors?.phone} />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-sm font-medium text-foreground"
            >
              Email{' '}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={defaultValues.email}
              className="h-11 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80"
              placeholder="john@example.com"
            />
            <FormError errors={errors?.email} />
          </div>
        </div>
    </div>
  )
}
