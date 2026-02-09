'use client'

import Link from 'next/link'
import { Bell, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

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
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="agent-notifications-btn"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
        </Button>
        <Button asChild data-testid="new-client-btn">
          <Link href="/agent/new-client">
            <Plus className="h-4 w-4" />
            New User
          </Link>
        </Button>
      </div>
    </header>
  )
}
