'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UsersRound,
  UserPlus,
  DollarSign,
  CheckSquare,
  Settings,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  exact?: boolean
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/agent', icon: LayoutDashboard, exact: true },
  { title: 'My Clients', href: '/agent/clients', icon: Users },
  { title: 'New Client', href: '/agent/new-client', icon: UserPlus },
  { title: 'Earnings', href: '/agent/earnings', icon: DollarSign },
  { title: 'My Team', href: '/agent/team', icon: UsersRound },
  { title: 'Action Hub', href: '/agent/todo-list', icon: CheckSquare },
  { title: 'Settings', href: '/agent/settings', icon: Settings },
]

export function AgentNav() {
  const pathname = usePathname()

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarMenu>
        {navItems.map((item) => {
          const active = isActive(item)
          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                <Link
                  href={item.href}
                  className={cn(
                    active &&
                      'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
                  )}
                >
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
