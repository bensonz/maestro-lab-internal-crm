'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Image, Eye, EyeOff } from 'lucide-react'

interface EditCredentialModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  currentUsername?: string
  currentPassword?: string
  currentPin?: string
  uploadedImageUrl?: string
  editCount: number
  onSave: (data: {
    username?: string
    password?: string
    pin?: string
  }) => void
  type: 'bankCredentials' | 'bankPin'
}

export function EditCredentialModal({
  open,
  onOpenChange,
  title,
  currentUsername,
  currentPassword,
  currentPin,
  uploadedImageUrl,
  editCount,
  onSave,
  type,
}: EditCredentialModalProps) {
  const [username, setUsername] = useState(currentUsername || '')
  const [password, setPassword] = useState(currentPassword || '')
  const [pin, setPin] = useState(currentPin || '')
  const [showPassword, setShowPassword] = useState(false)
  const [showPin, setShowPin] = useState(false)

  const handleSave = () => {
    if (type === 'bankPin') {
      onSave({ pin })
    } else {
      onSave({ username, password })
    }
    onOpenChange(false)
  }

  const isPinChanged = type === 'bankPin' && pin !== '2580'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {type === 'bankCredentials' && uploadedImageUrl && (
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="mb-2 flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
                <Image className="h-3 w-3" />
                Uploaded Screenshot
              </p>
              <div className="flex aspect-video items-center justify-center rounded bg-muted/40">
                <img
                  src={uploadedImageUrl}
                  alt="Bank Screenshot"
                  className="max-h-full max-w-full rounded object-contain"
                />
              </div>
            </div>
          )}

          {type === 'bankCredentials' && (
            <>
              <div>
                <label className="text-xs text-muted-foreground">
                  Detected Username
                </label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 bg-background font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Detected Password
                </label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {type === 'bankPin' && (
            <div>
              <label className="text-xs text-muted-foreground">Bank PIN</label>
              <div className="relative mt-1">
                <Input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={4}
                  className="bg-background pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPin ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Suggested: 2580
              </p>
              {isPinChanged && (
                <div className="mt-2 flex items-center gap-2 text-xs text-warning">
                  <AlertTriangle className="h-3 w-3" />
                  <span>
                    Non-default PIN will be flagged for backoffice review
                  </span>
                </div>
              )}
            </div>
          )}

          {editCount > 0 && (
            <div className="flex items-center gap-2 rounded border border-warning/30 bg-muted/20 p-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <div className="text-xs">
                <p className="font-medium text-warning">
                  Previous edits: {editCount}
                </p>
                <p className="text-muted-foreground">
                  All edits are logged in Event Timeline
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
