'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  Users,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useToast } from '@/hooks/use-toast'
import type { AgentKPIs } from '@/backend/services/agent-kpis'

interface PerformancePanelProps {
  kpis: AgentKPIs
}

export function PerformancePanel({ kpis }: PerformancePanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()

  const avgConvert =
    kpis.avgDaysToConvert !== null ? `${kpis.avgDaysToConvert}` : '\u2014'
  const approvalRate = kpis.successRate
  const activeClients = kpis.inProgressClients

  const handleViewDetails = () => {
    toast({
      title: 'Coming Soon',
      description:
        'Detailed performance analytics will be available in a future update.',
    })
  }

  return (
    <Card className="card-terminal" data-testid="performance-panel">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-primary" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span>Performance Snapshot</span>
              </div>

              {/* Collapsed Preview */}
              {!isOpen && (
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Avg Convert:</span>
                    <span className="font-mono text-foreground">
                      {avgConvert} days
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Approval:</span>
                    <span className="font-mono text-success">
                      {approvalRate}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>Active:</span>
                    <span className="font-mono text-foreground">
                      {activeClients}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0">
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="mb-2 flex items-center justify-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-mono text-2xl font-bold">{avgConvert}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                    Avg Days to Convert
                  </p>
                </div>

                <div className="text-center">
                  <div className="mb-2 flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                  <p className="font-mono text-2xl font-bold text-success">
                    {approvalRate}%
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                    Approval Rate
                  </p>
                </div>

                <div className="text-center">
                  <div className="mb-2 flex items-center justify-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-mono text-2xl font-bold">
                    {activeClients}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                    Active Clients
                  </p>
                </div>
              </div>

              <div className="mt-4 flex justify-center border-t border-border/50 pt-4">
                <Button
                  variant="link"
                  className="text-primary"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleViewDetails()
                  }}
                  data-testid="view-detailed-performance"
                >
                  View Detailed Performance
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
