'use client'

import { Zap, Shield } from 'lucide-react'
import { useSidebar } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

interface SidebarLogoProps {
  variant?: 'agent' | 'backoffice'
}

export function SidebarLogo({ variant = 'agent' }: SidebarLogoProps) {
  const { open } = useSidebar()

  const isAgent = variant === 'agent'
  const Icon = isAgent ? Zap : Shield
  const title = 'Maestro L.A.B'
  const subtitle = isAgent ? 'Agent Portal' : 'Back Office'
  const accentClass = isAgent ? 'text-primary bg-primary/10' : 'text-accent bg-accent/10'

  return (
    <div className="flex items-center gap-3 px-2">
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          accentClass
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      {open && (
        <div className="flex flex-col">
          <span className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {subtitle}
          </span>
        </div>
      )}
    </div>
  )
}
