'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Phone, Wallet, FileCheck, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { checkOverdueClients } from '@/app/actions/status'

const actions = [
  {
    label: 'Issue Phone',
    icon: Phone,
    iconColor: 'text-primary',
    href: '/backoffice/phone-tracking',
    action: null as string | null,
  },
  {
    label: 'Allocate Funds',
    icon: Wallet,
    iconColor: 'text-success',
    href: '/backoffice/fund-allocation',
    action: null as string | null,
  },
  {
    label: 'Review Docs',
    icon: FileCheck,
    iconColor: 'text-warning',
    href: '/backoffice/sales-interaction',
    action: null as string | null,
  },
  {
    label: 'Check Overdue',
    icon: TrendingUp,
    iconColor: 'text-primary',
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
    <Card className="card-terminal" data-testid="quick-actions">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((item) =>
            item.href ? (
              <Button
                key={item.label}
                variant="outline"
                className="h-auto flex-col items-center gap-2 py-4"
                asChild
              >
                <Link href={item.href}>
                  <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                  <span className="text-xs">{item.label}</span>
                </Link>
              </Button>
            ) : (
              <Button
                key={item.label}
                variant="outline"
                className="h-auto flex-col items-center gap-2 py-4"
                onClick={() => handleAction(item.action)}
                disabled={isPending}
              >
                <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                <span className="text-xs">
                  {isPending && item.action === 'checkOverdue'
                    ? 'Checking...'
                    : item.label}
                </span>
              </Button>
            ),
          )}
        </div>
      </CardContent>
    </Card>
  )
}
