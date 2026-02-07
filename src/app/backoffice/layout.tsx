import { cookies } from 'next/headers'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { BackofficeSidebar } from '@/components/app-sidebar'
import { requireAdmin } from './_require-admin'

const SIDEBAR_COOKIE_NAME = 'sidebar_state'

export default async function BackofficeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAdmin()

  // Read the sidebar state from cookie server-side
  const cookieStore = await cookies()
  const sidebarState = cookieStore.get(SIDEBAR_COOKIE_NAME)
  const defaultOpen = sidebarState?.value !== 'false'

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <BackofficeSidebar user={user} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/50 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium text-muted-foreground">
            Maestro L.A.B — Back Office
          </span>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
