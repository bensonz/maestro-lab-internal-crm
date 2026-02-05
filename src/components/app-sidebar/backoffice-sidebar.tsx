'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { BackofficeNav } from './backoffice-nav'
import { NavUser } from './nav-user'
import { SidebarLogo } from './sidebar-logo'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface BackofficeSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: User
}

export function BackofficeSidebar({ user, ...props }: BackofficeSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarLogo variant="backoffice" />
      </SidebarHeader>
      <SidebarContent>
        <BackofficeNav />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
