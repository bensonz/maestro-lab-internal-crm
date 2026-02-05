'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  UserCog,
  Phone,
  Wallet,
  ClipboardList,
  CheckSquare,
  Receipt,
} from 'lucide-react'

const navItems = [
  { title: 'Overview', href: '/backoffice', icon: LayoutDashboard, exact: true },
  { title: 'Sales Interaction', href: '/backoffice/sales-interaction', icon: ClipboardList },
  { title: 'Client Management', href: '/backoffice/client-management', icon: Users },
  { title: 'Agent Management', href: '/backoffice/agent-management', icon: UserCog },
  { title: 'To-Do List', href: '/backoffice/todo-list', icon: CheckSquare },
  { title: 'Fund Allocation', href: '/backoffice/fund-allocation', icon: Wallet },
  { title: 'Client Settlement', href: '/backoffice/client-settlement', icon: Receipt },
  { title: 'Phone Tracking', href: '/backoffice/phone-tracking', icon: Phone },
]

export function BackofficeNav() {
  const pathname = usePathname()

  return (
    <aside className="flex w-64 flex-col border-r border-slate-800 bg-slate-900">
      <div className="flex h-16 items-center border-b border-slate-800 px-6">
        <h1 className="text-lg font-semibold text-white">Back Office</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-slate-800 p-4">
        <Link href="/" className="text-sm text-slate-400 hover:text-white">
          ← Switch to Agent View
        </Link>
      </div>
    </aside>
  )
}
