'use client'

import { useState } from 'react'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { PanelLeft } from 'lucide-react'
import { PipelinePanel } from './pipeline-panel'

interface PrequalDraft {
  id: string
  formData: Record<string, string>
  updatedAt: Date
}

interface PrequalClient {
  id: string
  firstName: string
  lastName: string
  gmailAccount: string | null
  updatedAt: Date
  betmgmStatus: string
}

interface PipelineData {
  drafts: PrequalDraft[]
  awaitingVerification: PrequalClient[]
  readyForPhase2: PrequalClient[]
}

interface NewClientLayoutProps {
  pipelineData: PipelineData
  currentClientId?: string
  currentDraftId?: string
  children: React.ReactNode
}

export function NewClientLayout({
  pipelineData,
  currentClientId,
  currentDraftId,
  children,
}: NewClientLayoutProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  const pipelinePanel = (
    <PipelinePanel
      drafts={pipelineData.drafts}
      awaitingVerification={pipelineData.awaitingVerification}
      readyForPhase2={pipelineData.readyForPhase2}
      currentClientId={currentClientId}
      currentDraftId={currentDraftId}
    />
  )

  return (
    <div className="h-[calc(100vh-4rem)]" data-testid="new-client-layout">
      {/* Desktop: side-by-side resizable panels */}
      <div className="hidden h-full lg:flex">
        <ResizablePanelGroup
          orientation="horizontal"
          id="new-client-panels"
        >
          <ResizablePanel
            id="pipeline"
            defaultSize={25}
            minSize={18}
            maxSize={35}
          >
            {pipelinePanel}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel id="form" defaultSize={75}>
            <div className="relative h-full">
              <div className="h-full overflow-y-auto">{children}</div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile: Sheet for pipeline, full-width form */}
      <div className="flex h-full flex-col lg:hidden">
        <div className="flex items-center border-b border-border px-3 py-2">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                data-testid="pipeline-sheet-trigger"
              >
                <PanelLeft className="mr-1 h-4 w-4" />
                Pipeline
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SheetTitle className="sr-only">Pipeline</SheetTitle>
              {pipelinePanel}
            </SheetContent>
          </Sheet>
        </div>
        <div className="relative min-h-0 flex-1">
          <div className="h-full overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  )
}
