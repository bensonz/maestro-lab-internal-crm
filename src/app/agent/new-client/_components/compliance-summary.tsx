'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileCheck,
  User,
  Shield,
  Edit3,
} from 'lucide-react'

interface ComplianceSummaryProps {
  isIdVerified: boolean
  isAgeCompliant: boolean | null
  age: number | null
  manualOverridesCount: number
  hasCriminalRecord: string
  riskLevel: string
}

export function ComplianceSummary({
  isIdVerified,
  isAgeCompliant,
  age,
  manualOverridesCount,
  hasCriminalRecord,
  riskLevel,
}: ComplianceSummaryProps) {
  const getStatusIcon = (status: boolean | null) => {
    if (status === true) {
      return <CheckCircle2 className="h-4 w-4 text-chart-4" />
    }
    if (status === false) {
      return <XCircle className="h-4 w-4 text-destructive" />
    }
    return <AlertCircle className="h-4 w-4 text-amber-500" />
  }

  const getStatusBadge = (status: boolean | null, trueLabel: string, falseLabel: string) => {
    if (status === true) {
      return (
        <Badge
          variant="outline"
          className="border-chart-4/50 bg-chart-4/10 text-chart-4"
        >
          {trueLabel}
        </Badge>
      )
    }
    if (status === false) {
      return (
        <Badge
          variant="outline"
          className="border-destructive/50 bg-destructive/10 text-destructive"
        >
          {falseLabel}
        </Badge>
      )
    }
    return (
      <Badge
        variant="outline"
        className="border-amber-500/50 bg-amber-500/10 text-amber-500"
      >
        Pending
      </Badge>
    )
  }

  const getRiskBadge = () => {
    switch (riskLevel) {
      case 'low':
        return (
          <Badge
            variant="outline"
            className="border-chart-4/50 bg-chart-4/10 text-chart-4"
          >
            Low Risk
          </Badge>
        )
      case 'medium':
        return (
          <Badge
            variant="outline"
            className="border-amber-500/50 bg-amber-500/10 text-amber-500"
          >
            Medium Risk
          </Badge>
        )
      case 'high':
        return (
          <Badge
            variant="outline"
            className="border-destructive/50 bg-destructive/10 text-destructive"
          >
            High Risk
          </Badge>
        )
      default:
        return (
          <Badge
            variant="outline"
            className="border-muted-foreground/50 bg-muted/10 text-muted-foreground"
          >
            Not Assessed
          </Badge>
        )
    }
  }

  const getCriminalBadge = () => {
    switch (hasCriminalRecord) {
      case 'no':
        return (
          <Badge
            variant="outline"
            className="border-chart-4/50 bg-chart-4/10 text-chart-4"
          >
            Clear
          </Badge>
        )
      case 'yes':
        return (
          <Badge
            variant="outline"
            className="border-destructive/50 bg-destructive/10 text-destructive"
          >
            Record Found
          </Badge>
        )
      default:
        return (
          <Badge
            variant="outline"
            className="border-amber-500/50 bg-amber-500/10 text-amber-500"
          >
            Unknown
          </Badge>
        )
    }
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="font-display text-lg font-semibold text-foreground">
          Compliance Review Summary
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Overview of client compliance status
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ID Verification */}
        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-3">
          <div className="flex items-center gap-3">
            {getStatusIcon(isIdVerified)}
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                ID Verification
              </span>
            </div>
          </div>
          {getStatusBadge(isIdVerified, 'Verified', 'Not Verified')}
        </div>

        {/* Age Compliance */}
        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-3">
          <div className="flex items-center gap-3">
            {getStatusIcon(isAgeCompliant)}
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                Age Compliance {age !== null && `(${age} years)`}
              </span>
            </div>
          </div>
          {getStatusBadge(isAgeCompliant, '21+ Verified', 'Under 21')}
        </div>

        {/* Manual Overrides */}
        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-3">
          <div className="flex items-center gap-3">
            {manualOverridesCount > 0 ? (
              <AlertCircle className="h-4 w-4 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-chart-4" />
            )}
            <div className="flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                Manual Overrides
              </span>
            </div>
          </div>
          <Badge
            variant="outline"
            className={
              manualOverridesCount > 0
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-500'
                : 'border-muted-foreground/50 bg-muted/10 text-muted-foreground'
            }
          >
            {manualOverridesCount} override{manualOverridesCount !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Criminal Record */}
        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-3">
          <div className="flex items-center gap-3">
            {hasCriminalRecord === 'no' ? (
              <CheckCircle2 className="h-4 w-4 text-chart-4" />
            ) : hasCriminalRecord === 'yes' ? (
              <XCircle className="h-4 w-4 text-destructive" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-500" />
            )}
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                Criminal Record
              </span>
            </div>
          </div>
          {getCriminalBadge()}
        </div>

        {/* Risk Level */}
        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-3">
          <div className="flex items-center gap-3">
            {riskLevel === 'low' ? (
              <CheckCircle2 className="h-4 w-4 text-chart-4" />
            ) : riskLevel === 'high' ? (
              <XCircle className="h-4 w-4 text-destructive" />
            ) : riskLevel === 'medium' ? (
              <AlertCircle className="h-4 w-4 text-amber-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium text-foreground">
              Risk Assessment
            </span>
          </div>
          {getRiskBadge()}
        </div>
      </CardContent>
    </Card>
  )
}
