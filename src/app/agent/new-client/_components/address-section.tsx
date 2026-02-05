'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { MapPin } from 'lucide-react'

interface AddressSectionProps {
  errors?: Record<string, string[]>
  defaultValues?: {
    primaryAddress?: string
    primaryCity?: string
    primaryState?: string
    primaryZip?: string
    hasSecondAddress?: boolean
    secondaryAddress?: string
    secondaryCity?: string
    secondaryState?: string
    secondaryZip?: string
  }
}

function FormError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null
  return <p className="mt-1.5 text-sm text-destructive">{errors[0]}</p>
}

export function AddressSection({
  errors,
  defaultValues = {},
}: AddressSectionProps) {
  const [hasSecondAddress, setHasSecondAddress] = useState(
    defaultValues.hasSecondAddress ?? false
  )

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary/20 to-chart-3/20 ring-1 ring-primary/20">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="font-display text-lg font-semibold text-foreground">
              Address Information
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Primary and secondary addresses for the client
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary Address */}
        <div className="space-y-4">
          <p className="text-sm font-medium text-foreground">Primary Address</p>
          <div className="space-y-2">
            <Label htmlFor="primaryAddress" className="text-sm font-medium text-foreground">
              Street Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="primaryAddress"
              name="primaryAddress"
              defaultValue={defaultValues.primaryAddress}
              className="h-11 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80"
              placeholder="123 Main Street, Apt 4B"
            />
            <FormError errors={errors?.primaryAddress} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="primaryCity" className="text-sm font-medium text-foreground">
                City <span className="text-destructive">*</span>
              </Label>
              <Input
                id="primaryCity"
                name="primaryCity"
                defaultValue={defaultValues.primaryCity}
                className="h-11 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80"
                placeholder="Austin"
              />
              <FormError errors={errors?.primaryCity} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryState" className="text-sm font-medium text-foreground">
                State <span className="text-destructive">*</span>
              </Label>
              <Input
                id="primaryState"
                name="primaryState"
                defaultValue={defaultValues.primaryState}
                className="h-11 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80"
                placeholder="TX"
              />
              <FormError errors={errors?.primaryState} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryZip" className="text-sm font-medium text-foreground">
                ZIP Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="primaryZip"
                name="primaryZip"
                defaultValue={defaultValues.primaryZip}
                className="h-11 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80"
                placeholder="78701"
              />
              <FormError errors={errors?.primaryZip} />
            </div>
          </div>
        </div>

        {/* Secondary Address Toggle */}
        <div className="flex items-center space-x-3 rounded-lg border border-border/50 bg-muted/20 p-4">
          <Checkbox
            id="hasSecondAddress"
            name="hasSecondAddress"
            checked={hasSecondAddress}
            onCheckedChange={(checked) => setHasSecondAddress(checked === true)}
            value="true"
          />
          <Label
            htmlFor="hasSecondAddress"
            className="text-sm font-medium text-foreground cursor-pointer"
          >
            Client has a second address
          </Label>
        </div>

        {/* Secondary Address - Conditionally Shown */}
        {hasSecondAddress && (
          <div className="space-y-4 animate-fade-in-up">
            <p className="text-sm font-medium text-foreground">Secondary Address</p>
            <div className="space-y-2">
              <Label
                htmlFor="secondaryAddress"
                className="text-sm font-medium text-foreground"
              >
                Street Address
              </Label>
              <Input
                id="secondaryAddress"
                name="secondaryAddress"
                defaultValue={defaultValues.secondaryAddress}
                className="h-11 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80"
                placeholder="456 Oak Avenue"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label
                  htmlFor="secondaryCity"
                  className="text-sm font-medium text-foreground"
                >
                  City
                </Label>
                <Input
                  id="secondaryCity"
                  name="secondaryCity"
                  defaultValue={defaultValues.secondaryCity}
                  className="h-11 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80"
                  placeholder="Houston"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="secondaryState"
                  className="text-sm font-medium text-foreground"
                >
                  State
                </Label>
                <Input
                  id="secondaryState"
                  name="secondaryState"
                  defaultValue={defaultValues.secondaryState}
                  className="h-11 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80"
                  placeholder="TX"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="secondaryZip"
                  className="text-sm font-medium text-foreground"
                >
                  ZIP Code
                </Label>
                <Input
                  id="secondaryZip"
                  name="secondaryZip"
                  defaultValue={defaultValues.secondaryZip}
                  className="h-11 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80"
                  placeholder="77001"
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
