'use client'

import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface EditableTextProps {
  label: string
  value: string | null
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  mono?: boolean
}

export function EditableText({ label, value, onChange, placeholder, className, mono }: EditableTextProps) {
  return (
    <div className={className}>
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <Input
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label}
        className={cn('h-7 text-xs', mono && 'font-mono')}
        data-testid={`edit-${label.toLowerCase().replace(/\s+/g, '-')}`}
      />
    </div>
  )
}

interface EditableDateProps {
  label: string
  value: string | null
  onChange: (value: string | null) => void
  className?: string
}

export function EditableDate({ label, value, onChange, className }: EditableDateProps) {
  // Convert ISO string to YYYY-MM-DD for input
  const dateValue = value ? new Date(value).toISOString().split('T')[0] : ''

  return (
    <div className={className}>
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <Input
        type="date"
        value={dateValue}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
        className="h-7 text-xs"
        data-testid={`edit-${label.toLowerCase().replace(/\s+/g, '-')}`}
      />
    </div>
  )
}

interface EditableCheckboxProps {
  label: string
  checked: boolean | null
  onChange: (checked: boolean) => void
  className?: string
}

export function EditableCheckbox({ label, checked, onChange, className }: EditableCheckboxProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Checkbox
        checked={checked ?? false}
        onCheckedChange={(v) => onChange(v === true)}
        data-testid={`edit-${label.toLowerCase().replace(/\s+/g, '-')}`}
      />
      <span className="text-xs">{label}</span>
    </div>
  )
}

interface EditableSelectProps {
  label: string
  value: string | null
  onChange: (value: string) => void
  options: { label: string; value: string }[]
  className?: string
}

export function EditableSelect({ label, value, onChange, options, className }: EditableSelectProps) {
  return (
    <div className={className}>
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        data-testid={`edit-${label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
