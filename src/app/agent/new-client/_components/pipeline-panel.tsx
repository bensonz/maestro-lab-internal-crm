'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import {
  Clock,
  CheckCircle2,
  FileText,
  Plus,
  ChevronRight,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface PipelinePanelProps {
  drafts: PrequalDraft[]
  awaitingVerification: PrequalClient[]
  readyForPhase2: PrequalClient[]
  currentClientId?: string
  currentDraftId?: string
}

type TabValue = 'all' | 'drafts' | 'awaiting' | 'ready'

export function PipelinePanel({
  drafts,
  awaitingVerification,
  readyForPhase2,
  currentClientId,
  currentDraftId,
}: PipelinePanelProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filteredDrafts = useMemo(() => {
    if (!search) return drafts
    const q = search.toLowerCase()
    return drafts.filter((d) => {
      const name = [d.formData?.firstName, d.formData?.lastName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const gmail = (d.formData?.gmailAccount ?? '').toLowerCase()
      return name.includes(q) || gmail.includes(q)
    })
  }, [drafts, search])

  const filteredAwaiting = useMemo(() => {
    if (!search) return awaitingVerification
    const q = search.toLowerCase()
    return awaitingVerification.filter((c) => {
      const name = `${c.firstName} ${c.lastName}`.toLowerCase()
      const gmail = (c.gmailAccount ?? '').toLowerCase()
      return name.includes(q) || gmail.includes(q)
    })
  }, [awaitingVerification, search])

  const filteredReady = useMemo(() => {
    if (!search) return readyForPhase2
    const q = search.toLowerCase()
    return readyForPhase2.filter((c) => {
      const name = `${c.firstName} ${c.lastName}`.toLowerCase()
      const gmail = (c.gmailAccount ?? '').toLowerCase()
      return name.includes(q) || gmail.includes(q)
    })
  }, [readyForPhase2, search])

  const allCount =
    filteredDrafts.length + filteredAwaiting.length + filteredReady.length
  const hasNoResults = search && allCount === 0

  return (
    <div
      className="flex h-full flex-col border-r border-border bg-card"
      data-testid="pipeline-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Pipeline</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => router.push('/agent/new-client')}
          data-testid="pipeline-new-btn"
        >
          <Plus className="mr-1 h-3 w-3" />
          New
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name or gmail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
            data-testid="pipeline-search"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="flex min-h-0 flex-1 flex-col">
        <div className="px-3">
          <TabsList className="h-8 w-full">
            <TabsTrigger value="all" className="text-[11px]">
              All
              {allCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {allCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="drafts" className="text-[11px]">
              Drafts
              {filteredDrafts.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {filteredDrafts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="awaiting" className="text-[11px]">
              Awaiting
              {filteredAwaiting.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {filteredAwaiting.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ready" className="text-[11px]">
              Ready
              {filteredReady.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {filteredReady.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          {hasNoResults && (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">
              No matches for &lsquo;{search}&rsquo;
            </p>
          )}

          <TabsContent value="all" className="mt-0 px-2 py-1">
            {allCount === 0 && !search && (
              <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                No clients yet
              </p>
            )}
            <SectionItems
              title="Drafts"
              variant="muted"
              items={filteredDrafts}
              currentDraftId={currentDraftId}
              router={router}
              type="draft"
            />
            <SectionItems
              title="Awaiting Verification"
              variant="warning"
              items={filteredAwaiting}
              currentClientId={currentClientId}
              router={router}
              type="awaiting"
            />
            <SectionItems
              title="Ready for Phase 2"
              variant="success"
              items={filteredReady}
              currentClientId={currentClientId}
              router={router}
              type="ready"
            />
          </TabsContent>

          <TabsContent value="drafts" className="mt-0 px-2 py-1">
            {filteredDrafts.length === 0 && !search && (
              <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                No drafts
              </p>
            )}
            <SectionItems
              variant="muted"
              items={filteredDrafts}
              currentDraftId={currentDraftId}
              router={router}
              type="draft"
            />
          </TabsContent>

          <TabsContent value="awaiting" className="mt-0 px-2 py-1">
            {filteredAwaiting.length === 0 && !search && (
              <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                No clients awaiting verification
              </p>
            )}
            <SectionItems
              variant="warning"
              items={filteredAwaiting}
              currentClientId={currentClientId}
              router={router}
              type="awaiting"
            />
          </TabsContent>

          <TabsContent value="ready" className="mt-0 px-2 py-1">
            {filteredReady.length === 0 && !search && (
              <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                No clients ready for Phase 2
              </p>
            )}
            <SectionItems
              variant="success"
              items={filteredReady}
              currentClientId={currentClientId}
              router={router}
              type="ready"
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}

function SectionItems({
  title,
  variant,
  items,
  currentDraftId,
  currentClientId,
  router,
  type,
}: {
  title?: string
  variant: 'muted' | 'warning' | 'success'
  items: (PrequalDraft | PrequalClient)[]
  currentDraftId?: string
  currentClientId?: string
  router: ReturnType<typeof useRouter>
  type: 'draft' | 'awaiting' | 'ready'
}) {
  if (items.length === 0) return null

  const accentClass = {
    muted: 'bg-muted-foreground',
    warning: 'bg-warning',
    success: 'bg-success',
  }[variant]

  const badgeClass = {
    muted: 'bg-muted text-muted-foreground',
    warning: 'bg-warning/15 text-warning border-warning/30',
    success: 'bg-success/15 text-success border-success/30',
  }[variant]

  const icon = {
    draft: <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />,
    awaiting: <Clock className="h-3.5 w-3.5 shrink-0 text-warning" />,
    ready: <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />,
  }[type]

  return (
    <div className="space-y-0.5 py-1">
      {title && (
        <div className="flex items-center gap-2 px-2 pb-1 pt-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          <Badge variant="outline" className={cn('text-[10px] h-4', badgeClass)}>
            {items.length}
          </Badge>
        </div>
      )}
      {items.map((item) => {
        const isDraft = type === 'draft'
        const draft = isDraft ? (item as PrequalDraft) : null
        const client = !isDraft ? (item as PrequalClient) : null

        const name = isDraft
          ? [draft!.formData?.firstName, draft!.formData?.lastName]
              .filter(Boolean)
              .join(' ') || 'Unnamed'
          : `${client!.firstName} ${client!.lastName}`

        const sublabel = isDraft
          ? draft!.formData?.gmailAccount
          : (client!.gmailAccount ?? undefined)

        const active = isDraft
          ? currentDraftId === item.id
          : currentClientId === item.id

        const onClick = () => {
          if (isDraft) {
            router.push(`/agent/new-client?draft=${item.id}`)
          } else {
            router.push(`/agent/new-client?client=${item.id}`)
          }
        }

        return (
          <button
            key={item.id}
            type="button"
            onClick={onClick}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
              active
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-muted/50 text-foreground',
            )}
            data-testid={`pipeline-item-${item.id}`}
          >
            <div
              className={cn('h-6 w-0.5 rounded-full shrink-0', accentClass)}
            />
            {icon}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{name}</p>
              {sublabel && (
                <p className="truncate text-[10px] text-muted-foreground">
                  {sublabel}
                </p>
              )}
            </div>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(item.updatedAt), {
                addSuffix: true,
              })}
            </span>
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          </button>
        )
      })}
    </div>
  )
}
