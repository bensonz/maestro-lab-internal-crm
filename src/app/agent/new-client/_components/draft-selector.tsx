'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { FileText, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { deleteDraft } from '@/app/actions/drafts'

interface Draft {
  id: string
  formData: Record<string, string>
  updatedAt: Date
}

interface DraftSelectorProps {
  drafts: Draft[]
  currentDraftId?: string
}

export function DraftSelector({ drafts, currentDraftId }: DraftSelectorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (drafts.length === 0) return null

  const handleSelect = (draftId: string) => {
    router.push(`/agent/new-client?draft=${draftId}`)
  }

  const handleDelete = (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation()
    startTransition(async () => {
      await deleteDraft(draftId)
      if (currentDraftId === draftId) {
        router.push('/agent/new-client')
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div
      className="flex items-center gap-3 mb-6"
      data-testid="draft-selector"
    >
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <Badge variant="secondary" className="text-xs">
          {drafts.length} saved draft{drafts.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      <Select
        value={currentDraftId ?? ''}
        onValueChange={handleSelect}
      >
        <SelectTrigger
          className="w-[280px]"
          data-testid="draft-selector-trigger"
        >
          <SelectValue placeholder="Load a saved draft..." />
        </SelectTrigger>
        <SelectContent>
          {drafts.map((draft) => {
            const name =
              [draft.formData?.firstName, draft.formData?.lastName]
                .filter(Boolean)
                .join(' ') || 'Unnamed Client'
            return (
              <SelectItem key={draft.id} value={draft.id}>
                <div className="flex items-center justify-between w-full gap-4">
                  <span>{name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(draft.updatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
      {currentDraftId && (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={(e) => handleDelete(e, currentDraftId)}
          disabled={isPending}
          data-testid="draft-delete-btn"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
