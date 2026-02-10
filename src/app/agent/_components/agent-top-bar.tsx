'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { NotificationDropdown } from '@/components/notification-dropdown'
import { GlobalSearch, SearchTrigger } from '@/components/global-search'

export function AgentTopBar() {
  return (
    <header
      data-testid="agent-top-bar"
      className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/50 px-4 backdrop-blur-sm md:px-6"
    >
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden" />
        <Separator orientation="vertical" className="mr-1 h-4 md:hidden" />
        <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
        <span className="hidden text-xs text-muted-foreground font-mono sm:inline">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <SearchTrigger variant="icon" />
        <GlobalSearch />
        <NotificationDropdown />
        <Button asChild data-testid="new-client-btn">
          <Link href="/agent/new-client">
            <Plus className="h-4 w-4" />
            New Client
          </Link>
        </Button>
      </div>
    </header>
  )
}
