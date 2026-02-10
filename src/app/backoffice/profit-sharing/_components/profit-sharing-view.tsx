'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Field, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import {
  PieChart,
  DollarSign,
  Receipt,
  TrendingUp,
  Plus,
  Pencil,
  ChevronDown,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  createProfitShareRule,
  deactivateRule,
  markProfitSharePaid,
  bulkMarkProfitSharePaid,
} from '@/app/actions/profit-sharing'

interface RuleDetail {
  partnerAmount: unknown
  companyAmount: unknown
  feeAmount: unknown
  status: string
}

interface RuleData {
  id: string
  partnerId: string
  partner: { id: string; name: string }
  name: string
  description: string | null
  splitType: string
  partnerPercent: unknown
  companyPercent: unknown
  fixedAmount: unknown
  appliesTo: string
  platformType: string | null
  minAmount: unknown
  maxAmount: unknown
  feePercent: unknown
  feeFixed: unknown
  status: string
  effectiveFrom: string | Date
  effectiveTo: string | Date | null
  priority: number
  createdAt: string | Date
  _count: { details: number }
  details: RuleDetail[]
}

interface PendingPayout {
  id: string
  partnerId: string
  partner: { name: string }
  rule: { name: string }
  grossAmount: unknown
  feeAmount: unknown
  partnerAmount: unknown
  companyAmount: unknown
  createdAt: string | Date
  status: string
}

interface PartnerOption {
  id: string
  name: string
}

interface TotalStats {
  _sum: {
    partnerAmount: unknown
    companyAmount: unknown
    feeAmount: unknown
    grossAmount: unknown
  }
  _count: number
}

interface ProfitSharingData {
  rules: RuleData[]
  pendingPayouts: PendingPayout[]
  totalStats: TotalStats
  partners: PartnerOption[]
}

const SPLIT_LABELS: Record<string, string> = {
  percentage: 'Percentage',
  fixed: 'Fixed',
  tiered: 'Tiered',
}

const APPLIES_LABELS: Record<string, string> = {
  all: 'All',
  deposits: 'Deposits',
  withdrawals: 'Withdrawals',
  commissions: 'Commissions',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-success/20 text-success',
  inactive: 'bg-muted text-muted-foreground',
  draft: 'bg-chart-4/20 text-chart-4',
}

function num(val: unknown): number {
  return Number(val ?? 0)
}

