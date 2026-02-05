'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export default function NewClientPage() {
  return (
    <div className="p-6 text-white">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Start Your Application</h1>
        <p className="text-slate-400">Application Kickstart — Internal Pre-Screen & Review</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* ID Upload */}
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader>
              <CardTitle className="text-white">ID Upload & Verification</CardTitle>
              <p className="text-sm text-slate-400">Required before entering client information</p>
            </CardHeader>
            <CardContent>
              <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-slate-700 bg-slate-800/50">
                <div className="text-center">
                  <p className="text-slate-400">Click to upload ID document</p>
                  <p className="text-xs text-slate-500">Passport, State ID, or Driver&apos;s License</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader>
              <CardTitle className="text-white">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-400">First Name</Label>
                  <Input className="border-slate-700 bg-slate-800 text-white" placeholder="From ID scan" />
                </div>
                <div>
                  <Label className="text-slate-400">Middle Name</Label>
                  <Input className="border-slate-700 bg-slate-800 text-white" placeholder="From ID scan" />
                </div>
                <div>
                  <Label className="text-slate-400">Last Name</Label>
                  <Input className="border-slate-700 bg-slate-800 text-white" placeholder="From ID scan" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-400">Date of Birth</Label>
                  <Input className="border-slate-700 bg-slate-800 text-white" type="date" />
                </div>
                <div>
                  <Label className="text-slate-400">Phone Number *</Label>
                  <Input className="border-slate-700 bg-slate-800 text-white" placeholder="(555) 000-0000" />
                </div>
                <div>
                  <Label className="text-slate-400">Email (optional)</Label>
                  <Input className="border-slate-700 bg-slate-800 text-white" placeholder="client@email.com" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader>
              <CardTitle className="text-white">Address Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-400">Primary Address *</Label>
                <Input className="border-slate-700 bg-slate-800 text-white" placeholder="Street address" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-400">City</Label>
                  <Input className="border-slate-700 bg-slate-800 text-white" />
                </div>
                <div>
                  <Label className="text-slate-400">State</Label>
                  <Input className="border-slate-700 bg-slate-800 text-white" />
                </div>
                <div>
                  <Label className="text-slate-400">ZIP</Label>
                  <Input className="border-slate-700 bg-slate-800 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Compliance Review */}
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader>
              <CardTitle className="text-white">Client Background & Compliance Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-slate-800 p-3">
                <span className="text-slate-300">Group A — Quick Assessment</span>
                <span className="text-slate-500">›</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-800 p-3">
                <span className="text-slate-300">Group B — Identity & Documents</span>
                <span className="text-slate-500">›</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-800 p-3">
                <span className="text-slate-300">Group C — Behavior History</span>
                <span className="text-slate-500">›</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-800 p-3">
                <span className="text-slate-300">Group D — Authorization & Risk</span>
                <span className="text-slate-500">›</span>
              </div>
            </CardContent>
          </Card>

          {/* How do we know this client */}
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader>
              <CardTitle className="text-white">How do we know this client?</CardTitle>
              <p className="text-sm text-slate-400">Internal trust assessment — not client-facing</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-400">Who introduced this client?</Label>
                <Input className="border-slate-700 bg-slate-800 text-white" placeholder="Name of referrer or source" />
              </div>
              <div>
                <Label className="text-slate-400">How was the client met?</Label>
                <Input className="border-slate-700 bg-slate-800 text-white" placeholder="e.g., Referral, Direct inquiry, Event, Online" />
              </div>
              <div>
                <Label className="text-slate-400">What does the client do professionally?</Label>
                <Input className="border-slate-700 bg-slate-800 text-white" placeholder="Profession or occupation" />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button variant="outline" className="flex-1 border-slate-700 text-slate-300">
              Save Draft
            </Button>
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              Submit & Start Application
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
