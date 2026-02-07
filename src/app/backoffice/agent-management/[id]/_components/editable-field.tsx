'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EditableFieldProps {
  label: string
  value: string
  onSave: (value: string) => void
  isLongText?: boolean
  className?: string
}

export function EditableField({
  label,
  value,
  onSave,
  isLongText = false,
  className,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)

  const handleDoubleClick = () => {
    setEditValue(value)
    setIsEditing(true)
  }

  const handleSave = () => {
    onSave(editValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className={cn('flex items-start gap-2', className)}>
        <span className="shrink-0 text-muted-foreground">{label}:</span>
        <div className="flex flex-1 items-center gap-1">
          {isLongText ? (
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-16 text-xs"
              autoFocus
            />
          ) : (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-6 py-0 text-xs"
              autoFocus
            />
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={handleSave}
            data-testid="editable-field-save"
          >
            <Check className="h-3 w-3 text-success" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={handleCancel}
            data-testid="editable-field-cancel"
          >
            <X className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        '-mx-1 flex cursor-pointer justify-between rounded px-1 transition-colors hover:bg-muted/30',
        className,
      )}
      onDoubleClick={handleDoubleClick}
      title="Double-click to edit"
    >
      <span className="text-muted-foreground">{label}:</span>
      <span className={isLongText ? 'text-xs' : ''}>{value}</span>
    </div>
  )
}
