'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, X, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EditableFieldProps {
  label: string
  value: string
  fieldKey: string
  onSave: (fieldKey: string, oldValue: string, newValue: string) => Promise<void>
  mono?: boolean
}

export function EditableField({ label, value, fieldKey, onSave, mono }: EditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const handleSave = async () => {
    const trimmed = draft.trim()
    if (trimmed === value) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(fieldKey, value, trimmed)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setDraft(value)
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') handleCancel()
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 text-sm" data-testid={`editable-field-${fieldKey}`}>
        <span className="text-muted-foreground">{label}:</span>{' '}
        <input
          ref={inputRef}
          className={cn(
            'h-6 rounded border border-border bg-background px-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary',
            mono && 'font-mono',
          )}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={saving}
          data-testid={`editable-input-${fieldKey}`}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex h-5 w-5 items-center justify-center rounded text-success hover:bg-success/10"
          data-testid={`editable-save-${fieldKey}`}
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          onClick={handleCancel}
          disabled={saving}
          className="inline-flex h-5 w-5 items-center justify-center rounded text-destructive hover:bg-destructive/10"
          data-testid={`editable-cancel-${fieldKey}`}
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <div
      className="-mx-1 cursor-pointer rounded px-1 text-sm transition-colors hover:bg-muted/30"
      onDoubleClick={() => {
        setDraft(value)
        setEditing(true)
      }}
      title="Double-click to edit"
      data-testid={`editable-field-${fieldKey}`}
    >
      <span className="text-muted-foreground">{label}:</span>{' '}
      <span className={mono ? 'font-mono' : undefined}>{value || '\u2014'}</span>
    </div>
  )
}
