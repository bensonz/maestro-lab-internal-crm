'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DollarSign, Users, TrendingUp, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ReportExportDropdown } from './report-export-dropdown'

interface PartnerRow {
  partnerId: string
  partnerName: string
  partnerType: string
  grossTotal: number
  feeTotal: number
  partnerTotal: number
  companyTotal: number
  transactionCount: number
  pendingAmount: number
  paidAmount: number
}

interface AgentRow {
  agentId: string
  agentName: string
  starLevel: number
  tier: string
  directTotal: number
  starSliceTotal: number
  backfillTotal: number
  overrideTotal: number
  totalEarned: number
  pendingAmount: number
  paidAmount: number
  poolCount: number
}

interface ClientRow {
  clientId: string
  clientName: string
  agentName: string
  partnerName: string | null
  daysSinceCreated: number
  totalDeposited: number
  totalWithdrawn: number
  netFlow: number
  commissionCost: number
  ltv: number
  monthlyLTV: number
}

interface PartnerReport {
  byPartner: PartnerRow[]
  totals: {
    gross: number
    fees: number
    partnerShare: number
    companyShare: number
    count: number
  }
}

interface AgentReport {
  byAgent: AgentRow[]
  totals: {
    totalEarned: number
    totalDirect: number
    totalOverride: number
    totalPending: number
    count: number
  }
}

interface LTVReport {
  clients: ClientRow[]
  totals: {
    totalLTV: number
    avgLTV: number
    totalDeposited: number
    totalWithdrawn: number
    totalCommissionCost: number
    clientCount: number
  }
}

interface ReportsViewProps {
  partnerReport: PartnerReport
  agentReport: AgentReport
  ltvReport: LTVReport
}

