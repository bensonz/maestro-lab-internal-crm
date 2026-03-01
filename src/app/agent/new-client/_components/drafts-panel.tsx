'use client'

import { useState, useMemo } from 'react'
import { Trash2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
  idDocument: string | null
}

interface DraftsPanelProps {
  drafts: DraftItem[]
  selectedDraftId: string | null
  onSelect: (draftId: string) => void
  onCreated: (draftId: string) => void
}

const STEP_LABELS = ['Step 1', 'Step 2', 'Step 3', 'Step 4'] as const

function getDraftName(draft: DraftItem): string {
  if (draft.firstName && draft.lastName) return `${draft.firstName} ${draft.lastName}`
  if (draft.firstName) return draft.firstName
  return 'Untitled'
}

export function DraftsPanel({
  drafts,
  selectedDraftId,
  onSelect,
  onCreated,
}: DraftsPanelProps) {
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Group drafts by step
  const grouped = useMemo(() => {
    const groups: Record<number, DraftItem[]> = { 1: [], 2: [], 3: [], 4: [] }
    for (const draft of drafts) {
      const step = Math.min(Math.max(draft.step, 1), 4)
      groups[step].push(draft)
    }
    // Sort each group by updatedAt descending
    for (const key of Object.keys(groups)) {
      groups[Number(key)].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    }
    return groups
  }, [drafts])

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
      <div className="border-b border-sidebar-border p-4">
        <Button
          size="sm"
          className="w-full"
          onClick={handleCreate}
          disabled={creating}
          data-testid="new-draft-button"
        >
          {creating ? 'Creating...' : 'New Draft'}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {drafts.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No drafts yet
            </p>
          )}

          {drafts.length > 0 && (
            <>
              <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">By Step</p>
              {STEP_LABELS.map((label, i) => {
            const stepNum = i + 1
            const stepDrafts = grouped[stepNum]
            if (stepDrafts.length === 0) return null

            return (
              <Collapsible key={stepNum} defaultOpen>
                <div className="mb-1">
                  <CollapsibleTrigger className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors group">
                    <ChevronRight className="h-3 w-3 transition-transform group-data-[state=open]:rotate-90" />
                    {label}
                    <span className="ml-auto font-mono text-[10px]">{stepDrafts.length}</span>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="space-y-0.5 pb-1">
                      {stepDrafts.map((draft) => (
                        <div
                          key={draft.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => onSelect(draft.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(draft.id) } }}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent group/item cursor-pointer',
                            selectedDraftId === draft.id && 'bg-accent',
                          )}
                          data-testid={`draft-item-${draft.id}`}
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {getDraftName(draft)}
                          </span>
                          {!draft.idDocument && (
                            <button
                              onClick={(e) => handleDelete(e, draft.id)}
                              disabled={deletingId === draft.id}
                              className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/item:opacity-100"
                              data-testid={`delete-draft-${draft.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )
          })}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
