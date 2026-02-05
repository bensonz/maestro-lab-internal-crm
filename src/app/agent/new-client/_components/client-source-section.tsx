'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Users } from 'lucide-react'

interface ClientSourceData {
  introducedBy: string
  howMet: string
  profession: string
  isReliable: string
  previouslyFlagged: string
  additionalNotes: string
}

interface ClientSourceSectionProps {
  onChange: (data: ClientSourceData) => void
  defaultValues?: Partial<ClientSourceData>
}

export function ClientSourceSection({
  onChange,
  defaultValues = {},
}: ClientSourceSectionProps) {
  const [data, setData] = useState<ClientSourceData>({
    introducedBy: defaultValues.introducedBy ?? '',
    howMet: defaultValues.howMet ?? '',
    profession: defaultValues.profession ?? '',
    isReliable: defaultValues.isReliable ?? '',
    previouslyFlagged: defaultValues.previouslyFlagged ?? '',
    additionalNotes: defaultValues.additionalNotes ?? '',
  })

  const updateField = (field: keyof ClientSourceData, value: string) => {
    const newData = { ...data, [field]: value }
    setData(newData)
    onChange(newData)
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-chart-2/20 to-chart-3/20 ring-1 ring-chart-2/20">
            <Users className="h-5 w-5 text-chart-2" />
          </div>
          <div>
            <CardTitle className="font-display text-lg font-semibold text-foreground">
              How do we know this client?
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Source and relationship information
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Introduced By */}
        <div className="space-y-2">
          <Label
            htmlFor="introducedBy"
            className="text-sm font-medium text-foreground"
          >
            Introduced by (Referral Source)
          </Label>
          <Input
            id="introducedBy"
            value={data.introducedBy}
            onChange={(e) => updateField('introducedBy', e.target.value)}
            className="h-11 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80"
            placeholder="Name of person who referred this client"
          />
        </div>

        {/* How Met */}
        <div className="space-y-2">
          <Label htmlFor="howMet" className="text-sm font-medium text-foreground">
            How did we meet this client?
          </Label>
          <Input
            id="howMet"
            value={data.howMet}
            onChange={(e) => updateField('howMet', e.target.value)}
            className="h-11 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80"
            placeholder="e.g., Friend of existing client, event, online, etc."
          />
        </div>

        {/* Profession */}
        <div className="space-y-2">
          <Label
            htmlFor="profession"
            className="text-sm font-medium text-foreground"
          >
            Client&apos;s Profession
          </Label>
          <Input
            id="profession"
            value={data.profession}
            onChange={(e) => updateField('profession', e.target.value)}
            className="h-11 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80"
            placeholder="e.g., Software Engineer, Teacher, Self-employed"
          />
        </div>

        {/* Is Reliable */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">
            Based on initial assessment, is this client reliable?
          </Label>
          <RadioGroup
            value={data.isReliable}
            onValueChange={(value) => updateField('isReliable', value)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="reliable-yes" />
              <Label
                htmlFor="reliable-yes"
                className="cursor-pointer text-chart-4"
              >
                Yes
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="reliable-no" />
              <Label
                htmlFor="reliable-no"
                className="cursor-pointer text-destructive"
              >
                No
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="unknown" id="reliable-unknown" />
              <Label
                htmlFor="reliable-unknown"
                className="cursor-pointer text-muted-foreground"
              >
                Unknown
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Previously Flagged */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">
            Has this client been previously flagged or rejected?
          </Label>
          <RadioGroup
            value={data.previouslyFlagged}
            onValueChange={(value) => updateField('previouslyFlagged', value)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="flagged-no" />
              <Label
                htmlFor="flagged-no"
                className="cursor-pointer text-chart-4"
              >
                No
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="flagged-yes" />
              <Label
                htmlFor="flagged-yes"
                className="cursor-pointer text-destructive"
              >
                Yes
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="unknown" id="flagged-unknown" />
              <Label
                htmlFor="flagged-unknown"
                className="cursor-pointer text-muted-foreground"
              >
                Unknown
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Additional Notes */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            Additional Notes
          </Label>
          <Textarea
            value={data.additionalNotes}
            onChange={(e) => updateField('additionalNotes', e.target.value)}
            placeholder="Any other relevant information about this client's background..."
            className="min-h-[100px] rounded-xl border-border/50 bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80 resize-none"
          />
        </div>
      </CardContent>
    </Card>
  )
}
