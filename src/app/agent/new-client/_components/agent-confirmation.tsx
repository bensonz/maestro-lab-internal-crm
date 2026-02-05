'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ShieldAlert } from 'lucide-react'

interface AgentConfirmationProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  error?: string
}

export function AgentConfirmation({
  checked,
  onCheckedChange,
  error,
}: AgentConfirmationProps) {
  return (
    <Card
      className={`border-border/50 bg-card/80 backdrop-blur-sm ${
        error ? 'border-destructive/50' : ''
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary/20 to-chart-4/20 ring-1 ring-primary/20">
            <ShieldAlert className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="agentConfirmsSuitable"
                name="agentConfirmsSuitable"
                checked={checked}
                onCheckedChange={(val) => onCheckedChange(val === true)}
                value="true"
                className="mt-0.5"
              />
              <Label
                htmlFor="agentConfirmsSuitable"
                className="text-sm font-medium leading-relaxed text-foreground cursor-pointer"
              >
                I confirm that I have reviewed all information provided by this
                client, verified their identity documents, and believe they are a
                suitable candidate for onboarding. I understand that submitting
                this application initiates the compliance review process.
              </Label>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
