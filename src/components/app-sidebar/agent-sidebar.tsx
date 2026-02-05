'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { AgentNav } from './agent-nav'
import { NavUser } from './nav-user'
import { SidebarLogo } from './sidebar-logo'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface AgentSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: User
}

export function AgentSidebar({ user, ...props }: AgentSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarLogo variant="agent" />
      </SidebarHeader>
      <SidebarContent>
        <AgentNav />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} settingsHref="/agent/settings" />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
