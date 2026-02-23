'use client'

import { useState } from 'react'
import { Plus, FileText, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { createClientDraft, deleteClientDraft } from '@/app/actions/client-drafts'
import { toast } from 'sonner'

interface DraftItem {
  id: string
  firstName: string | null
  lastName: string | null
  step: number
  updatedAt: string
  status: string
}

interface DraftsPanelProps {
  drafts: DraftItem[]
  selectedDraftId: string | null
  onSelect: (draftId: string) => void
  onCreated: (draftId: string) => void
}

export function DraftsPanel({
  drafts,
  selectedDraftId,
  onSelect,
  onCreated,
}: DraftsPanelProps) {
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleCreate() {
    setCreating(true)
    try {
      const result = await createClientDraft()
      if (result.success && result.draftId) {
        toast.success('Draft created')
        onCreated(result.draftId)
      } else {
        toast.error(result.error ?? 'Failed to create draft')
      }
    } catch {
      toast.error('Failed to create draft')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(e: React.MouseEvent, draftId: string) {
    e.stopPropagation()
    setDeletingId(draftId)
    try {
      const result = await deleteClientDraft(draftId)
      if (result.success) {
        toast.success('Draft deleted')
      } else {
        toast.error(result.error ?? 'Failed to delete draft')
      }
    } catch {
      toast.error('Failed to delete draft')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div
      className="hidden w-56 min-w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex"
      data-testid="drafts-panel"
    >
      <div className="border-b p-3">
        <Button
          size="sm"
          className="w-full"
          onClick={handleCreate}
          disabled={creating}
          data-testid="new-draft-button"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {creating ? 'Creating...' : 'New Draft'}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {drafts.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No drafts yet
            </p>
          )}
          {drafts.map((draft) => (
            <button
              key={draft.id}
              onClick={() => onSelect(draft.id)}
              className={cn(
                'flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent',
                selectedDraftId === draft.id && 'bg-accent',
              )}
              data-testid={`draft-item-${draft.id}`}
            >
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {draft.firstName && draft.lastName
                    ? `${draft.firstName} ${draft.lastName}`
                    : 'Untitled Draft'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Step {draft.step}/4 &middot;{' '}
                  {new Date(draft.updatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <button
                onClick={(e) => handleDelete(e, draft.id)}
                disabled={deletingId === draft.id}
                className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 [button:hover>&]:opacity-100"
                data-testid={`delete-draft-${draft.id}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
