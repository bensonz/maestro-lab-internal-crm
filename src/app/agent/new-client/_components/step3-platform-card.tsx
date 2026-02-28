'use client'

import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import type { PlatformEntry } from '@/types/backend-types'

interface PlatformCardProps {
  platform: string
  displayName: string
  category: 'sports' | 'financial'
  entry: PlatformEntry
  onChange: (updated: PlatformEntry) => void
}

export function PlatformCard({
  platform,
  displayName,
  category,
  entry,
  onChange,
}: PlatformCardProps) {
  function handleChange(field: keyof PlatformEntry, value: string) {
    onChange({ ...entry, [field]: value })
  }

  return (
    <div
      className="rounded-md border p-3 space-y-2"
      data-testid={`platform-card-${platform}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{displayName}</span>
        <Badge variant={category === 'financial' ? 'secondary' : 'outline'} className="text-[10px]">
          {category}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field>
          <FieldLabel htmlFor={`${platform}-username`} className="text-xs">
            Username
          </FieldLabel>
          <Input
            id={`${platform}-username`}
            value={entry.username || ''}
            onChange={(e) => handleChange('username', e.target.value)}
            placeholder="Username"
            className="h-8 text-sm"
            data-testid={`platform-username-${platform}`}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={`${platform}-accountId`} className="text-xs">
            Account ID
          </FieldLabel>
          <Input
            id={`${platform}-accountId`}
            value={entry.accountId || ''}
            onChange={(e) => handleChange('accountId', e.target.value)}
            placeholder="Account ID"
            className="h-8 text-sm"
            data-testid={`platform-account-id-${platform}`}
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor={`${platform}-screenshot`} className="text-xs">
          Screenshot
        </FieldLabel>
        <Input
          id={`${platform}-screenshot`}
          value={entry.screenshot || ''}
          onChange={(e) => handleChange('screenshot', e.target.value)}
          placeholder="Upload path or URL"
          className="h-8 text-sm"
          data-testid={`platform-screenshot-${platform}`}
        />
      </Field>
    </div>
  )
}
