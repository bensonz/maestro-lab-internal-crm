'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Phone, DollarSign, FileText, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'

const actions = [
  {
    label: 'Issue Phone',
    icon: Phone,
    href: '/backoffice/phone-tracking',
  },
  {
    label: 'Allocate Funds',
    icon: DollarSign,
    href: '/backoffice/fund-allocation',
  },
  {
    label: 'Review Docs',
    icon: FileText,
    href: '/backoffice/sales-interaction',
  },
  {
    label: 'View Reports',
    icon: BarChart3,
    href: null, // Coming soon
  },
]

export function QuickActions() {
  const handleComingSoon = () => {
    toast.info('Reports feature coming soon')
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) =>
            action.href ? (
              <Link
                key={action.label}
                href={action.href}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-muted/30 ring-1 ring-border/30 transition-all hover:bg-muted/50 hover:ring-primary/30 hover:scale-[1.02]"
              >
                <action.icon className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {action.label}
                </span>
              </Link>
            ) : (
              <button
                key={action.label}
                onClick={handleComingSoon}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-muted/30 ring-1 ring-border/30 transition-all hover:bg-muted/50 hover:ring-primary/30 hover:scale-[1.02]"
              >
                <action.icon className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {action.label}
                </span>
              </button>
            )
          )}
        </div>
      </CardContent>
    </Card>
  )
}
