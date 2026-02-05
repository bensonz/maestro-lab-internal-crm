import { cookies } from 'next/headers'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { AgentSidebar } from '@/components/app-sidebar'
import { requireAgent } from './_require-agent'

const SIDEBAR_COOKIE_NAME = 'sidebar_state'

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAgent()

  // Read the sidebar state from cookie server-side
  const cookieStore = await cookies()
  const sidebarState = cookieStore.get(SIDEBAR_COOKIE_NAME)
  const defaultOpen = sidebarState?.value !== 'false'

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AgentSidebar user={user} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/50 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium text-muted-foreground">
            Agent Portal
          </span>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
