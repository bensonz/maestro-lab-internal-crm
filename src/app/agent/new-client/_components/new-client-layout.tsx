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
import { PanelLeft, Shield } from 'lucide-react'
import { PipelinePanel } from './pipeline-panel'

interface PipelineClient {
  id: string
  firstName: string
  lastName: string
  intakeStatus: string
}

interface PipelineDraft {
  id: string
  formData: Record<string, string>
  phase: number
}

interface PipelineData {
  drafts: PipelineDraft[]
  phase1: PipelineClient[]
  phase2: PipelineClient[]
  phase3: PipelineClient[]
  phase4: PipelineClient[]
}

interface NewClientLayoutProps {
  pipelineData: PipelineData
  currentClientId?: string
  currentDraftId?: string
  children: React.ReactNode
  riskPanel?: React.ReactNode
}

export function NewClientLayout({
  pipelineData,
  currentClientId,
  currentDraftId,
  children,
  riskPanel,
}: NewClientLayoutProps) {
  const [pipelineSheetOpen, setPipelineSheetOpen] = useState(false)
  const [riskSheetOpen, setRiskSheetOpen] = useState(false)

  const pipelinePanel = (
    <PipelinePanel
      drafts={pipelineData.drafts}
      phase1={pipelineData.phase1}
      phase2={pipelineData.phase2}
      phase3={pipelineData.phase3}
      phase4={pipelineData.phase4}
      currentClientId={currentClientId}
      currentDraftId={currentDraftId}
    />
  )

  return (
    <div className="h-[calc(100vh-4rem)]" data-testid="new-client-layout">
      {/* Desktop: Fixed sidebar + 2-panel resizable layout */}
      <div className="hidden h-full lg:flex">
        {/* Fixed pipeline sidebar */}
        <div className="w-56 min-w-56 shrink-0">
          {pipelinePanel}
        </div>

        {/* Form + Risk Panel resizable */}
        <ResizablePanelGroup
          orientation="horizontal"
          id="new-client-panels"
        >
          <ResizablePanel id="form" defaultSize="78%" minSize="50%">
            <div className="relative h-full">
              <div className="h-full overflow-y-auto">{children}</div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            id="risk"
            defaultSize="22%"
            minSize="12%"
            maxSize="35%"
            collapsible
            collapsedSize="0%"
          >
            {riskPanel}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile: Sheets for pipeline and risk panel */}
      <div className="flex h-full flex-col lg:hidden">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <Sheet open={pipelineSheetOpen} onOpenChange={setPipelineSheetOpen}>
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

          <Sheet open={riskSheetOpen} onOpenChange={setRiskSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                data-testid="risk-sheet-trigger"
              >
                <Shield className="mr-1 h-4 w-4" />
                Risk
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <SheetTitle className="sr-only">Risk Panel</SheetTitle>
              {riskPanel}
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
