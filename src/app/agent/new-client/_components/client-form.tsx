'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { createClient, ActionState } from '@/app/actions/clients'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="btn-glow group h-12 w-full rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/30 transition-all duration-300 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/40 disabled:opacity-50"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Submitting...
        </>
      ) : (
        <>
          Submit Application
          <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </>
      )}
    </Button>
  )
}

function FormError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null
  return (
    <p className="mt-1.5 text-sm text-destructive">{errors[0]}</p>
  )
}

const initialState: ActionState = {}

export function ClientForm() {
  const [state, formAction] = useActionState(createClient, initialState)

  return (
    <form action={formAction}>
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left Column - Form */}
        <div className="space-y-6 lg:col-span-3">
          {/* Basic Information */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in-up">
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-lg font-semibold text-foreground">
                Client Information
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter the client&apos;s basic details
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium text-foreground">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    className="h-11 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80"
                    placeholder="John"
                  />
                  <FormError errors={state.errors?.firstName} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium text-foreground">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    className="h-11 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80"
                    placeholder="Doe"
                  />
                  <FormError errors={state.errors?.lastName} />
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                    Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    className="h-11 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80"
                    placeholder="(555) 000-0000"
                  />
                  <FormError errors={state.errors?.phone} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    className="h-11 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80"
                    placeholder="john@example.com"
                  />
                  <FormError errors={state.errors?.email} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-lg font-semibold text-foreground">
                Application Notes
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Internal notes about this client (not visible to client)
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                id="notes"
                name="notes"
                className="min-h-[120px] rounded-xl border-border/50 bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80 resize-none"
                placeholder="Add any relevant notes about this client..."
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Info & Submit */}
        <div className="space-y-6 lg:col-span-2">
          {/* What happens next */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <CardHeader className="pb-4">
              <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary/20 to-chart-3/20 ring-1 ring-primary/20">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="font-display text-lg font-semibold text-foreground">
                What happens next?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary ring-1 ring-primary/20">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Client record created</p>
                  <p className="text-xs text-muted-foreground">Status set to PENDING</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary ring-1 ring-primary/20">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Platform accounts initialized</p>
                  <p className="text-xs text-muted-foreground">11 platforms ready to configure</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-chart-4/15 ring-1 ring-chart-4/20">
                  <CheckCircle2 className="h-3.5 w-3.5 text-chart-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Begin onboarding</p>
                  <p className="text-xs text-muted-foreground">Start the client journey</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Message */}
          {state.message && (
            <Card className="border-destructive/50 bg-destructive/10 animate-fade-in-up">
              <CardContent className="py-4">
                <p className="text-sm font-medium text-destructive">{state.message}</p>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <SubmitButton />
          </div>
        </div>
      </div>
    </form>
  )
}