function formatMoney(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ProfitSharingView({ data }: { data: ProfitSharingData }) {
  const [isPending, startTransition] = useTransition()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set())
  const [selectedPayouts, setSelectedPayouts] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const activeRules = data.rules.filter((r) => r.status === 'active')
  const grossVolume = num(data.totalStats._sum.grossAmount)
  const totalFees = num(data.totalStats._sum.feeAmount)
  const totalPayouts = num(data.totalStats._sum.partnerAmount)

  const toggleRule = (id: string) => {
    setExpandedRules((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const togglePayout = (id: string) => {
    setSelectedPayouts((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllPayouts = () => {
    if (selectedPayouts.size === data.pendingPayouts.length) {
      setSelectedPayouts(new Set())
    } else {
      setSelectedPayouts(new Set(data.pendingPayouts.map((p) => p.id)))
    }
  }

  const handleMarkPaid = (detailId: string) => {
    startTransition(async () => {
      const result = await markProfitSharePaid(detailId)
      if (result.success) {
        toast({ title: 'Payout marked as paid' })
        setSelectedPayouts((prev) => {
          const next = new Set(prev)
          next.delete(detailId)
          return next
        })
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      }
    })
  }

  const handleBulkMarkPaid = () => {
    if (selectedPayouts.size === 0) return
    startTransition(async () => {
      const result = await bulkMarkProfitSharePaid([...selectedPayouts])
      if (result.success) {
        toast({ title: `${result.updated} payout(s) marked as paid` })
        setSelectedPayouts(new Set())
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      }
    })
  }

  const handleDeactivate = (ruleId: string) => {
    startTransition(async () => {
      const result = await deactivateRule(ruleId)
      if (result.success) {
        toast({ title: 'Rule deactivated' })
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      }
    })
  }

  const handleCreate = (formData: FormData) => {
    const splitType = formData.get('splitType') as string
    startTransition(async () => {
      const result = await createProfitShareRule({
        partnerId: formData.get('partnerId') as string,
        name: formData.get('name') as string,
        description: (formData.get('description') as string) || undefined,
        splitType,
        partnerPercent:
          splitType !== 'fixed'
            ? Number(formData.get('partnerPercent')) || undefined
            : undefined,
        companyPercent:
          splitType !== 'fixed'
            ? Number(formData.get('companyPercent')) || undefined
            : undefined,
        fixedAmount:
          splitType === 'fixed'
            ? Number(formData.get('fixedAmount')) || undefined
            : undefined,
        appliesTo: (formData.get('appliesTo') as string) || undefined,
        platformType: (formData.get('platformType') as string) || undefined,
        minAmount: Number(formData.get('minAmount')) || undefined,
        maxAmount: Number(formData.get('maxAmount')) || undefined,
        feePercent: Number(formData.get('feePercent')) || undefined,
        feeFixed: Number(formData.get('feeFixed')) || undefined,
        effectiveFrom: (formData.get('effectiveFrom') as string) || undefined,
        effectiveTo: (formData.get('effectiveTo') as string) || undefined,
        priority: Number(formData.get('priority')) || undefined,
      })
      if (result.success) {
        toast({ title: 'Rule created' })
        setShowAddDialog(false)
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* ── Summary Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="card-terminal" data-testid="active-rules-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Rules
            </CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {activeRules.length}
            </div>
          </CardContent>
        </Card>

        <Card className="card-terminal" data-testid="gross-volume-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gross Volume
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {formatMoney(grossVolume)}
            </div>
          </CardContent>
        </Card>

        <Card className="card-terminal" data-testid="total-fees-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Fees
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {formatMoney(totalFees)}
            </div>
          </CardContent>
        </Card>

        <Card className="card-terminal" data-testid="partner-payouts-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Partner Payouts
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-success">
              {formatMoney(totalPayouts)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Rules Header ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Rules</h2>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button data-testid="add-rule-btn" size="sm">
              <Plus className="mr-1 h-4 w-4" /> Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Profit Sharing Rule</DialogTitle>
            </DialogHeader>
            <RuleForm
              onSubmit={handleCreate}
              isPending={isPending}
              partners={data.partners}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Rules List ── */}
      {data.rules.length === 0 ? (
        <Card className="card-terminal">
          <CardContent className="py-8 text-center text-muted-foreground">
            No profit sharing rules yet. Click &ldquo;Add Rule&rdquo; to create
            one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.rules.map((rule) => {
            const rulePartnerTotal = rule.details.reduce(
              (s, d) => s + num(d.partnerAmount),
              0,
            )
            const ruleFeeTotal = rule.details.reduce(
              (s, d) => s + num(d.feeAmount),
              0,
            )
            return (
              <Collapsible
                key={rule.id}
                open={expandedRules.has(rule.id)}
                onOpenChange={() => toggleRule(rule.id)}
              >
                <Card
                  className="card-terminal"
                  data-testid={`rule-card-${rule.id}`}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">
                              {rule.name}
                            </CardTitle>
                            <Badge
                              className={
                                STATUS_COLORS[rule.status] ??
                                'bg-muted text-muted-foreground'
                              }
                            >
                              {rule.status}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {SPLIT_LABELS[rule.splitType] ?? rule.splitType}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {APPLIES_LABELS[rule.appliesTo] ?? rule.appliesTo}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Partner: {rule.partner.name}
                            {rule.splitType === 'percentage' && (
                              <>
                                {' '}
                                &middot; {num(rule.partnerPercent)}% /{' '}
                                {num(rule.companyPercent)}%
                              </>
                            )}
                            {rule.splitType === 'fixed' && (
                              <>
                                {' '}
                                &middot; Fixed: {formatMoney(num(rule.fixedAmount))}
                              </>
                            )}
                            {' '}&middot; Priority: {rule.priority}
                          </p>
                        </div>
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 transition-transform',
                            expandedRules.has(rule.id) && 'rotate-180',
                          )}
                        />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="space-y-3 pt-0">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">
                            Transactions:
                          </span>{' '}
                          <span className="font-mono">
                            {rule._count.details}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Partner Total:
                          </span>{' '}
                          <span className="font-mono text-success">
                            {formatMoney(rulePartnerTotal)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Fees:
                          </span>{' '}
                          <span className="font-mono">
                            {formatMoney(ruleFeeTotal)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Effective:
                          </span>{' '}
                          <span className="font-mono">
                            {formatDate(rule.effectiveFrom)}
                            {rule.effectiveTo
                              ? ` – ${formatDate(rule.effectiveTo)}`
                              : ' – ∞'}
                          </span>
                        </div>
                      </div>

                      {rule.description && (
                        <p className="text-xs text-muted-foreground">
                          {rule.description}
                        </p>
                      )}

                      {(rule.minAmount != null || rule.maxAmount != null || rule.platformType) && (
                        <div className="flex gap-3 text-xs">
                          {rule.minAmount != null && (
                            <span>
                              Min: {formatMoney(num(rule.minAmount))}
                            </span>
                          )}
                          {rule.maxAmount != null && (
                            <span>
                              Max: {formatMoney(num(rule.maxAmount))}
                            </span>
                          )}
                          {rule.platformType && (
                            <Badge variant="outline" className="text-xs">
                              {rule.platformType}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        {rule.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            disabled={isPending}
                            data-testid={`deactivate-rule-${rule.id}`}
                            onClick={() => handleDeactivate(rule.id)}
                          >
                            <XCircle className="mr-1 h-3 w-3" /> Deactivate
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )
          })}
        </div>
      )}

      {/* ── Pending Payouts ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Pending Payouts ({data.pendingPayouts.length})
        </h2>
        {selectedPayouts.size > 0 && (
          <Button
            size="sm"
            disabled={isPending}
            data-testid="bulk-mark-paid-btn"
            onClick={handleBulkMarkPaid}
          >
            <CheckCircle2 className="mr-1 h-4 w-4" /> Mark {selectedPayouts.size}{' '}
            Paid
          </Button>
        )}
      </div>

      {data.pendingPayouts.length === 0 ? (
        <Card className="card-terminal">
          <CardContent className="py-8 text-center text-muted-foreground">
            No pending payouts.
          </CardContent>
        </Card>
      ) : (
        <Card className="card-terminal">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={
                      selectedPayouts.size === data.pendingPayouts.length
                    }
                    onCheckedChange={toggleAllPayouts}
                    data-testid="select-all-payouts"
                  />
                </TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead className="text-right font-mono">Gross</TableHead>
                <TableHead className="text-right font-mono">Fee</TableHead>
                <TableHead className="text-right font-mono">
                  Partner Share
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[100px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.pendingPayouts.map((payout) => (
                <TableRow
                  key={payout.id}
                  data-testid={`payout-row-${payout.id}`}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedPayouts.has(payout.id)}
                      onCheckedChange={() => togglePayout(payout.id)}
                    />
                  </TableCell>
                  <TableCell className="text-sm">
                    {payout.partner.name}
                  </TableCell>
                  <TableCell className="text-sm">{payout.rule.name}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatMoney(num(payout.grossAmount))}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatMoney(num(payout.feeAmount))}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-success">
                    {formatMoney(num(payout.partnerAmount))}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(payout.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      disabled={isPending}
                      data-testid={`mark-paid-${payout.id}`}
                      onClick={() => handleMarkPaid(payout.id)}
                    >
                      Mark Paid
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

// ── Rule Form ──

function RuleForm({
  onSubmit,
  isPending,
  partners,
}: {
  onSubmit: (formData: FormData) => void
  isPending: boolean
  partners: PartnerOption[]
}) {
  const [splitType, setSplitType] = useState('percentage')

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor="partnerId">Partner *</FieldLabel>
          <Select name="partnerId" required>
            <SelectTrigger data-testid="rule-partner-select">
              <SelectValue placeholder="Select partner..." />
            </SelectTrigger>
            <SelectContent>
              {partners.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="name">Rule Name *</FieldLabel>
          <Input
            id="name"
            name="name"
            required
            data-testid="rule-name-input"
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <Textarea
          id="description"
          name="description"
          rows={2}
          data-testid="rule-description-input"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor="splitType">Split Type</FieldLabel>
          <Select
            name="splitType"
            defaultValue="percentage"
            onValueChange={setSplitType}
          >
            <SelectTrigger data-testid="rule-split-type-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="fixed">Fixed</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="appliesTo">Applies To</FieldLabel>
          <Select name="appliesTo" defaultValue="all">
            <SelectTrigger data-testid="rule-applies-to-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="deposits">Deposits</SelectItem>
              <SelectItem value="withdrawals">Withdrawals</SelectItem>
              <SelectItem value="commissions">Commissions</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {splitType === 'percentage' ? (
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="partnerPercent">Partner %</FieldLabel>
            <Input
              id="partnerPercent"
              name="partnerPercent"
              type="number"
              step="0.01"
              min="0"
              max="100"
              data-testid="rule-partner-percent-input"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="companyPercent">Company %</FieldLabel>
            <Input
              id="companyPercent"
              name="companyPercent"
              type="number"
              step="0.01"
              min="0"
              max="100"
              data-testid="rule-company-percent-input"
            />
          </Field>
        </div>
      ) : (
        <Field>
          <FieldLabel htmlFor="fixedAmount">Fixed Amount ($)</FieldLabel>
          <Input
            id="fixedAmount"
            name="fixedAmount"
            type="number"
            step="0.01"
            min="0"
            data-testid="rule-fixed-amount-input"
          />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor="minAmount">Min Amount ($)</FieldLabel>
          <Input
            id="minAmount"
            name="minAmount"
            type="number"
            step="0.01"
            min="0"
            data-testid="rule-min-amount-input"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="maxAmount">Max Amount ($)</FieldLabel>
          <Input
            id="maxAmount"
            name="maxAmount"
            type="number"
            step="0.01"
            min="0"
            data-testid="rule-max-amount-input"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor="feePercent">Fee %</FieldLabel>
          <Input
            id="feePercent"
            name="feePercent"
            type="number"
            step="0.01"
            min="0"
            max="100"
            data-testid="rule-fee-percent-input"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="feeFixed">Fee Fixed ($)</FieldLabel>
          <Input
            id="feeFixed"
            name="feeFixed"
            type="number"
            step="0.01"
            min="0"
            data-testid="rule-fee-fixed-input"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor="effectiveFrom">Effective From</FieldLabel>
          <Input
            id="effectiveFrom"
            name="effectiveFrom"
            type="date"
            data-testid="rule-effective-from-input"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="effectiveTo">Effective To</FieldLabel>
          <Input
            id="effectiveTo"
            name="effectiveTo"
            type="date"
            data-testid="rule-effective-to-input"
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="priority">Priority</FieldLabel>
        <Input
          id="priority"
          name="priority"
          type="number"
          defaultValue="0"
          data-testid="rule-priority-input"
        />
      </Field>

      <Button
        type="submit"
        disabled={isPending}
        data-testid="rule-submit-btn"
      >
        Create Rule
      </Button>
    </form>
  )
}
