'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard,
  Users,
  UserCog,
  Phone,
  Wallet,
  ClipboardList,
  CheckSquare,
  Receipt,
  LogOut,
  ChevronUp,
} from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  role: string
}

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

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function BackofficeNav({ user }: { user: User }) {
  const pathname = usePathname()

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

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

      {/* User section */}
      <div className="border-t border-slate-800 p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-800 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-emerald-600 text-white text-xs">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
              <ChevronUp className="h-4 w-4 text-slate-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-red-400 focus:bg-slate-800 focus:text-red-400"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
