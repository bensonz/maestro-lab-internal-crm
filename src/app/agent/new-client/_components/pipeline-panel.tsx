'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PHASE_SHORT_LABELS } from '@/lib/client-phase'

interface PipelineClient {
  id: string
  firstName: string
  lastName: string
}

interface PipelineDraft {
  id: string
  formData: Record<string, string>
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

  // Merge drafts into Phase 1 section
  const draftItems = drafts.map((d) => ({
    id: d.id,
    name:
      [d.formData?.firstName, d.formData?.lastName].filter(Boolean).join(' ') ||
      'Unnamed',
    isDraft: true,
  }))

  const phase1Items = [
    ...draftItems,
    ...phase1.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      isDraft: false,
    })),
  ]

  const phases = [
    { phase: 4, label: PHASE_SHORT_LABELS[4], items: phase4.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, isDraft: false })) },
    { phase: 3, label: PHASE_SHORT_LABELS[3], items: phase3.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, isDraft: false })) },
    { phase: 2, label: PHASE_SHORT_LABELS[2], items: phase2.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, isDraft: false })) },
    { phase: 1, label: PHASE_SHORT_LABELS[1], items: phase1Items },
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
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.isDraft) {
                          router.push(`/agent/new-client?draft=${item.id}`)
                        } else {
                          router.push(`/agent/new-client?client=${item.id}`)
                        }
                      }}
                      className={cn(
                        'flex w-full items-center rounded-md px-3 py-1.5 text-left text-xs transition-colors',
                        active
                          ? 'bg-primary/10 font-medium text-primary'
                          : 'text-foreground hover:bg-muted/50',
                      )}
                      data-testid={`pipeline-item-${item.id}`}
                    >
                      <span className="truncate">{item.name}</span>
                    </button>
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
