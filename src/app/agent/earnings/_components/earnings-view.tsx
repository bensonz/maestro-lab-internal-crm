'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { TeamDirectoryPanel } from './team-directory-panel'
import { WalletSummaryStrip } from './wallet-summary-strip'
import { LevelProgressCard } from './level-progress-card'
import { PerformancePanel } from './performance-panel'
import type { AgentKPIs } from '@/backend/services/agent-kpis'
import type { HierarchyAgent, HierarchyNode } from '@/backend/data/hierarchy'

function countFourStarInTree(nodes: HierarchyNode[]): number {
  let count = 0
  for (const node of nodes) {
    if (node.starLevel >= 4) count++
    count += countFourStarInTree(node.subordinates)
  }
  return count
}

interface Transaction {
  id: string
  client: string
  description: string
  amount: number
  status: string
  date: string
  rawDate: string
}

interface EarningsData {
  totalEarnings: number
  pendingPayout: number
  thisMonth: number
  recentTransactions: Transaction[]
}

interface EarningsViewProps {
  earnings: EarningsData
  kpis: AgentKPIs
  hierarchy: {
    agent: HierarchyAgent
    supervisorChain: HierarchyAgent[]
    subordinateTree: HierarchyNode
    teamSize: number
  }
}

export function EarningsView({ earnings, kpis, hierarchy }: EarningsViewProps) {
  const { toast } = useToast()

  const fourStarLeaders = countFourStarInTree(hierarchy.subordinateTree.subordinates)
  const available = earnings.totalEarnings - earnings.pendingPayout

  const handleWithdraw = () => {
    toast({
      title: 'Withdrawal Requested',
      description: `Your withdrawal of $${available.toLocaleString()} has been submitted for processing.`,
    })
  }

  return (
    <div className="flex h-full">
      {/* Left Panel - Team Directory */}
      <TeamDirectoryPanel hierarchy={hierarchy} />

      {/* Main Content */}
      <div className="max-w-6xl flex-1 animate-fade-in space-y-5 overflow-y-auto p-6">
        {/* A. Wallet Summary Strip */}
        <WalletSummaryStrip
          available={available}
          totalEarned={earnings.totalEarnings}
          pending={earnings.pendingPayout}
          onWithdraw={handleWithdraw}
        />

        {/* B. Level Progress Card */}
        <LevelProgressCard
          starLevel={hierarchy.agent.starLevel}
          approvedClients={kpis.approvedClients}
          fourStarLeaders={fourStarLeaders}
          teamSize={hierarchy.teamSize}
        />

        {/* C. Earnings Breakdown Table */}
        <Card className="card-terminal" data-testid="earnings-table-card">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-medium">Earnings Breakdown</h3>
              <Badge variant="outline" className="font-mono text-[10px]">
                {earnings.recentTransactions.length} records
              </Badge>
            </div>

            {earnings.recentTransactions.length === 0 ? (
              <p
                className="py-10 text-center text-sm text-muted-foreground"
                data-testid="earnings-empty"
              >
                No earnings recorded yet. Earnings are generated when clients
                are approved.
              </p>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="overflow-x-auto" data-testid="earnings-table">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Client
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Description
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Amount
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Status
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {earnings.recentTransactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className="transition-colors hover:bg-muted/30"
                          data-testid={`earning-row-${tx.id}`}
                        >
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-foreground">
                              {tx.client}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-muted-foreground">
                              {tx.description}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-mono text-sm font-semibold text-success">
                              +${tx.amount.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px]',
                                tx.status === 'Paid'
                                  ? 'border-success/50 bg-success/10 text-success'
                                  : 'border-warning/50 bg-warning/10 text-warning',
                              )}
                            >
                              {tx.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-mono text-xs text-muted-foreground">
                              {tx.date}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* D. Performance Snapshot (Collapsed by Default) */}
        <PerformancePanel kpis={kpis} />
      </div>
    </div>
  )
}
