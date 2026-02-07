'use client'

import { useState, useCallback } from 'react'
import { Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const LONG_FIELDS = [
  'address',
  'primaryaddress',
  'secondaryaddress',
  'paypaladdress',
  'bankaddress',
  'edgeboostaddress',
]

function isLongField(fieldName: string): boolean {
  return LONG_FIELDS.some((f) =>
    fieldName.toLowerCase().includes(f.toLowerCase()),
  )
}

interface EditableFieldProps {
  value: string
  fieldKey: string
  mono?: boolean
  className?: string
  onSave?: (fieldKey: string, oldValue: string, newValue: string) => void
}

export function EditableField({
  value,
  fieldKey,
  mono = false,
  className = '',
  onSave,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)

  const handleDoubleClick = useCallback(() => {
    setEditValue(value)
    setIsEditing(true)
  }, [value])

  const handleSave = useCallback(() => {
    if (onSave && editValue !== value) {
      onSave(fieldKey, value, editValue)
    }
    setIsEditing(false)
  }, [onSave, fieldKey, value, editValue])

  const handleCancel = useCallback(() => {
    setEditValue(value)
    setIsEditing(false)
  }, [value])

  const isLong = isLongField(fieldKey)

  if (isEditing) {
    return (
      <div
        className={cn(
          'flex items-start gap-1',
          isLong ? 'w-full flex-col' : '',
        )}
      >
        {isLong ? (
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="min-h-[80px] w-full px-2 py-1 text-sm"
            autoFocus
          />
        ) : (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-6 w-32 px-2 text-sm"
            autoFocus
          />
        )}
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleSave}
            data-testid={`save-edit-${fieldKey}`}
          >
            <Save className="h-3.5 w-3.5 text-success" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleCancel}
            data-testid={`cancel-edit-${fieldKey}`}
          >
            <X className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <span
      className={cn(
        'cursor-pointer rounded px-0.5 hover:bg-muted/50',
        mono && 'font-mono',
        className,
      )}
      onDoubleClick={handleDoubleClick}
      title="Double-click to edit"
    >
      {value}
    </span>
  )
}