function formatMoney(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatMoneyDecimal(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function StarBadge({ level }: { level: number }) {
  if (level === 0)
    return (
      <Badge variant="outline" className="text-xs">
        Rookie
      </Badge>
    )
  return (
    <Badge variant="outline" className="text-xs gap-0.5">
      {level}
      <Star className="h-3 w-3 fill-current" />
    </Badge>
  )
}

function SummaryCard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card className="card-terminal" data-testid={`summary-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono">{value}</div>
      </CardContent>
    </Card>
  )
}

export function ReportsView({
  partnerReport,
  agentReport,
  ltvReport,
}: ReportsViewProps) {
  return (
    <div className="space-y-6" data-testid="reports-view">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Financial and performance reports
          </p>
        </div>
        <ReportExportDropdown />
      </div>

      <Tabs defaultValue="partner-profit" data-testid="reports-tabs">
        <TabsList>
          <TabsTrigger value="partner-profit" data-testid="tab-partner-profit">
            Partner Profit
          </TabsTrigger>
          <TabsTrigger
            value="agent-commission"
            data-testid="tab-agent-commission"
          >
            Agent Commission
          </TabsTrigger>
          <TabsTrigger value="client-ltv" data-testid="tab-client-ltv">
            Client LTV
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Partner Profit ── */}
        <TabsContent value="partner-profit" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard
              title="Gross Volume"
              value={formatMoney(partnerReport.totals.gross)}
              icon={DollarSign}
            />
            <SummaryCard
              title="Total Fees"
              value={formatMoney(partnerReport.totals.fees)}
              icon={DollarSign}
            />
            <SummaryCard
              title="Partner Payouts"
              value={formatMoney(partnerReport.totals.partnerShare)}
              icon={Users}
            />
            <SummaryCard
              title="Company Retained"
              value={formatMoney(partnerReport.totals.companyShare)}
              icon={TrendingUp}
            />
          </div>

          <Card className="card-terminal">
            <CardContent className="pt-6">
              <Table data-testid="partner-profit-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Txns</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Fees</TableHead>
                    <TableHead className="text-right">Partner Share</TableHead>
                    <TableHead className="text-right">Company Share</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partnerReport.byPartner.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center text-muted-foreground py-8"
                      >
                        No partner profit data
                      </TableCell>
                    </TableRow>
                  ) : (
                    partnerReport.byPartner
                      .sort((a, b) => b.partnerTotal - a.partnerTotal)
                      .map((p) => (
                        <TableRow
                          key={p.partnerId}
                          data-testid={`partner-row-${p.partnerId}`}
                        >
                          <TableCell className="font-medium">
                            {p.partnerName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {p.partnerType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {p.transactionCount}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatMoney(p.grossTotal)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatMoney(p.feeTotal)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-success">
                            {formatMoney(p.partnerTotal)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatMoney(p.companyTotal)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {formatMoney(p.pendingAmount)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-success">
                            {formatMoney(p.paidAmount)}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Agent Commission ── */}
        <TabsContent value="agent-commission" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard
              title="Total Earned"
              value={formatMoney(agentReport.totals.totalEarned)}
              icon={DollarSign}
            />
            <SummaryCard
              title="Direct Bonuses"
              value={formatMoney(agentReport.totals.totalDirect)}
              icon={DollarSign}
            />
            <SummaryCard
              title="Override Earnings"
              value={formatMoney(agentReport.totals.totalOverride)}
              icon={Users}
            />
            <SummaryCard
              title="Pending Payouts"
              value={formatMoney(agentReport.totals.totalPending)}
              icon={TrendingUp}
            />
          </div>

          <Card className="card-terminal">
            <CardContent className="pt-6">
              <Table data-testid="agent-commission-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Tier / Star</TableHead>
                    <TableHead className="text-right">Direct</TableHead>
                    <TableHead className="text-right">Star Slice</TableHead>
                    <TableHead className="text-right">Backfill</TableHead>
                    <TableHead className="text-right">Override</TableHead>
                    <TableHead className="text-right">Total Earned</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentReport.byAgent.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center text-muted-foreground py-8"
                      >
                        No agent commission data
                      </TableCell>
                    </TableRow>
                  ) : (
                    agentReport.byAgent.map((a) => (
                      <TableRow
                        key={a.agentId}
                        data-testid={`agent-row-${a.agentId}`}
                      >
                        <TableCell className="font-medium">
                          {a.agentName}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {a.tier}
                            </Badge>
                            <StarBadge level={a.starLevel} />
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatMoney(a.directTotal)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatMoney(a.starSliceTotal)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatMoney(a.backfillTotal)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatMoney(a.overrideTotal)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-success">
                          {formatMoney(a.totalEarned)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {formatMoney(a.pendingAmount)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-success">
                          {formatMoney(a.paidAmount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Client LTV ── */}
        <TabsContent value="client-ltv" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard
              title="Total LTV"
              value={formatMoney(ltvReport.totals.totalLTV)}
              icon={TrendingUp}
            />
            <SummaryCard
              title="Average LTV"
              value={formatMoneyDecimal(ltvReport.totals.avgLTV)}
              icon={TrendingUp}
            />
            <SummaryCard
              title="Total Deposited"
              value={formatMoney(ltvReport.totals.totalDeposited)}
              icon={DollarSign}
            />
            <SummaryCard
              title="Commission Cost"
              value={formatMoney(ltvReport.totals.totalCommissionCost)}
              icon={DollarSign}
            />
          </div>

          <Card className="card-terminal">
            <CardContent className="pt-6">
              <Table data-testid="client-ltv-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                    <TableHead className="text-right">Deposited</TableHead>
                    <TableHead className="text-right">Withdrawn</TableHead>
                    <TableHead className="text-right">Net Flow</TableHead>
                    <TableHead className="text-right">Comm. Cost</TableHead>
                    <TableHead className="text-right">LTV</TableHead>
                    <TableHead className="text-right">Monthly Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ltvReport.clients.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="text-center text-muted-foreground py-8"
                      >
                        No client LTV data
                      </TableCell>
                    </TableRow>
                  ) : (
                    ltvReport.clients.map((c) => (
                      <TableRow
                        key={c.clientId}
                        data-testid={`ltv-row-${c.clientId}`}
                      >
                        <TableCell className="font-medium">
                          {c.clientName}
                        </TableCell>
                        <TableCell>{c.agentName}</TableCell>
                        <TableCell>{c.partnerName ?? '-'}</TableCell>
                        <TableCell className="text-right font-mono">
                          {c.daysSinceCreated}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatMoney(c.totalDeposited)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatMoney(c.totalWithdrawn)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatMoney(c.netFlow)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatMoney(c.commissionCost)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right font-mono font-bold',
                            c.ltv >= 0 ? 'text-success' : 'text-destructive',
                          )}
                        >
                          {formatMoney(c.ltv)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right font-mono',
                            c.monthlyLTV >= 0
                              ? 'text-success'
                              : 'text-destructive',
                          )}
                        >
                          {formatMoneyDecimal(c.monthlyLTV)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
