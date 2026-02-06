'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  ClipboardList,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Bell,
  Building2,
  Smartphone,
  FileCheck,
  Sparkles,
} from 'lucide-react'
import { IntakeStatus, PlatformType, PlatformStatus, ToDoType, ToDoStatus } from '@/types'
import { getPlatformName } from '@/lib/platforms'
import { PlatformUploadCard } from './platform-upload-card'
import { DeadlineCountdown } from '@/components/deadline-countdown'

type StepStatus = 'completed' | 'in_progress' | 'blocked' | 'pending'

interface Step {
  number: number
  title: string
  status: StepStatus
  date?: string
  hasPendingTodos?: boolean
  headerExtra?: React.ReactNode
  content?: React.ReactNode
}

interface ApplicationProgressProps {
  client: {
    intakeStatus: IntakeStatus
    deadline: Date | null
    createdAt: Date
    statusChangedAt: Date
    platforms: {
      platformType: PlatformType
      status: PlatformStatus
      username: string | null
      screenshots: string[]
    }[]
    toDos: {
      type: ToDoType
      status: ToDoStatus
    }[]
    phoneAssignment: {
      phoneNumber: string
      issuedAt: Date | null
    } | null
    questionnaire: Record<string, unknown>
  }
}

function getStepStatusBadge(status: StepStatus) {
  switch (status) {
    case 'completed':
      return (
        <Badge className="bg-chart-4/20 text-chart-4 rounded-md px-2 py-0.5 text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      )
    case 'in_progress':
      return (
        <Badge className="bg-primary/20 text-primary rounded-md px-2 py-0.5 text-xs">
          <Clock className="h-3 w-3 mr-1" />
          In Progress
        </Badge>
      )
    case 'blocked':
      return (
        <Badge className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs">
          <AlertCircle className="h-3 w-3 mr-1" />
          Blocked
        </Badge>
      )
    default:
      return (
        <Badge className="bg-muted/50 text-muted-foreground rounded-md px-2 py-0.5 text-xs">
          Pending
        </Badge>
      )
  }
}

function getStepIcon(number: number, status: StepStatus) {
  const baseClass = 'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold'
  const colorClass =
    status === 'completed'
      ? 'bg-chart-4 text-chart-4-foreground'
      : status === 'in_progress'
      ? 'bg-primary text-primary-foreground'
      : 'bg-muted text-muted-foreground'

  return <div className={`${baseClass} ${colorClass}`}>{number}</div>
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ' ' + new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function ApplicationProgress({ client }: ApplicationProgressProps) {
  const [openSteps, setOpenSteps] = useState<number[]>([2, 3]) // Default open steps 2 & 3

  const toggleStep = (stepNumber: number) => {
    setOpenSteps((prev) =>
      prev.includes(stepNumber)
        ? prev.filter((s) => s !== stepNumber)
        : [...prev, stepNumber]
    )
  }

  // Determine step statuses based on client state
  const getStepStatus = (step: number): StepStatus => {
    const statusOrder: IntakeStatus[] = [
      IntakeStatus.PENDING,
      IntakeStatus.PHONE_ISSUED,
      IntakeStatus.IN_EXECUTION,
      IntakeStatus.READY_FOR_APPROVAL,
      IntakeStatus.APPROVED,
    ]
    const currentIndex = statusOrder.indexOf(client.intakeStatus)

    if (step === 1) return currentIndex >= 0 ? 'completed' : 'pending'
    if (step === 2) return currentIndex >= 1 ? (currentIndex > 1 ? 'completed' : 'in_progress') : 'blocked'
    if (step === 3) return currentIndex >= 1 ? (currentIndex > 2 ? 'completed' : 'in_progress') : 'blocked'
    if (step === 4) return currentIndex >= 3 ? (currentIndex > 3 ? 'completed' : 'in_progress') : 'blocked'
    if (step === 5) return currentIndex >= 4 ? 'completed' : 'blocked'
    return 'pending'
  }

  // Check for pending todos in each step
  const hasPendingTodosForStep = (step: number): boolean => {
    const pendingTodos = client.toDos.filter(
      (t) => t.status === ToDoStatus.PENDING || t.status === ToDoStatus.IN_PROGRESS
    )
    if (step === 2) {
      return pendingTodos.some((t) => t.type === ToDoType.VERIFICATION)
    }
    if (step === 3) {
      return pendingTodos.some(
        (t) => t.type === ToDoType.UPLOAD_SCREENSHOT || t.type === ToDoType.EXECUTION
      )
    }
    return false
  }

  // Bank platforms
  const bankPlatform = client.platforms.find((p) => p.platformType === PlatformType.BANK)
  const paypalPlatform = client.platforms.find((p) => p.platformType === PlatformType.PAYPAL)
  const edgeboostPlatform = client.platforms.find((p) => p.platformType === PlatformType.EDGEBOOST)
  const sportsPlatforms = client.platforms.filter(
    (p) =>
      p.platformType !== PlatformType.BANK &&
      p.platformType !== PlatformType.PAYPAL &&
      p.platformType !== PlatformType.EDGEBOOST
  )

  const steps: Step[] = [
    {
      number: 1,
      title: 'Application Initiated',
      status: getStepStatus(1),
      date: formatDateTime(client.createdAt),
    },
    {
      number: 2,
      title: 'Bank Account Setup',
      status: getStepStatus(2),
      date: client.phoneAssignment?.issuedAt
        ? formatDateTime(client.phoneAssignment.issuedAt)
        : undefined,
      hasPendingTodos: hasPendingTodosForStep(2),
      content: (
        <div className="space-y-4 pl-10 pt-3">
          {/* Info Banner */}
          <div className="rounded-lg bg-primary/10 p-3 ring-1 ring-primary/20">
            <p className="text-xs text-primary">
              <span className="font-semibold">Client MUST</span> use company-issued phone and email
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Phone: {client.phoneAssignment?.phoneNumber || 'Not assigned'} • Email: sarah.j.0101@company-ops.com
            </p>
          </div>

          {/* Remind Client Section */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Remind client to bring:</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>SSN</li>
              <li>Proof of Address</li>
              <li>Valid ID</li>
            </ul>
          </div>

          {/* Bank Options */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Bank Options:</p>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">Chase</Badge>
              <Badge variant="outline" className="text-xs">Bank of America</Badge>
              <Badge variant="outline" className="text-xs">Citi</Badge>
            </div>
          </div>

          {/* Bank PIN & Online Banking */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/30 p-3 ring-1 ring-border/30">
              <p className="text-xs text-muted-foreground mb-1">Bank PIN (dbl-click to edit)</p>
              <p className="font-mono text-sm font-medium text-foreground">2580</p>
              <p className="text-xs text-muted-foreground mt-1">Suggested: 2580</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 ring-1 ring-border/30">
              <p className="text-xs text-muted-foreground mb-1">Online Banking (dbl-click to edit)</p>
              <p className="font-mono text-sm font-medium text-foreground">s_johnson_ops</p>
              <p className="text-xs text-muted-foreground mt-1">Auto-populated from To-Do uploads</p>
            </div>
          </div>

          {/* Completion Criteria */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Completion Criteria (via To-Dos):</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-chart-4" />
                Online banking username & password detected
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-chart-4" />
                Successful login screenshot uploaded
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                PIN confirmed as 2580 (or flagged override)
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      number: 3,
      title: 'Platform Setup',
      status: getStepStatus(3),
      date: getStepStatus(3) === 'in_progress' ? formatDateTime(new Date()) : undefined,
      hasPendingTodos: hasPendingTodosForStep(3),
      headerExtra: getStepStatus(3) === 'in_progress' && client.deadline ? (
        <DeadlineCountdown deadline={client.deadline} variant="badge" />
      ) : undefined,
      content: (
        <div className="space-y-4 pl-10 pt-3">
          {/* Financial Platforms */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Financial Platforms
            </p>
            <div className="space-y-2">
              {paypalPlatform && (
                <PlatformUploadCard
                  platformType={paypalPlatform.platformType}
                  status={paypalPlatform.status}
                  screenshots={paypalPlatform.screenshots}
                  username={paypalPlatform.username}
                />
              )}
              {edgeboostPlatform && (
                <PlatformUploadCard
                  platformType={edgeboostPlatform.platformType}
                  status={edgeboostPlatform.status}
                  screenshots={edgeboostPlatform.screenshots}
                  username={edgeboostPlatform.username}
                />
              )}
            </div>
          </div>

          {/* Sports Platforms */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Sports Platforms ({sportsPlatforms.length})
            </p>
            <div className="space-y-2">
              {sportsPlatforms.map((platform) => (
                <PlatformUploadCard
                  key={platform.platformType}
                  platformType={platform.platformType}
                  status={platform.status}
                  screenshots={platform.screenshots}
                  username={platform.username}
                />
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      number: 4,
      title: 'Contract & Approval',
      status: getStepStatus(4),
    },
    {
      number: 5,
      title: 'Active',
      status: getStepStatus(5),
    },
  ]

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-semibold">Application Progress</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step) => (
          <Collapsible
            key={step.number}
            open={openSteps.includes(step.number)}
            onOpenChange={() => step.content && toggleStep(step.number)}
          >
            <CollapsibleTrigger
              className={`flex w-full items-center justify-between rounded-lg p-3 text-left transition-all ${
                step.content
                  ? 'hover:bg-muted/30 cursor-pointer'
                  : 'cursor-default'
              } ${
                openSteps.includes(step.number) && step.content
                  ? 'bg-muted/20 ring-1 ring-border/30'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {getStepIcon(step.number, step.status)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      Step {step.number}: {step.title}
                    </span>
                    {step.hasPendingTodos && (
                      <Bell className="h-4 w-4 text-accent animate-pulse" />
                    )}
                    {step.headerExtra}
                  </div>
                  {step.date && (
                    <p className="text-xs text-muted-foreground">{step.date}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStepStatusBadge(step.status)}
                {step.content && (
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      openSteps.includes(step.number) ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </div>
            </CollapsibleTrigger>
            {step.content && (
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapse data-[state=open]:animate-expand">
                {step.content}
              </CollapsibleContent>
            )}
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  )
}
