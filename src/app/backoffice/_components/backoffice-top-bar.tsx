'use client'

import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { NotificationDropdown } from '@/components/notification-dropdown'
import { GlobalSearch, SearchTrigger } from '@/components/global-search'

export function BackofficeTopBar() {
  return (
    <header
      data-testid="backoffice-top-bar"
      className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/50 px-4 backdrop-blur-sm md:px-6"
    >
      <div className="flex flex-1 items-center gap-3">
        <SidebarTrigger className="md:hidden" />
        <Separator
          orientation="vertical"
          className="mr-1 h-4 md:hidden"
        />
        <SearchTrigger className="h-9 max-w-md flex-1" />
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-2">
        <NotificationDropdown />
        <Button
          variant="ghost"
          size="icon"
          data-testid="backoffice-settings-btn"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <div className="mx-2 h-6 w-px bg-border" />
        <span className="rounded bg-warning/10 px-2 py-1 font-mono text-xs text-warning">
          BACK OFFICE
        </span>
      </div>
    </header>
  )
}
