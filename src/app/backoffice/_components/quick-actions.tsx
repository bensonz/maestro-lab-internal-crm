'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Phone, DollarSign, FileText, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { checkOverdueClients } from '@/app/actions/status'

const actions = [
  {
    label: 'Issue Phone',
    icon: Phone,
    href: '/backoffice/phone-tracking',
    action: null as string | null,
  },
  {
    label: 'Allocate Funds',
    icon: DollarSign,
    href: '/backoffice/fund-allocation',
    action: null as string | null,
  },
  {
    label: 'Review Docs',
    icon: FileText,
    href: '/backoffice/sales-interaction',
    action: null as string | null,
  },
  {
    label: 'Check Overdue',
    icon: AlertTriangle,
    href: null,
    action: 'checkOverdue' as string | null,
  },
]

export function QuickActions() {
  const [isPending, startTransition] = useTransition()

  const handleCheckOverdue = () => {
    startTransition(async () => {
      const result = await checkOverdueClients()
      if (result.success) {
        if (result.marked > 0) {
          toast.warning(
            `${result.marked} client${result.marked !== 1 ? 's' : ''} marked as delayed`,
          )
        } else {
          toast.success('All clients on track — no overdue deadlines')
        }
      } else {
        toast.error(result.error || 'Failed to check overdue clients')
      }
    })
  }

  const handleAction = (action: string | null) => {
    if (action === 'checkOverdue') {
      handleCheckOverdue()
    }
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-muted/30 ring-1 ring-border/30 transition-all hover:bg-muted/50 hover:ring-primary/30 hover:scale-[1.02]"
              >
                <item.icon className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {item.label}
                </span>
              </Link>
            ) : (
              <button
                key={item.label}
                onClick={() => handleAction(item.action)}
                disabled={isPending}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-muted/30 ring-1 ring-border/30 transition-all hover:bg-muted/50 hover:ring-primary/30 hover:scale-[1.02] disabled:opacity-50"
              >
                <item.icon className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {isPending && item.action === 'checkOverdue'
                    ? 'Checking...'
                    : item.label}
                </span>
              </button>
            ),
          )}
        </div>
      </CardContent>
    </Card>
  )
}
