import { cookies } from 'next/headers'
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'
import { AgentSidebar } from '@/components/app-sidebar'
import { requireAgent } from './_require-agent'
import { AgentTopBar } from './_components/agent-top-bar'

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
        <AgentTopBar />
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
