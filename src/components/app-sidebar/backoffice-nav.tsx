'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserCog,
  Phone,
  Wallet,
  ClipboardList,
  CheckSquare,
  Receipt,
  DollarSign,
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
  {
    title: 'Overview',
    href: '/backoffice',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    title: 'Sales Interaction',
    href: '/backoffice/sales-interaction',
    icon: ClipboardList,
  },
  {
    title: 'Client Management',
    href: '/backoffice/client-management',
    icon: Users,
  },
  {
    title: 'Agent Management',
    href: '/backoffice/agent-management',
    icon: UserCog,
  },
  { title: 'Tasks', href: '/backoffice/todo-list', icon: CheckSquare },
  {
    title: 'Fund Allocation',
    href: '/backoffice/fund-allocation',
    icon: Wallet,
  },
  {
    title: 'Commissions',
    href: '/backoffice/commissions',
    icon: DollarSign,
  },
  {
    title: 'Client Settlement',
    href: '/backoffice/client-settlement',
    icon: Receipt,
  },
  { title: 'Phone Tracking', href: '/backoffice/phone-tracking', icon: Phone },
]

export function BackofficeNav() {
  const pathname = usePathname()

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Management</SidebarGroupLabel>
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
                      'bg-accent text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground',
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
