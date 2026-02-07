import { cookies } from 'next/headers'
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'
import { BackofficeSidebar } from '@/components/app-sidebar'
import { requireAdmin } from './_require-admin'
import { BackofficeTopBar } from './_components/backoffice-top-bar'

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
        <BackofficeTopBar />
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
