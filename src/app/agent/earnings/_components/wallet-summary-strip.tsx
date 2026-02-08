'use client'

import { Wallet, TrendingUp, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WalletSummaryStripProps {
  available: number
  totalEarned: number
  pending: number
  onWithdraw?: () => void
}

export function WalletSummaryStrip({
  available,
  totalEarned,
  pending,
  onWithdraw,
}: WalletSummaryStripProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4" data-testid="wallet-summary">
      <div className="flex items-center justify-between">
        {/* Main Amount - Available to Withdraw */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/20">
              <Wallet className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Available to Withdraw
              </p>
              <p
                className="font-mono text-2xl font-bold text-success"
                data-testid="available-balance"
              >
                ${available.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-12 w-px bg-border" />

          {/* Secondary Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">
                  Total Earned
                </p>
                <p
                  className="font-mono text-lg font-semibold"
                  data-testid="total-earned"
                >
                  ${totalEarned.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">
                  Pending
                </p>
                <p
                  className="font-mono text-lg font-semibold text-warning"
                  data-testid="pending-payout"
                >
                  ${pending.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Withdraw Button */}
        <Button
          onClick={onWithdraw}
          disabled={available <= 0}
          className="bg-success text-white hover:bg-success/90"
          data-testid="withdraw-btn"
        >
          Request Withdrawal
        </Button>
      </div>
    </div>
  )
}
