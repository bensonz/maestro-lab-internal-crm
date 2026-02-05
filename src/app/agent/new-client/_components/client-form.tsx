'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { createClient, ActionState } from '@/app/actions/clients'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
    >
      {pending ? 'Submitting...' : 'Submit & Start Application'}
    </Button>
  )
}

function FormError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null
  return (
    <p className="mt-1 text-sm text-red-400">{errors[0]}</p>
  )
}

const initialState: ActionState = {}

export function ClientForm() {
  const [state, formAction] = useActionState(createClient, initialState)

  return (
    <form action={formAction}>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Basic Information */}
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader>
              <CardTitle className="text-white">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-slate-400">
                    First Name *
                  </Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    className="border-slate-700 bg-slate-800 text-white"
                    placeholder="Enter first name"
                  />
                  <FormError errors={state.errors?.firstName} />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-slate-400">
                    Last Name *
                  </Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    className="border-slate-700 bg-slate-800 text-white"
                    placeholder="Enter last name"
                  />
                  <FormError errors={state.errors?.lastName} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone" className="text-slate-400">
                    Phone Number *
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    className="border-slate-700 bg-slate-800 text-white"
                    placeholder="(555) 000-0000"
                  />
                  <FormError errors={state.errors?.phone} />
                </div>
                <div>
                  <Label htmlFor="email" className="text-slate-400">
                    Email (optional)
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    className="border-slate-700 bg-slate-800 text-white"
                    placeholder="client@email.com"
                  />
                  <FormError errors={state.errors?.email} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader>
              <CardTitle className="text-white">Application Notes</CardTitle>
              <p className="text-sm text-slate-400">
                Internal notes about the client (not client-facing)
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                id="notes"
                name="notes"
                className="min-h-[100px] border-slate-700 bg-slate-800 text-white"
                placeholder="Any relevant notes about this client..."
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Info Card */}
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader>
              <CardTitle className="text-white">What happens next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-slate-400">
              <p>After submitting this application:</p>
              <ol className="list-inside list-decimal space-y-2">
                <li>Client record will be created in PENDING status</li>
                <li>11 platform accounts will be initialized</li>
                <li>You can begin the onboarding process</li>
              </ol>
            </CardContent>
          </Card>

          {/* General Error Message */}
          {state.message && (
            <Card className="border-red-800 bg-red-900/20">
              <CardContent className="py-4">
                <p className="text-red-400">{state.message}</p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <SubmitButton />
          </div>
        </div>
      </div>
    </form>
  )
}
