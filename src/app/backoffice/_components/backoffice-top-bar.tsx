'use client'

import { Bell, Search, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

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
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients, tasks, phone numbers..."
            className="h-9 border-border bg-muted/50 pl-9"
            data-testid="backoffice-search-input"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="backoffice-notifications-btn"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-warning" />
        </Button>
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
