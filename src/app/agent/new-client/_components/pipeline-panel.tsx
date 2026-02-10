'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { PHASE_SHORT_LABELS } from '@/lib/client-phase'
import { deleteDraft } from '@/app/actions/drafts'

interface PipelineClient {
  id: string
  firstName: string
  lastName: string
}

interface PipelineDraft {
  id: string
  formData: Record<string, string>
  phase: number
}

interface PipelinePanelProps {
  drafts: PipelineDraft[]
  phase1: PipelineClient[]
  phase2: PipelineClient[]
  phase3: PipelineClient[]
  phase4: PipelineClient[]
  currentClientId?: string
  currentDraftId?: string
}

export function PipelinePanel({
  drafts,
  phase1,
  phase2,
  phase3,
  phase4,
  currentClientId,
  currentDraftId,
}: PipelinePanelProps) {
  const router = useRouter()
  const [isDeleting, startDeleteTransition] = useTransition()

  const handleDeleteDraft = (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation()
    startDeleteTransition(async () => {
      const result = await deleteDraft(draftId)
      if (result.success) {
        toast.success('Draft deleted')
        if (currentDraftId === draftId) {
          router.push('/agent/new-client')
        } else {
          router.refresh()
        }
      } else {
        toast.error('Failed to delete draft')
      }
    })
  }

  // Convert drafts to display items grouped by phase
  const draftsByPhase: Record<number, { id: string; name: string; isDraft: true }[]> = {}
  for (const d of drafts) {
    const phase = d.phase ?? 1
    if (!draftsByPhase[phase]) draftsByPhase[phase] = []
    draftsByPhase[phase].push({
      id: d.id,
      name:
        [d.formData?.firstName, d.formData?.lastName].filter(Boolean).join(' ') ||
        'Unnamed',
      isDraft: true,
    })
  }

  const toItems = (clients: PipelineClient[], phase: number) => [
    ...(draftsByPhase[phase] ?? []),
    ...clients.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      isDraft: false as const,
    })),
  ]

  const phases = [
    { phase: 4, label: PHASE_SHORT_LABELS[4], items: toItems(phase4, 4) },
    { phase: 3, label: PHASE_SHORT_LABELS[3], items: toItems(phase3, 3) },
    { phase: 2, label: PHASE_SHORT_LABELS[2], items: toItems(phase2, 2) },
    { phase: 1, label: PHASE_SHORT_LABELS[1], items: toItems(phase1, 1) },
  ]

  return (
    <div
      className="flex h-full flex-col border-r border-sidebar-border bg-sidebar"
      data-testid="pipeline-panel"
    >
      {/* Header */}
      <div className="border-b border-sidebar-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Pipeline</h3>
      </div>

      {/* Phase sections */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-2 py-1">
          {phases.map(({ phase, label, items }) => (
            <PhaseSection
              key={phase}
              label={label}
              count={items.length}
              defaultOpen
            >
              {items.length === 0 ? (
                <p className="px-3 py-2 text-[10px] text-muted-foreground">
                  No clients
                </p>
              ) : (
                items.map((item) => {
                  const active = item.isDraft
                    ? currentDraftId === item.id
                    : currentClientId === item.id

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'group flex w-full items-center rounded-md px-3 py-1.5 text-left text-xs transition-colors',
                        active
                          ? 'bg-primary/10 font-medium text-primary'
                          : 'text-foreground hover:bg-muted/50',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (item.isDraft) {
                            router.push(`/agent/new-client?draft=${item.id}`)
                          } else {
                            router.push(`/agent/new-client?client=${item.id}`)
                          }
                        }}
                        className="flex-1 truncate text-left"
                        data-testid={`pipeline-item-${item.id}`}
                      >
                        {item.name}
                      </button>
                      {item.isDraft && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteDraft(e, item.id)}
                          disabled={isDeleting}
                          className="ml-1 shrink-0 rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-destructive"
                          data-testid={`draft-delete-${item.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </PhaseSection>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

function PhaseSection({
  label,
  count,
  defaultOpen,
  children,
}: {
  label: string
  count: number
  defaultOpen: boolean
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-1">
      <CollapsibleTrigger asChild>
        <button className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/50">
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span className="ml-auto rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {count}
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-0.5 pb-1">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}
